# code to clean the csv files
# original files contain too many columns, we only want the Date, Open, High, Low, Close, and Volume columns
# the range of date we need is from 2016-10-03 to 2020-07-31

import pandas as pd
import os

# Define the directory containing the CSV files
csv_dir = "original"
target_dir = "clean_data/stock_data"

# Get all CSV files in the directory
csv_files = [f for f in os.listdir(csv_dir) if f.endswith('.csv')]

# Process each CSV file
for file in csv_files:
    # Read the CSV file
    df = pd.read_csv(os.path.join(csv_dir, file))
    
    # Filter the date range
    df = df[(df['Date'] >= '2016-10-03') & (df['Date'] <= '2020-07-31')]
    
    # Select the columns we want 
    df = df[['Date', 'Open', 'High', 'Low', 'Close', 'Volume']]

    # Save the cleaned CSV file
    df.to_csv(os.path.join(target_dir, file), index=False)

print("CSV files have been cleaned and saved to the target directory.")

