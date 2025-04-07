# cleans the twitter data
# we only want the date (not the time), the ticker, stock name, twit, and the score
# the range of date we need is from 2017-01-01 to 2020-07-31
# save the cleaned data to a csv file, individual files for each stock

'''
Original file has this structure:
Created_at,Tweet,Stock_Ticker,Company_Name,Sector,Score,Source,Consolidated_Company_Name,Consolidated_Ticker,GICS_Sub_Industry
2020-04-09 23:58:27+00:00,@Issaquahfunds Hedged our $MSFT position into close. Seemed to be getting lazy over this past week.,MSFT,Microsoft Corp.,Information Technology,-1.062239646911621,IEEE Dataset https://ieee-dataport.org/open-access/stock-market-tweets-data,Microsoft Corporation,MSFT,Systems Software
2020-04-09 23:57:27+00:00,Pfizer Shares Acquired by Ipswich Investment Management $PFE https://t.co/gqXxIbbxIS,PFE,Pfizer Inc.,Health Care,0.3414766192436218,IEEE Dataset https://ieee-dataport.org/open-access/stock-market-tweets-data,Pfizer Inc.,PFE,Pharmaceuticals
2020-04-09 23:56:58+00:00,"RT @TDANetwork: 📽️ #TheWatchList panel assesses the big questions $AAPL will face over the next 6 months. 🍎📱
'''

# We want to have columns: Created_at(renamed to Date), Tweet, Stock_Ticker(renamed to Ticker), Score
# save the cleaned data to a csv file, individual files for each stock

# drop the time from the Created_at column
import pandas as pd
import os
import re

# Define the directory containing the CSV files
csv_dir = "original/complete_labelled_dataset.csv"
target_dir = "clean_data/twit_data"

# Read the CSV file
df = pd.read_csv(csv_dir)

# drop the time from the Created_at column
df['Date'] = pd.to_datetime(df['Created_at']).dt.date

# select the columns we want
df = df[['Date', 'Tweet', 'Stock_Ticker', 'Score']]

# rename the columns
df = df.rename(columns={'Stock_Ticker': 'Ticker'})  

# save the cleaned data to a csv file, individual files for each stock
# rename the ticker for the following stocks:
# FB -> META
# GOOG -> GOOGL

# consolidated company name and ticker is the column in the original file
# that has the full name of the company and the ticker
df.loc[df['Ticker'] == 'FB', 'Ticker'] = 'META'
df.loc[df['Ticker'] == 'GOOG', 'Ticker'] = 'GOOGL'

# remove VZ from the dataframe
df = df[df['Ticker'] != 'VZ']

# use regex to remove unneeded text from the tweet column and save as a new column with space as the separator
COMMON_WORDS = {
    # common words
    'the', 'and', 'for', 'this', 'that', 'with', 'have', 'from', 'your', 'https', 'http', 
    'www', 'com', 'co', 'org', 'net', 'io', 'ly', 'ly/', 'they', 'we', 'to', 'in', 'on', 
    'at', 'by', 'of', 'up', 'down', 'left', 'right', 'out', 'over', 'under', 'again', 
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 
    'any', 'some', 
    
    # numbers
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    
    # Stock market common terms
    'stock', 'stocks', 'market', 'markets', 'price', 'prices', 'trade', 'trades',
    'trading', 'trader', 'traders', 'investor', 'investors', 'investing', 'investment',
    'share', 'shares', 'shareholder', 'shareholders',
    
    # Time-related terms
    'today', 'yesterday', 'tomorrow', 'week', 'month', 'year', 'daily', 'weekly', 'monthly',
    'quarterly', 'annual', 'annually', 'day', 'morning', 'afternoon', 'evening', 'night',
    
    # Common verbs and pronouns not caught in the original list
    'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'its', 'their',
    'been', 'has', 'had', 'get', 'got', 'getting', 'goes', 'going', 'went', 'gone',
    'just', 'more', 'most', 'other', 'others', 'else', 'much', 'many', 'such',
    
    # Twitter/social media specific
    'tweet', 'tweets', 'twitter', 'rt', 'follow', 'following', 'follower', 'followers',
    'post', 'posts', 'posting', 'posted', 'user', 'users', 'account', 'accounts',
    
    # Short/common words
    'am', 'pm', 'vs', 'via', 'per', 'new', 'now', 'next', 'last', 'ago',
    'yet', 'still', 'ever', 'even', 'also', 'too', 'very', 'quite', 'like', 'said'
    }

# also remove the tickers and stock names from the tweet column in lowercase and shortened names
STOCK_TICKERS = {"CSCO", "BA", "V", "T", "BAC", "F", "PEP", "COST", "MRK", "ORCL", "SBUX", "PG", "MCD", "AMZN", "INTC", "KO", "PYPL", "UPS", "MSFT", "AMD", "HD", "XOM", "CVX", "CMCSA", "NKE", "KR", "IBM", "DIS", "NFLX", "JPM", "TSLA", "SPY", "GOOGL", "META", "PFE", "UNH", "MA", "AAPL", "WMT", "JNJ"}
STOCK_TICKERS_LOWER = {ticker.lower() for ticker in STOCK_TICKERS}
STOCK_TICKERS_SHORT = {"cisco", "boeing", "visa", "att", "bofa", "ford", "pepsi", "costco", "merck", "oracle", "starbucks", "pg", "mcdonalds", "amazon", "intel", "coke", "paypal", "ups", "microsoft", "amd", "homedepot", "exxon", "chevron", "comcast", "nike", "kroger", "ibm", "disney", "netflix", "jpmorgan", "tesla", "sp500", "google", "meta", "pfizer", "united", "mastercard", "apple", "walmart", "johnson"}

def clean_tweet(tweet):
    words = re.findall(r'\b[a-zA-Z]{4,}\b', tweet.lower())
    return " ".join([word for word in words if word not in COMMON_WORDS and word not in STOCK_TICKERS_LOWER and word not in STOCK_TICKERS_SHORT])

df['Tweet'] = df['Tweet'].apply(clean_tweet)

# save the cleaned data to a csv file, individual files for each stock
for stock in df['Ticker'].unique():
    df_stock = df[df['Ticker'] == stock]
    df_stock.to_csv(os.path.join(target_dir, f"{stock}.csv"), index=False)
    print(f"Saved {stock}.csv")

print("CSV files have been cleaned and saved to the target directory.")