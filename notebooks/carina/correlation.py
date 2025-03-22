import pandas as pd
import numpy as np
import json
import multiprocessing as mp
import plotly.express as px

# Load Data
def load_stock_data(filepath):
    df = pd.read_csv(filepath, parse_dates=['Date'])
    df.dropna(inplace=True)
    return df

# Compute Correlation for a Specific Pair of Stocks within a Date Range
def compute_correlation_for_pair(df, stock1, stock2, start_date, end_date):
    df = df[(df['Date'] >= start_date) & (df['Date'] <= end_date)]
    filtered_df = df[df['Stock Ticker'].isin([stock1, stock2])]
    data_pivoted = filtered_df.pivot(index='Date', columns='Stock Ticker', values='Close Price')
    
    if stock1 in data_pivoted.columns and stock2 in data_pivoted.columns:
        correlation = data_pivoted[stock1].corr(data_pivoted[stock2])
        return {'Stock 1': stock1, 'Stock 2': stock2, 'Correlation': round(correlation, 1)}
    else:
        return {'Stock 1': stock1, 'Stock 2': stock2, 'Correlation': None}

# Example Usage
if __name__ == "__main__":
    # Replace with actual path
    filepath = "stocks.csv"  
    df = load_stock_data(filepath)
    
    # Compute correlation for a specific stock pair within a date range
    stock1, stock2 = "AAPL", "MSFT"  
    start_date, end_date = '2022-01-01', '2023-01-01'  
    
    
    correlation_result = compute_correlation_for_pair(df, stock1, stock2, start_date, end_date)
    
    # Save JSON Output
    with open('correlation_pair.json', 'w') as f:
        json.dump(correlation_result, f, indent=4)
    
    print(correlation_result)
