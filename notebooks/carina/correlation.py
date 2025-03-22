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
    # Ensure 'Date' is in datetime format
    df['Date'] = pd.to_datetime(df['Date'])
    
    # Filter data by date range
    df = df[(df['Date'] >= start_date) & (df['Date'] <= end_date)]




    # Check if both stock symbols exist in the data
    all_symbols = set(df['Symbol'])
    missing_symbols = [symbol for symbol in [stock1, stock2] if symbol not in all_symbols]
    
    if missing_symbols:
        return {
            'Stock 1': stock1,
            'Stock 2': stock2,
            'Correlation': None,
            'Missing Symbols': missing_symbols
        }


    
    # Check if symbols exist in the data
    if not set([stock1, stock2]).issubset(set(df['Symbol'])):
        return {'Not Available Stock 1': stock1, 'Not Available Stock 2': stock2, 'Correlation': None}
    
    # Filter for the specified stocks
    filtered_df = df[df['Symbol'].isin([stock1, stock2])]
    
    
    

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
