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
        self.common_words = {}  # Will store word counts and total scores

    def _load_data(self):
        file_path = os.path.join(self.data_dir, f"{self.ticker}.csv")
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found for ticker '{self.ticker}': {file_path}")
        
        df = pd.read_csv(
            file_path,
            usecols=["Tweet_Words", "Created_at", "Score"]
        )
        # print(df.isna().sum(), 'total na')
        df.dropna( inplace=True)
        df["Tweet_Words"] = df["Tweet_Words"].str.split()
        df["Created_at"] = pd.to_datetime(df["Created_at"], utc=True)
        
        df["Tweet_Words"] = df["Tweet_Words"].apply(
            lambda words: [WORD_MAPPING.get(word, word) for word in words])

        
        return df

    def calculate(self, output_dir):
        os.makedirs(output_dir, exist_ok=True)

        # Filter tweets by the given date range.
        tweets = self.df[
            (self.df["Created_at"] >= self.start_date) &
            (self.df["Created_at"] <= self.end_date)
        ]
        num_tweets = len(tweets)
        if num_tweets == 0:
            print(f"⚠️ No tweets found for {self.ticker} between {self.start_date.date()} and {self.end_date.date()}")
            return

        # Determine the minimum number of tweets a word must appear in.
        self.min_count = max(1, int(num_tweets * self.min_count_percentage))

        # Extract columns as lists for faster iteration.
        words_list = tweets["Tweet_Words"].tolist()
        scores_list = tweets["Score"].tolist()

        # === First Pass: Compute word counts and total scores ===
        start_first_pass = time.perf_counter()
        word_counts = Counter()
        word_scores = defaultdict(float)

        # print(len(words_list), len(scores_list))
        for words, score in zip(words_list, scores_list):
            if not words:
                continue

            # Apply mapping and deduplicate *after* mapping
            mapped_words = set(WORD_MAPPING.get(word, word) for word in words)
            
            word_counts.update(mapped_words)
            for word in mapped_words:
                word_scores[word] += score

        # Merge counts and scores into a single dictionary.
        # === Merge counts and scores into a single dictionary ===
        self.common_words = {
            word: {"counts": count, "total_score": word_scores[word]}
            for word, count in word_counts.items()
        }
        end_first_pass = time.perf_counter()
        print(f"Time for first pass (word counts and scores): {end_first_pass - start_first_pass:.2f} seconds")

        # === Candidate Word Selection ===
        start_candidate_selection = time.perf_counter()

        # Convert to DataFrame
        df_words = pd.DataFrame.from_dict(self.common_words, orient='index')
        df_words["average_score"] = df_words["total_score"] / df_words["counts"]
        df_words.reset_index(inplace=True)
        df_words.rename(columns={"index": "word"}, inplace=True)

        # Apply word mapping and merge rows that map to the same word
        df_words["word"] = df_words["word"].apply(lambda w: WORD_MAPPING.get(w, w))
        df_words = df_words.groupby("word", as_index=False).agg({
            "counts": "sum",
            "total_score": "sum"
        })
        df_words["average_score"] = df_words["total_score"] / df_words["counts"]

        # Filter by minimum count threshold
        df_words = df_words[df_words["counts"] >= self.min_count]
        print(df_words.shape, '--------------------------------------')

        # Select top and bottom words
        df_words_sorted = df_words.sort_values(self.filter_metric, ascending=True)

        # Get bottom N
        bottom_words = df_words_sorted.head(self.top_n_words)

        # Drop those bottom words before selecting top
        top_words = df_words_sorted[~df_words_sorted["word"].isin(bottom_words["word"])].tail(self.top_n_words)


        # Union of top/bottom for candidate set
        candidate_words = set(top_words["word"]) | set(bottom_words["word"])
        print('final words:', sorted(candidate_words))

        end_candidate_selection = time.perf_counter()


        # === Second Pass: Compute co-occurrences for candidate words only (no parallelization) ===
        start_second_pass = time.perf_counter()
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
        end_second_pass = time.perf_counter()
        print(f"Time for second pass (co-occurrence computation): {end_second_pass - start_second_pass:.2f} seconds")

        # === Build Adjacency Matrix ===
        start_adj_matrix = time.perf_counter()
        matrix_json = {
            w1: {w2: count for w2, count in neighbors.items() if w2 in candidate_words}
            for w1, neighbors in cooccurrence.items() if w1 in candidate_words
        }
        end_adj_matrix = time.perf_counter()
        print(f"Time for building adjacency matrix: {end_adj_matrix - start_adj_matrix:.2f} seconds")

        # === Apply Word Mapping at the very end ===
        word_pass_start = time.perf_counter()
        
        # Apply word mapping to top_words
        # top_words['word'] = top_words['word'].apply(lambda word: WORD_MAPPING.get(word, word))
        
        # Apply word mapping to bottom_words
        # bottom_words['word'] = bottom_words['word'].apply(lambda word: WORD_MAPPING.get(word, word))
        
        # Apply word mapping to adjacency matrix
        # Final candidate word list
        final_words = sorted(candidate_words)
        mapped_matrix = {}

        for w1 in final_words:
            mapped_w1 = WORD_MAPPING.get(w1, w1)
            mapped_matrix[mapped_w1] = {}
            for w2 in final_words:
                if w1 == w2:
                    continue  # skip self-links
                mapped_w2 = WORD_MAPPING.get(w2, w2)
                # Get actual count, or 0 if missing
                count = matrix_json.get(w1, {}).get(w2, matrix_json.get(w2, {}).get(w1, 0))
                mapped_matrix[mapped_w1][mapped_w2] = count

        
        word_pass_end = time.perf_counter()
        print(f"Time for word mapping: {word_pass_end - word_pass_start:.2f} seconds")
        print('top words:', top_words)
        print('bottom words:', bottom_words)
        # === Save Outputs ===
        top_words.to_json(os.path.join(output_dir, "top_words.json"), orient="records", indent=2)
        bottom_words.to_json(os.path.join(output_dir, "bottom_words.json"), orient="records", indent=2)
        with open(os.path.join(output_dir, "adjacency_matrix.json"), "w") as f:
            json.dump(mapped_matrix, f, indent=2)

        print(f"Saved outputs for {self.ticker} to {output_dir}")








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
    #     print(f"✅ Calculation done in {elapsed:.2f} seconds.")
        
        
        ######################################
    idx = 0
    print(tickers[idx])
    analyzer = CommonWords(
        ticker=tickers[idx],
        data_dir=input_dir,
        start_date="2017-01-01",
        end_date="2019-12-31",
        min_count_percentage=0.01,
        top_n_words=10,
        filter_metric='average_score'
        
    )
    start_time = time.time()

    analyzer.calculate(output_dir=output_dir)

    end_time = time.time()
    elapsed = end_time - start_time
    print(f"✅ Done in {elapsed:.2f} seconds.")



























