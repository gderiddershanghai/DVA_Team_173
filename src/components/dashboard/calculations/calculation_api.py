# this file calculates the performance, correlation, and sentiment of a stock with a given date range
# it uses the stock data, twit data and use FastAPI to interact with the javascript frontend
# the frontend will send the stock ticker, start date, and end date
# the backend will calculate the performance, correlation, and sentiment of the stock

# the frontend will send the following data:
# {
#     "stock_ticker": xx,
#     "start_date": xx,
#     "end_date": xx,
# }

# the backend will return the results to the frontend with the following format:
# {
#     "performance": {
#         "alpha": xx,
#         "alpha_rank": xx,
#         "market_alpha": xx,
#         "beta": xx,
#         "beta_rank": xx,
#         "market_beta": xx,
#         "sharpe_ratio": xx,
#         "sharpe_ratio_rank": xx,
#         "market_sharpe_ratio": xx,
#         "treynor_ratio": xx,
#         "treynor_ratio_rank": xx,
#         "market_treynor_ratio": xx,
#     },
#     "correlation": {
#         "most_correlated_stock": xx,
#         "most_correlated_stock_correlation": xx,
#         "least_correlated_stock": xx,
#         "least_correlated_stock_correlation": xx,
#     },
#     "sentiment": {
#         "keywords" : {
#             "keyword1": {
#                 "sentiment_score": xx,
#                 "count": xx,
#                 "keyword2": xx, number of times keyword 1 appears with keyword 2 in the tweets
#                 "keyword3": xx, number of times keyword 1 appears with keyword 3 in the tweets
#                 ...
#             },
#             "keyword2": {
#                 "sentiment_score": xx,    
#                 "count": xx,
#                 "keyword1": xx, number of times keyword 2 appears with keyword 1 in the tweets
#                 "keyword3": xx, number of times keyword 2 appears with keyword 3 in the tweets
#                 ...
#             },
#             ...
#         }
#     }
# }

# stock data is saved in the following path with individual csv files for each stock with the ticker as the name
# the csv file contains the following columns:
# Date, Open, High, Low, Close, Volume
STOCK_DATA_PATH = "clean_data/stock_data"

# twitter data is saved in the following path with individual csv files for each stock with the ticker as the name
# twit data to be used for sentiment analysis
# the csv file contains the following columns:
# Date, Tweet, Ticker, Score
# the tweet column is already cleaned to remove unneeded text and has space as the separator
TWITTER_DATA_PATH = "clean_data/twit_data"

STOCK_TICKERS = ["CSCO", "BA", "V", "T", "BAC", "F", "PEP", "COST", "MRK", "ORCL", "SBUX", "PG", "MCD", "AMZN", "INTC", "KO", "PYPL", "UPS", "MSFT", "AMD", "HD", "XOM", "CVX", "CMCSA", "NKE", "KR", "IBM", "DIS", "NFLX", "JPM", "TSLA", "SPY", "GOOGL", "META", "PFE", "UNH", "MA", "AAPL", "WMT", "JNJ"]

# the performance metrics will be calculated with using SPY as the benchmark
# when a data is received, all metrics will be calculated for all the stocks in the STOCK_TICKERS list and get the rank accoring to the results
# risk_free_rate is 0.02 per year
RISK_FREE_RATE = 0.02

# the sentiment analysis will be done by repeating the following steps:
# 1. get the tweets for the given stock and date range
# 2. make a dictionary of the keywords that appear in the tweets
# 3. for each tweet and its sentiment score, add the sentiment score to the dictionary for each keyword from the given tweet to the previous sentiment score
# 4. export the dictionary to the given format for the top 10 keywords by count

import os
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import re
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StockRequest(BaseModel):
    stock_ticker: str
    start_date: str
    end_date: str

