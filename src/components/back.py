from fastapi import FastAPI
import pandas as pd
import numpy as np

app = FastAPI()

# Load stock and market data (assuming CSV files exist)
def load_data():
    stock_data = pd.read_csv("stocks.csv")
    market_data = pd.read_csv("market.csv")
    return stock_data, market_data

# Function to calculate daily returns
def calculate_returns(prices):
    return prices.pct_change().dropna()

# Function to compute Beta
def calculate_beta(stock_data, market_data):
    stock_returns = calculate_returns(stock_data["Close"])
    market_returns = calculate_returns(market_data["Close"])
    
    covariance = np.cov(stock_returns, market_returns)[0, 1]
    variance = np.var(market_returns)

    beta = covariance / variance
    return round(beta, 4)

# Function to compute Alpha (assuming risk-free rate is 2%)
def calculate_alpha(stock_data, market_data, beta, risk_free_rate=0.02):
    stock_returns = calculate_returns(stock_data["Close"]).mean()
    market_returns = calculate_returns(market_data["Close"]).mean()
    
    alpha = stock_returns - (risk_free_rate + beta * (market_returns - risk_free_rate))
    return round(alpha, 4)

# Function to compute Sharpe Ratio
def calculate_sharpe_ratio(stock_data, risk_free_rate=0.02):
    stock_returns = calculate_returns(stock_data["Close"])
    excess_returns = stock_returns.mean() - risk_free_rate
    std_dev = stock_returns.std()
    
    sharpe_ratio = excess_returns / std_dev if std_dev > 0 else None
    return round(sharpe_ratio, 4) if sharpe_ratio else None

# Function to compute Treynor Ratio
def calculate_treynor_ratio(stock_data, beta, risk_free_rate=0.02):
    stock_returns = calculate_returns(stock_data["Close"]).mean()
    treynor_ratio = (stock_returns - risk_free_rate) / beta if beta > 0 else None
    return round(treynor_ratio, 4) if treynor_ratio else None

# API Endpoint to return all calculations
@app.get("/metrics")
def get_metrics():
    stock_data, market_data = load_data()
    beta = calculate_beta(stock_data, market_data)
    alpha = calculate_alpha(stock_data, market_data, beta)
    sharpe_ratio = calculate_sharpe_ratio(stock_data)
    treynor_ratio = calculate_treynor_ratio(stock_data, beta)

    return {
        "beta": beta,
        "alpha": alpha,
        "sharpe_ratio": sharpe_ratio,
        "treynor_ratio": treynor_ratio
    }

# Run using `uvicorn server:app --reload`