# # get date start and end
# # add a fp
# class CommonWords:
#     def __init__(self, start_date, end_date, stock_name, df, min_count=15, filter_metric='average_score'):
#         self.start_date = pd.Timestamp(start_date)  
#         self.end_date = pd.Timestamp(end_date)      
#         self.stock_name = stock_name
#         self.df = df
#         self.df["DATE"] = pd.to_datetime(self.df['DATE'],infer_datetime_format=True)
#         self.common_words = {}
#         self.common_words_df = {}
#         # min count should be dynamic, maybe a percentage of the total tweets?
#         self.min_count = min_count
#         self.filter_metric = filter_metric
#         self.stopword_filter = FilterStopwords() # do this before
        
#         ########################## how often do words appear together? ##########################
#         # these will be the vertices
#         self.cooccurrence = {}
#         self.cooccurrence_df = {}
        
#     def __str__(self):
#         return f"DateRange(start_date={self.start_date}, end_date={self.end_date})"

#     def get_start_date(self):
#         return self.start_date

#     def get_end_date(self):
#         return self.end_date
    
#     def get_top_words(self):
#         top_5_positive = self.common_words_df.nlargest(5, 'average_score')
#         top_5_negative = self.common_words_df.nsmallest(5, 'average_score')
#         return top_5_positive, top_5_negative
    