def load_stock_data(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    file_path = os.path.join(STOCK_DATA_PATH, f"{ticker}.csv")
    try:
        df = pd.read_csv(file_path)
        df['Date'] = pd.to_datetime(df['Date'], utc=True)
        # Convert string dates to datetime
        start_date_dt = pd.to_datetime(start_date, utc=True)
        end_date_dt = pd.to_datetime(end_date, utc=True)
        # Filter by date range
        df = df[(df['Date'] >= start_date_dt) & (df['Date'] <= end_date_dt)]
        return df
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Stock data for {ticker} not found")

def load_twitter_data(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    file_path = os.path.join(TWITTER_DATA_PATH, f"{ticker}.csv")
    try:
        df = pd.read_csv(file_path)
        df['Date'] = pd.to_datetime(df['Date'], utc=True)
        # Convert string dates to datetime
        start_date_dt = pd.to_datetime(start_date, utc=True)
        end_date_dt = pd.to_datetime(end_date, utc=True)
        # Filter by date range
        df = df[(df['Date'] >= start_date_dt) & (df['Date'] <= end_date_dt)]
        return df
    except FileNotFoundError:
        # Return empty DataFrame if no Twitter data exists
        return pd.DataFrame(columns=['Date', 'Tweet', 'Ticker', 'Score'])

def calculate_returns(stock_data: pd.DataFrame) -> float:
    # Calculate total return over the period
    first_price = stock_data['Close'].iloc[0]
    last_price = stock_data['Close'].iloc[-1]
    total_return = (last_price / first_price) - 1
    return total_return

def calculate_performance_metrics(stock_return: float, market_return: float, stock_data: pd.DataFrame, market_data: pd.DataFrame) -> dict:
    # Convert annual risk-free rate to the period return
    # Assuming 252 trading days in a year
    
    # Calculate period length in trading days
    period_days = len(stock_data)
    if period_days < 1:
        period_days = 1  # Default to 1 if no data available
    
    # Calculate the period's risk-free rate
    period_risk_free_rate = RISK_FREE_RATE * (period_days / 252)
    
    # Calculate excess returns for the period
    excess_stock_return = stock_return - period_risk_free_rate
    excess_market_return = market_return - period_risk_free_rate
    
    # Since we have daily data, we can calculate beta properly using the daily returns
    # Calculate daily returns for beta calculation
    daily_stock_returns = stock_data['Close'].pct_change().dropna().values
    daily_market_returns = market_data['Close'].pct_change().dropna().values
    
    # Ensure arrays are the same length
    min_length = min(len(daily_stock_returns), len(daily_market_returns))
    if min_length > 1:
        beta = np.cov(daily_stock_returns[:min_length], daily_market_returns[:min_length])[0, 1] / np.var(daily_market_returns[:min_length])
    else:
        beta = 1.0  # Default value
    
    # Alpha: stock return - (risk-free rate + beta * (market return - risk-free rate))
    alpha = stock_return - (period_risk_free_rate + beta * (market_return - period_risk_free_rate))
    
    # Calculate Sharpe ratio using the period return and annualized volatility
    # For more accurate Sharpe, we use daily returns to estimate volatility
    if min_length > 1:
        # Annualize the volatility
        daily_volatility = np.std(daily_stock_returns)
        annualized_volatility = daily_volatility * np.sqrt(252)
        sharpe_ratio = excess_stock_return / annualized_volatility if annualized_volatility != 0 else 0
    else:
        sharpe_ratio = excess_stock_return / period_risk_free_rate if period_risk_free_rate != 0 else 0
    
    # Calculate Treynor ratio
    treynor_ratio = excess_stock_return / beta if beta != 0 else 0
    
    return {
        "alpha": float(alpha),
        "beta": float(beta),
        "sharpe_ratio": float(sharpe_ratio),
        "treynor_ratio": float(treynor_ratio)
    }

def calculate_correlation(request_ticker: str, stock_return: float, all_stock_returns: Dict[str, float]) -> dict:
    # For period returns calculation, we'll use the total return values to determine similarity
    
    # Find most and least correlated stocks based on similarity of total returns
    if len(all_stock_returns) <= 1:
        return {
            "most_correlated_stock": "None",
            "most_correlated_stock_correlation": 0,
            "least_correlated_stock": "None",
            "least_correlated_stock_correlation": 0
        }
    
    # Create dictionary of stock ticker to difference from target stock return
    # Exclude the requested stock itself using the passed request_ticker
    differences = {ticker: abs(ret - stock_return) 
                   for ticker, ret in all_stock_returns.items() 
                   if ticker != request_ticker}
    
    if not differences:
        return {
            "most_correlated_stock": "None",
            "most_correlated_stock_correlation": 0,
            "least_correlated_stock": "None",
            "least_correlated_stock_correlation": 0
        }
    
    # Find most similar (smallest difference) and least similar (largest difference)
    most_similar_ticker = min(differences.items(), key=lambda x: x[1])[0]
    least_similar_ticker = max(differences.items(), key=lambda x: x[1])[0]
    
    # Convert differences to correlation-like values between -1 and 1
    # The smaller the difference, the closer to 1
    # The larger the difference, the closer to -1
    max_diff = max(differences.values())
    
    # Calculate "correlation" values
    if max_diff > 0:
        most_corr_value = 1.0 - (differences[most_similar_ticker] / max_diff)
        least_corr_value = 1.0 - (differences[least_similar_ticker] / max_diff)
        # Make sure least correlation is negative
        least_corr_value = -abs(least_corr_value)
    else:
        most_corr_value = 1.0
        least_corr_value = -1.0
    
    return {
        "most_correlated_stock": most_similar_ticker,
        "most_correlated_stock_correlation": float(most_corr_value),
        "least_correlated_stock": least_similar_ticker,
        "least_correlated_stock_correlation": float(least_corr_value)
    }

def extract_keywords(tweet: str) -> List[str]:
    # Tweet column already contains cleaned keywords separated by spaces
    # Ensure the tweet is a string before splitting
    if not isinstance(tweet, str):
        tweet = str(tweet)
    return tweet.split()

# def analyze_sentiment(twitter_data: pd.DataFrame) -> dict:
#     if twitter_data.empty:
#         return {"keywords": {}}
    
#     # Initialize data structures
#     keyword_data = defaultdict(lambda: {"sentiment_score": 0, "count": 0})  # Track sentiment and count for each keyword
#     keyword_tweets = defaultdict(set)  # Using sets instead of lists for faster intersection operations
    
#     # First pass: Process each tweet to extract keywords and track their tweets
#     for idx, row in twitter_data.iterrows():
#         tweet = row['Tweet']
#         score = row['Score']
        
#         # Extract keywords
#         keywords = extract_keywords(tweet)
        
#         # Update keyword data and track which tweet index the keyword appears in
#         for keyword in keywords:
#             keyword_data[keyword]["sentiment_score"] += score
#             keyword_data[keyword]["count"] += 1
#             keyword_tweets[keyword].add(idx)
    
#     # Sort keywords by count and take top 8
#     top_keywords = sorted(keyword_data.items(), key=lambda x: x[1]["count"], reverse=True)[:8]
#     top_keyword_names = [k for k, _ in top_keywords]
    
#     # Prepare final format with precalculated average sentiment
#     result = {"keywords": {}}
    
#     # Calculate average sentiment and add base data for each top keyword
#     for keyword, data in top_keywords:
#         avg_sentiment = data["sentiment_score"] / data["count"] if data["count"] > 0 else 0
#         result["keywords"][keyword] = {
#             "sentiment_score": float(avg_sentiment),
#             "count": data["count"]
#         }
    
#     # Precompute co-occurrences matrix for top keywords only - much more efficient
#     # Create a dictionary to store precomputed intersections
#     co_occurrences = {}
    
#     # For each pair of top keywords, calculate intersection once
#     for i, keyword1 in enumerate(top_keyword_names):
#         for keyword2 in top_keyword_names[i+1:]:  # Only compute each pair once
#             # Find intersection of tweet indices
#             common_count = len(keyword_tweets[keyword1] & keyword_tweets[keyword2])
#             if common_count > 0:
#                 co_occurrences[(keyword1, keyword2)] = common_count
#                 co_occurrences[(keyword2, keyword1)] = common_count  # Store both directions
    
#     # Add co-occurrence data to result
#     for keyword in top_keyword_names:
#         for other_keyword in top_keyword_names:
#             if keyword != other_keyword:
#                 count = co_occurrences.get((keyword, other_keyword), 0)
#                 if count > 0:
#                     result["keywords"][keyword][other_keyword] = count
    
#     return result

# TODO: add sentiment analysis function

@app.post("/api/get_sentiment_data")
# async def get_sentiment_data(request: StockRequest):
#     try:
#         twitter_data = load_twitter_data(request.stock_ticker, request.start_date, request.end_date)
#         sentiment_data = analyze_sentiment(twitter_data)
#         return sentiment_data
#     except Exception as e:

@app.post("/api/get_stock_data")

@app.post("/api/calculate")
async def calculate(request: StockRequest):
    try:
        # Load data
        stock_data = load_stock_data(request.stock_ticker, request.start_date, request.end_date)
        market_data = load_stock_data("SPY", request.start_date, request.end_date)
        twitter_data = load_twitter_data(request.stock_ticker, request.start_date, request.end_date)
        
        # Calculate total returns over the period
        stock_return = calculate_returns(stock_data)
        market_return = calculate_returns(market_data)
        
        # Calculate performance metrics for the requested stock
        performance_metrics = calculate_performance_metrics(stock_return, market_return, stock_data, market_data)
        
        # Calculate performance metrics for all stocks to determine ranks
        all_metrics = {}
        all_returns = {}
        
        for ticker in STOCK_TICKERS:
            # Skip the requested stock - we already calculated its metrics
            if ticker == request.stock_ticker:
                continue
                
            try:
                ticker_data = load_stock_data(ticker, request.start_date, request.end_date)
                ticker_return = calculate_returns(ticker_data)
                all_returns[ticker] = ticker_return
                
                metrics = calculate_performance_metrics(ticker_return, market_return, ticker_data, market_data)
                all_metrics[ticker] = metrics
            except Exception:
                # Skip stocks with missing data
                continue
        
        # Calculate ranks
        # Include the requested stock in the metrics for ranking
        combined_metrics = all_metrics.copy()
        combined_metrics[request.stock_ticker] = performance_metrics
        
        alphas = {ticker: metrics["alpha"] for ticker, metrics in combined_metrics.items()}
        betas = {ticker: metrics["beta"] for ticker, metrics in combined_metrics.items()}
        sharpe_ratios = {ticker: metrics["sharpe_ratio"] for ticker, metrics in combined_metrics.items()}
        treynor_ratios = {ticker: metrics["treynor_ratio"] for ticker, metrics in combined_metrics.items()}
        market_alpha = 0
        market_beta = 1
        market_sharpe_ratio = combined_metrics.get("SPY", {"sharpe_ratio": 0})["sharpe_ratio"]
        market_treynor_ratio = combined_metrics.get("SPY", {"treynor_ratio": 0})["treynor_ratio"]

        alpha_rank = sorted(alphas.keys(), key=lambda x: alphas[x], reverse=True).index(request.stock_ticker) + 1 if request.stock_ticker in alphas else 0
        beta_rank = sorted(betas.keys(), key=lambda x: betas[x], reverse=True).index(request.stock_ticker) + 1 if request.stock_ticker in betas else 0
        sharpe_rank = sorted(sharpe_ratios.keys(), key=lambda x: sharpe_ratios[x], reverse=True).index(request.stock_ticker) + 1 if request.stock_ticker in sharpe_ratios else 0
        treynor_rank = sorted(treynor_ratios.keys(), key=lambda x: treynor_ratios[x], reverse=True).index(request.stock_ticker) + 1 if request.stock_ticker in treynor_ratios else 0
        
        # Calculate correlation
        # Make a copy and add the current stock to ensure we have all correlations
        correlation_returns = all_returns.copy()
        correlation_returns[request.stock_ticker] = stock_return
        correlation_data = calculate_correlation(request.stock_ticker, stock_return, correlation_returns)
        
        # Analyze sentiment
        sentiment_data = analyze_sentiment(twitter_data)
        
        # Format response
        response = {
            "performance": {
                "alpha": performance_metrics["alpha"],
                "alpha_rank": alpha_rank,
                "market_alpha": market_alpha,
                "beta": performance_metrics["beta"],
                "beta_rank": beta_rank,
                "market_beta": market_beta,
                "sharpe_ratio": performance_metrics["sharpe_ratio"],
                "sharpe_ratio_rank": sharpe_rank,
                "market_sharpe_ratio": market_sharpe_ratio,
                "treynor_ratio": performance_metrics["treynor_ratio"],
                "treynor_ratio_rank": treynor_rank,
                "market_treynor_ratio": market_treynor_ratio
            },
            "correlation": correlation_data,
            "sentiment": sentiment_data
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)