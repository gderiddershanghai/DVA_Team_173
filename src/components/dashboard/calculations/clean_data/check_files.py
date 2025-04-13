# this file checks if the stock data and twitter data has the same stocks by comparing the filenames except for the SPY.csv file in stock_data


import os

# get all the stock data
stock_data_dir = "clean_data/stock_data"
stock_files = os.listdir(stock_data_dir)

# get all the twitter data
twitter_data_dir = "clean_data/twit_data"
twitter_files = os.listdir(twitter_data_dir)    

# check if the stock data and twitter data has the same stocks
print("Stock data:")
for stock in stock_files:
    if stock != "SPY.csv":
        if stock not in twitter_files:
            print(stock)

print("Twitter data:")
# check if the twitter data has the same stocks as the stock data
for stock in twitter_files:
    if stock not in stock_files:
        print(stock)

# print all stock names with comma separated if no error without .csv extension and add a space between each stock name
print(", ".join([file.replace(".csv", "") for file in stock_files]))