#     def get_adj_matrix(self, word_list):

#         word_list = list(word_list)
#         n = len(word_list)
#         matrix = np.zeros((n, n), dtype=int)
#         index_map = {w: i for i, w in enumerate(word_list)}

        
#         for (w1, w2), stats in self.cooccurrence.items():
#             if w1 in index_map and w2 in index_map:
#                 i, j = index_map[w1], index_map[w2]
#                 matrix[i, j] = stats['counts']
#                 matrix[j, i] = stats['counts']  
#         self.A = pd.DataFrame(matrix, index=word_list, columns=word_list)
#         return self.A   
    
#     def calculate_words(self):
#         print(len(set(self.df['STOCK'])))
#         print(set(self.df['STOCK']))
#         # filter by stock name and dates
#         stock_tweets = self.df[self.df['STOCK'] == self.stock_name]
#         stock_tweets = stock_tweets[(stock_tweets['DATE'] >= self.start_date) & (stock_tweets['DATE'] <= self.end_date)]
#         stock_tweets.reset_index(inplace=True, drop=True)
#         number_of_tweets = stock_tweets.shape[0]
#         self.min_count = int(number_of_tweets * 0.01)
#         print('min count:', self.min_count)
#         print('-------------------------------')
#         for idx, row in stock_tweets.iterrows():
#             words = str(row['TWEET']).split()  
#             score = row['TEXTBLOB_POLARITY'] # needs to be changed to score for other datasets
#             # print('------BEFORE-------------------------')
#             # print(words)
#             # print('-------AFTER------------------------')
#             # removing stopwords & punctuation
#             words = self.stopword_filter.filter_stopwords(row['TWEET']) # lower case for other datasets
#             # print(words)
#             # break

#             for word in words:
#                 if word in self.common_words:
#                     self.common_words[word]["counts"] += 1
#                     self.common_words[word]["total_score"] += score
#                 else:
#                     self.common_words[word] = {"counts": 1, "total_score": score}
                    
#             # get all possible pairs of words        
#             for w1, w2 in combinations(sorted(words), 2):
                
#                 pair = (w1, w2)
#                 if pair not in self.cooccurrence:
#                     self.cooccurrence[pair] = {"counts": 0, "total_score": 0}
#                 self.cooccurrence[pair]["counts"] += 1
#                 self.cooccurrence[pair]["total_score"] += score
                
                
                
#             # if idx==5: break
            
#         common_words_df = pd.DataFrame(self.common_words).T
#         common_words_df["average_score"] = common_words_df["total_score"] / common_words_df["counts"]
#         common_words_df = common_words_df.sort_values(by=["counts"], ascending=False)
#         # filter out uncommon words 
#         common_words_df = common_words_df[common_words_df["counts"] > self.min_count]
        
#         # filter by metric
#         common_words_df = common_words_df.sort_values(by=[self.filter_metric], ascending=False)
        
#         # get word column
#         common_words_df.reset_index(inplace=True)
#         common_words_df.rename(columns={"index": "word"}, inplace=True)
#         self.common_words_df = common_words_df
#         # print(common_words_df)
        
#         # top_5_pos, top_5_neg = self.get_top_words()
#         top_words = list(set(common_words_df.head()['word'].to_list() + common_words_df.tail()['word'].to_list()))
#         A = self.get_adj_matrix(top_words)       
        
#         return common_words_df.head(), common_words_df.tail(), A
        


# if __name__ == "__main__":
    
#     fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/processed/IEEE/top.csv"
#     df = pd.read_csv(fp)
#     # print(df.head())
#     # print(df.describe())
#     # print(df.columns)
#     filter_metric = "average_score"
#     # filter_metric = "total_score"
#     stock_name = "Apple"
#     word_counter = CommonWords("2017-01-09", "2018-07-16", stock_name=stock_name, df=df,  min_count=15, filter_metric=filter_metric)
#     top5, bottom5, A = word_counter.calculate_words()
#     print(top5)
#     print(bottom5)
#     print(A)
    