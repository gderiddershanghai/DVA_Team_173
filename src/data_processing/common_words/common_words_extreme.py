import pandas as pd
from itertools import combinations
from collections import Counter, defaultdict
import json
import os
import ast
import time
import numpy as np
from word_mapping import WORD_MAPPING

class CommonWords:
    def __init__(self, ticker, data_dir, start_date, end_date,
                 min_count_percentage=0.015, top_n_words=5, filter_metric='average_score'):
        self.ticker = ticker
        self.data_dir = data_dir
        self.start_date = pd.to_datetime(start_date).tz_localize("UTC")
        self.end_date = pd.to_datetime(end_date).tz_localize("UTC")
        self.min_count_percentage = min_count_percentage
        self.top_n_words = top_n_words
        self.filter_metric = filter_metric
        self.df = self._load_data()

    def _load_data(self):
        file_path = os.path.join(self.data_dir, f"{self.ticker}.csv")
        df = pd.read_csv(
            file_path,
            usecols=["Tweet_Words", "Created_at", "Score"]
        )
        print(df.isna().sum(), 'total na')
        df.dropna( inplace=True)
        df["Tweet_Words"] = df["Tweet_Words"].str.split()
        df["Created_at"] = pd.to_datetime(df["Created_at"], utc=True)
        
        return df


    def calculate(self, output_dir):
        os.makedirs(output_dir, exist_ok=True)
        tweets = self.df[
            (self.df["Created_at"] >= self.start_date) & 
            (self.df["Created_at"] <= self.end_date)
        ]
        
        if len(tweets) == 0:
            print(f"⚠️ No tweets found for {self.ticker}")
            return

        # === Sentiment-Specific Processing ===
        # Different approach for positive and negative tweets
        positive_tweets = tweets[tweets['Score'] > 0]
        negative_tweets = tweets[tweets['Score'] < 0]

        # Process Positive Words - focus on highest scores
        pos_word_counts = Counter()
        pos_word_scores = defaultdict(float)
        for words, score in positive_tweets[["Tweet_Words", "Score"]].itertuples(index=False):
            if not words:
                continue
            unique_words = set(words)
            pos_word_counts.update(unique_words)
            for word in unique_words:
                pos_word_scores[word] += score

        # Process Negative Words - focus on lowest scores
        neg_word_counts = Counter()
        neg_word_scores = defaultdict(float)
        for words, score in negative_tweets[["Tweet_Words", "Score"]].itertuples(index=False):
            if not words:
                continue
            unique_words = set(words)
            neg_word_counts.update(unique_words)
            for word in unique_words:
                neg_word_scores[word] += score

        # === Candidate Selection ===
        min_count = max(1, int(len(tweets) * self.min_count_percentage))

        # Create DataFrames with different metrics for positive and negative words
        pos_df = pd.DataFrame.from_dict(
            {word: {"counts": count, "total_score": pos_word_scores[word]}
             for word, count in pos_word_counts.items()}, orient='index'
        )
        if not pos_df.empty:
            pos_df["average_score"] = pos_df["total_score"] / pos_df["counts"]
            pos_df = pos_df[pos_df["counts"] >= min_count]
            # For positive words, we want the highest average scores
            top_pos = pos_df.nlargest(self.top_n_words, "average_score")
        else:
            top_pos = pd.DataFrame(columns=["counts", "total_score", "average_score"])

        neg_df = pd.DataFrame.from_dict(
            {word: {"counts": count, "total_score": neg_word_scores[word]}
             for word, count in neg_word_counts.items()}, orient='index'
        )
        if not neg_df.empty:
            neg_df["average_score"] = neg_df["total_score"] / neg_df["counts"]
            neg_df = neg_df[neg_df["counts"] >= min_count]
            # For negative words, we want the lowest average scores
            top_neg = neg_df.nsmallest(self.top_n_words, "average_score")
        else:
            top_neg = pd.DataFrame(columns=["counts", "total_score", "average_score"])

        # Reset indices and add word column
        if not top_pos.empty:
            top_pos = top_pos.reset_index().rename(columns={"index": "word"})
        if not top_neg.empty:
            top_neg = top_neg.reset_index().rename(columns={"index": "word"})

        # Combine positive and negative words
        combined_words = pd.concat([top_pos, top_neg])
        
        # Get unique candidate words
        candidate_words = set(combined_words["word"]) if not combined_words.empty else set()
        print('final words:', sorted(candidate_words))
        print(f"Selected {len(candidate_words)} candidate words")

        # === Co-occurrence Calculation ===
        cooccurrence = defaultdict(lambda: defaultdict(int))
        for words in tweets["Tweet_Words"]:
            if not words:
                continue
            filtered = set(words).intersection(candidate_words)
            for w1, w2 in combinations(filtered, 2):
                if w1 > w2:
                    w1, w2 = w2, w1
                cooccurrence[w1][w2] += 1

        # === Apply Word Mapping at the end ===
        # Map words in top_pos
        if not top_pos.empty:
            top_pos['word'] = top_pos['word'].apply(lambda word: WORD_MAPPING.get(word, word))
        
        # Map words in top_neg
        if not top_neg.empty:
            top_neg['word'] = top_neg['word'].apply(lambda word: WORD_MAPPING.get(word, word))
        
        # Map words in adjacency matrix
        mapped_cooccurrence = defaultdict(lambda: defaultdict(int))
        for w1, neighbors in cooccurrence.items():
            mapped_w1 = WORD_MAPPING.get(w1, w1)
            for w2, count in neighbors.items():
                mapped_w2 = WORD_MAPPING.get(w2, w2)
                mapped_cooccurrence[mapped_w1][mapped_w2] += count

        # === Save Outputs ===
        # Save top positive words as top_words.json
        if not top_pos.empty:
            top_pos.to_json(os.path.join(output_dir, "top_words.json"), orient="records", indent=2)
        else:
            pd.DataFrame().to_json(os.path.join(output_dir, "top_words.json"), orient="records", indent=2)
        
        # Save top negative words as bottom_words.json
        if not top_neg.empty:
            top_neg.to_json(os.path.join(output_dir, "bottom_words.json"), orient="records", indent=2)
        else:
            pd.DataFrame().to_json(os.path.join(output_dir, "bottom_words.json"), orient="records", indent=2)
        
        # Save adjacency matrix
        with open(os.path.join(output_dir, "adjacency_matrix.json"), "w") as f:
            json.dump(
                {w1: {w2: c for w2, c in inner.items()} 
                 for w1, inner in mapped_cooccurrence.items()},
                f, indent=2
            )

        print(f"Saved outputs for {self.ticker} to {output_dir}")



