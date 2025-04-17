import os
import shutil

## this is just to get our own tweets
def copy_selected_csvs(source_dir, target_dir, tickers):

    os.makedirs(target_dir, exist_ok=True)

    found_tickers = set()
    for file_name in os.listdir(source_dir):
        if file_name.endswith(".csv"):
            ticker = os.path.splitext(file_name)[0]
            # print('TICKER: ',ticker)
            if ticker in tickers:
                found_tickers.add(ticker)

                idx = tickers.index(ticker)
                if idx == 10:print("10")

                source_file = os.path.join(source_dir, file_name)
                target_file = os.path.join(target_dir, file_name)
                shutil.copy2(source_file, target_file)
                # print(f"Copied {file_name}")

    missing_tickers = [ticker for ticker in tickers if ticker not in found_tickers]

    if missing_tickers:
        print("MISSING TICKERS")
        for ticker in missing_tickers:
            print(ticker)
    else:
        print("All tickers found baby")

tickers = [
    "TSLA", "AAPL", "AMZN", "GOOGL", "MSFT", "F", "DIS", "META", "NKE", "NFLX",
    "INTC", "JPM", "PG", "T", "SBUX", "WMT", "PYPL", "BAC", "PFE", "V",
    "XOM", "JNJ", "AMD", "PEP", "MCD", "VZ", "KO", "BA", "MA", "MRK",
    "UNH", "HD", "CMCSA", "IBM", "COST", "CVX", "ORCL", "UPS", "CSCO", "KR"]

source_path = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/stock_data/StockHistory"
target_path = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/stock_data/cleaned_stocks"

copy_selected_csvs(source_path, target_path, tickers)
