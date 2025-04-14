from collections import Counter, defaultdict
import json
import os
import time
import numpy as np
from word_mapping import WORD_MAPPING
import pandas as pd
from itertools import combinations


class CommonWords:
    def __init__(self, ticker, data_dir, start_date, end_date,
                 min_count_percentage=0.01, top_n_words=5, filter_metric='average_score'):
        self.ticker = ticker
        self.data_dir = data_dir
        self.start_date = pd.to_datetime(start_date).tz_localize("UTC")
        self.end_date = pd.to_datetime(end_date).tz_localize("UTC")
        self.min_count_percentage = min_count_percentage
        self.top_n_words = top_n_words
        self.filter_metric = filter_metric

        self.df = self._load_data()
        self.common_words = {}  

    def _load_data(self):
        file_path = os.path.join(self.data_dir, f"{self.ticker}.csv")
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found for ticker '{self.ticker}': {file_path}")
        
        ### CHECK FOR MISSING SHIT
        df = pd.read_csv(file_path,usecols=["Tweet_Words", "Created_at", "Score"]
                         )
        # print(df.isna().sum(), 'total na')
        df.dropna( inplace=True)
        df["Tweet_Words"] = df["Tweet_Words"].str.split()
        df["Created_at"] = pd.to_datetime(df["Created_at"], utc=True)
        
        df["Tweet_Words"] = df["Tweet_Words"].apply(
            lambda words: [WORD_MAPPING.get(word, word) for word in words])

        
        return df

    def calculate(self, ):
        # os.makedirs(output_dir, exist_ok=True)

        tweets = self.df[(self.df["Created_at"] >= self.start_date) &
                         (self.df["Created_at"] <= self.end_date)]
        num_tweets = len(tweets)
        if num_tweets == 0:
            print(f"no tweets for {self.ticker} between {self.start_date.date()} and {self.end_date.date()}")
            return

        self.min_count = max(1, int(num_tweets * self.min_count_percentage))

        words_list = tweets["Tweet_Words"].tolist()
        scores_list = tweets["Score"].tolist()

        # ------------ compute word counts and total scores -----------
        # start_first_pass = time.perf_counter()
        word_counts = Counter()
        word_scores = defaultdict(float)

        for words, score in zip(words_list, scores_list):
            if not words: continue
                
            mapped_words = set(WORD_MAPPING.get(word, word) for word in words)
            word_counts.update(mapped_words)
            for word in mapped_words:
                word_scores[word] += score

        self.common_words = {
            word: {"counts": count, "total_score": word_scores[word]}
            for word, count in word_counts.items()}
        
        # end_first_pass = time.perf_counter()
        # print(f"first pass done in {end_first_pass - start_first_pass:.2f} seconds")

        # candidate word selection
        # start_candidate_selection = time.perf_counter()

        df_words = pd.DataFrame.from_dict(self.common_words, orient='index')
        df_words["average_score"] = df_words["total_score"] / df_words["counts"]
        df_words.reset_index(inplace=True)
        df_words.rename(columns={"index": "word"}, inplace=True)

        df_words["word"] = df_words["word"].apply(lambda w: WORD_MAPPING.get(w, w))
        df_words = df_words.groupby("word", as_index=False).agg({"counts": "sum","total_score": "sum"})
        df_words["average_score"] = df_words["total_score"] / df_words["counts"]

        df_words = df_words[df_words["counts"] >= self.min_count]
        # print(f"filtered words: {df_words.shape}")

        df_words_sorted = df_words.sort_values(self.filter_metric, ascending=True)

        bottom_words = df_words_sorted.head(self.top_n_words)
        top_words = df_words_sorted[~df_words_sorted["word"].isin(bottom_words["word"])].tail(self.top_n_words)

        candidate_words = set(top_words["word"]) | set(bottom_words["word"])
        # print(f"final words: {sorted(candidate_words)}")

        # end_candidate_selection = time.perf_counter()


        # second pass: compute co-occurrences for candidate words only
        # start_second_pass = time.perf_counter()
        cooccurrence = defaultdict(lambda: defaultdict(int))
        for words in words_list:
            if not words:
                continue
            unique_words = set(words)
            filtered_words = unique_words.intersection(candidate_words)
            for w1, w2 in combinations(filtered_words, 2):
                if w1 > w2:
                    w1, w2 = w2, w1
                cooccurrence[w1][w2] += 1
        # end_second_pass = time.perf_counter()
        # print(f"second pass done in {end_second_pass - start_second_pass:.2f} seconds")

        # build adjacency matrix
        # start_adj_matrix = time.perf_counter()
        matrix_json = {
            w1: {w2: count for w2, count in neighbors.items() if w2 in candidate_words}
            for w1, neighbors in cooccurrence.items() if w1 in candidate_words
        }
        # end_adj_matrix = time.perf_counter()
        # print(f"adj matrix done in {end_adj_matrix - start_adj_matrix:.2f} seconds")



        ######################
        ######################
                ######################
        ######################
                ######################
        ###################### REMOVE WORDS THAT OCCUR OFTEN BUT NOT IN ADJ Matrix
                ######################
        ######################
                ######################
        ######################


        # apply word mapping
        word_pass_start = time.perf_counter()
        final_words = sorted(candidate_words)
        mapped_matrix = {}

        for w1 in final_words:
            mapped_w1 = WORD_MAPPING.get(w1, w1)
            mapped_matrix[mapped_w1] = {}
            for w2 in final_words:
                if w1 == w2:continue  # skip self-links
                
                mapped_w2 = WORD_MAPPING.get(w2, w2)
                count = matrix_json.get(w1, {}).get(w2, matrix_json.get(w2, {}).get(w1, 0))
                mapped_matrix[mapped_w1][mapped_w2] = count

        word_pass_end = time.perf_counter()
        print(f"word mapping done in {word_pass_end - word_pass_start:.2f} seconds")

        return top_words.to_dict(orient="records"),bottom_words.to_dict(orient="records"),mapped_matrix
        # return {"top_words": top_words.to_dict(orient="records"),
        #     "bottom_words": bottom_words.to_dict(orient="records"),
        #     "adjacency_matrix": mapped_matrix}