if __name__ == "__main__":
    input_dir = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/cleaned_tweet_data/full"
    output_dir = "/home/ginger/code/gderiddershanghai/DVA_Team_173/src/components/wordbubbles/tmp_data"
    
    tickers = [
        "TSLA", "AAPL", "AMZN", "GOOGL", "MSFT", "DIS", "META", "NKE", "NFLX",
        "INTC", "JPM", "PG", "T", "SBUX", "WMT", "PYPL", "BAC", "PFE", "V",
        "XOM", "JNJ", "AMD", "PEP", "MCD", "VZ", "KO", "BA", "MA", "MRK",
        "UNH", "HD", "CMCSA", "IBM", "COST", "CVX", "ORCL", "UPS", "CSCO", "KR", "F"
    ]
    
    # for ticker in tickers:
    #     print(f"Processing {ticker}...")
    #     start_time = time.time()
        
    #     analyzer = CommonWords(
    #         ticker=ticker,
    #         data_dir=input_dir,
    #         start_date="2017-01-01",
    #         end_date="2018-12-31",
    #         min_count_percentage=0.015,
    #         top_n_words=20,
    #         filter_metric="average_score"
    #     )
        
    #     analyzer.calculate(output_dir=output_dir)
        
    #     print(f"✅ Done in {time.time() - start_time:.2f} seconds\n")

        
        
        #######################################
    idx = 0
    print(tickers[idx])
    analyzer = CommonWords(
        ticker=tickers[idx],
        data_dir=input_dir,
        start_date="2017-01-01",
        end_date="2021-12-31",
        min_count_percentage=0.01,
        top_n_words=20,
        filter_metric='average_score'
            )
    start_time = time.time()

    analyzer.calculate(output_dir=output_dir)

    end_time = time.time()
    elapsed = end_time - start_time
    print(f"✅ Done in {elapsed:.2f} seconds.")









