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
    
    # Check if the date range is valid
    dataset_start_date = df['Date'].min()
    dataset_end_date = df['Date'].max()
    
    if start_date < dataset_start_date or end_date > dataset_end_date:
        return {
            'message': f"Invalid date range. The dataset date range is from {dataset_start_date} to {dataset_end_date}."
        }
    
    # Filter data by date range
    df = df[(df['Date'] >= start_date) & (df['Date'] <= end_date)]
    
    # msg to infor m the user that the date range is valid
    # return {
    #     'message': "Date range is valid. Proceeding with correlation computation."
    # }
    
    

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
    
    # Pivot the data
    if filtered_df.empty:
        return {'Empty DF Stock 1': stock1, 'Empty DF Stock 2': stock2, 'Correlation': None}
    
    data_pivoted = filtered_df.pivot(index='Date', columns='Symbol', values='Close')
    
    # Calculate PEARSON correlation
    if stock1 in data_pivoted.columns and stock2 in data_pivoted.columns:
        correlation = data_pivoted[stock1].corr(data_pivoted[stock2])
        return {'Stock 1': stock1, 'Stock 2': stock2, 'Correlation': round(correlation, 2)}
    else:
        return {'Stock 1': stock1, 'Stock 2': stock2, 'Correlation': None}
    
    
    ########## Visualize Correlation Heatmap
    # takes in json correlation result from above and plots a heatmap.
def plot_correlation_heatmap(correlations):
    # Convert correlations list to DataFrame
    df_corr = pd.DataFrame(correlations)
    
    # Ensure pivot table is valid
    try:
        heatmap_data = df_corr.pivot('Stock 1', 'Stock 2', 'Correlation')
    except Exception as e:
        raise ValueError(f"Error creating heatmap pivot table: {e}")
    
    # Plot the heatmap
    fig = px.imshow(heatmap_data, color_continuous_scale='RdBu_r', title='Stock Correlation Heatmap')
    fig.update_layout(title_x=0.5)  # Center the title
    fig.show()


# Example Usage
if __name__ == "__main__":
    # Replace with actual path
    filepath = "/kaggle/input/sp-500-stocks/sp500_stocks.csv"  
    df = load_stock_data(filepath)
    
    # Compute correlation for a specific stock pair within a date range
    stock1, stock2 = "AAPL", "MSFT"  
    start_date, end_date = '2022-01-01', '2023-01-01'  
    
    
    correlation_result = compute_correlation_for_pair(df, stock1, stock2, start_date, end_date)
    
    # Save JSON Output
    with open('correlation_pair.json', 'w') as f:
        json.dump(correlation_result, f, indent=4)
    
    print(correlation_result)