if __name__ == "__main__":
    input_dir = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/cleaned_tweet_data/non_neutral"
    output_dir = "/home/ginger/code/gderiddershanghai/DVA_Team_173/src/components/wordbubbles/tmp_data"

    tickers = [
    "TSLA", "AAPL", "AMZN", "GOOGL", "MSFT", "DIS", "META", "NKE", "NFLX",
    "INTC", "JPM", "PG", "T", "SBUX", "WMT", "PYPL", "BAC", "PFE", "V",
    "XOM", "JNJ", "AMD", "PEP", "MCD", "VZ", "KO", "BA", "MA", "MRK",
    "UNH", "HD", "CMCSA", "IBM", "COST", "CVX", "ORCL", "UPS", "CSCO", "KR", "F"]
    
    # tickers = [
    # "TSLA", "AAPL", "AMZN", "GOOGL", "MSFT", "F"]
    
    # for ticker in tickers:
    #     print(f"Processing {ticker}...")
    #     start_time = time.time()
    #     analyzer = CommonWords(
    #         ticker=ticker,
    #         data_dir=input_dir,
    #         start_date="2017-01-01",
    #         end_date="2018-12-31",
    #         min_count_percentage=0.0075,
    #         top_n_words=10,
    #         filter_metric="average_score"
    #     )
    #     end_time = time.time()
    #     elapsed = end_time - start_time
    #     print(f"Initialization done in {elapsed:.2f} seconds.")
    #     start_time = time.time()
    #     analyzer.calculate(output_dir=output_dir)

    #     end_time = time.time()
    #     elapsed = end_time - start_time
    #     print(f"-------->>> Calculation done in {elapsed:.2f} seconds.")
        
        
        ######################################
    idx = 5 # 5 is a good one  "2017-01-01" "2019-12-21"
    print(tickers[idx])
    analyzer = CommonWords(
        ticker=tickers[idx],
        data_dir=input_dir,
        start_date="2017-01-01",
        end_date="2019-12-21",
        min_count_percentage=0.015,
        top_n_words=8,
        filter_metric='average_score'
        
    )
    start_time = time.time()

    analyzer.calculate(output_dir=output_dir)

    end_time = time.time()
    elapsed = end_time - start_time
    print(f" -------->>>  Done in {elapsed:.2f} seconds.")


