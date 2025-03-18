import pandas as pd
from filter_stopwords import FilterStopwords 
from itertools import combinations
import numpy as np

# get date start and end
# add a fp
class CommonWords:
    def __init__(self, start_date, end_date, stock_name, df, min_count=15, filter_metric='average_score'):
        self.start_date = pd.Timestamp(start_date)  
        self.end_date = pd.Timestamp(end_date)      
        self.stock_name = stock_name
        self.df = df
        self.df["DATE"] = pd.to_datetime(self.df['DATE'],infer_datetime_format=True)
        self.common_words = {}
        self.common_words_df = {}
        # min count should be dynamic, maybe a percentage of the total tweets?
        self.min_count = min_count
        self.filter_metric = filter_metric
        self.stopword_filter = FilterStopwords()
        
        ########################## how often do words appear together? ##########################
        # these will be the vertices
        self.cooccurrence = {}
        self.cooccurrence_df = {}
        
    def __str__(self):
        return f"DateRange(start_date={self.start_date}, end_date={self.end_date})"

    def get_start_date(self):
        return self.start_date

    def get_end_date(self):
        return self.end_date
    
    def get_top_words(self):
        top_5_positive = self.common_words_df.nlargest(5, 'average_score')
        top_5_negative = self.common_words_df.nsmallest(5, 'average_score')
        return top_5_positive, top_5_negative
    
    def get_adj_matrix(self, word_list):

        word_list = list(word_list)
        n = len(word_list)
        matrix = np.zeros((n, n), dtype=int)
        index_map = {w: i for i, w in enumerate(word_list)}

        
        for (w1, w2), stats in self.cooccurrence.items():
            if w1 in index_map and w2 in index_map:
                i, j = index_map[w1], index_map[w2]
                matrix[i, j] = stats['counts']
                matrix[j, i] = stats['counts']  
        self.A = pd.DataFrame(matrix, index=word_list, columns=word_list)
        return self.A

    
    
    
    
    def calculate_words(self):
        print(len(set(self.df['STOCK'])))
        print(set(self.df['STOCK']))
        # filter by stock name and dates
        stock_tweets = self.df[self.df['STOCK'] == self.stock_name]
        stock_tweets = stock_tweets[(stock_tweets['DATE'] >= self.start_date) & (stock_tweets['DATE'] <= self.end_date)]
        stock_tweets.reset_index(inplace=True, drop=True)
        number_of_tweets = stock_tweets.shape[0]
        self.min_count = int(number_of_tweets * 0.01)
        print('min count:', self.min_count)
        print('-------------------------------')
        for idx, row in stock_tweets.iterrows():
            words = str(row['TWEET']).split()  
            score = row['TEXTBLOB_POLARITY'] # needs to be changed to score for other datasets
            # print('------BEFORE-------------------------')
            # print(words)
            # print('-------AFTER------------------------')
            # removing stopwords & punctuation
            words = self.stopword_filter.filter_stopwords(row['TWEET']) # lower case for other datasets
            # print(words)
            # break

            for word in words:
                if word in self.common_words:
                    self.common_words[word]["counts"] += 1
                    self.common_words[word]["total_score"] += score
                else:
                    self.common_words[word] = {"counts": 1, "total_score": score}
                    
            # get all possible pairs of words        
            for w1, w2 in combinations(sorted(words), 2):
                
                pair = (w1, w2)
                if pair not in self.cooccurrence:
                    self.cooccurrence[pair] = {"counts": 0, "total_score": 0}
                self.cooccurrence[pair]["counts"] += 1
                self.cooccurrence[pair]["total_score"] += score
                
                
                
            # if idx==5: break
            
        common_words_df = pd.DataFrame(self.common_words).T
        common_words_df["average_score"] = common_words_df["total_score"] / common_words_df["counts"]
        common_words_df = common_words_df.sort_values(by=["counts"], ascending=False)
        # filter out uncommon words 
        common_words_df = common_words_df[common_words_df["counts"] > self.min_count]
        
        # filter by metric
        common_words_df = common_words_df.sort_values(by=[self.filter_metric], ascending=False)
        
        # get word column
        common_words_df.reset_index(inplace=True)
        common_words_df.rename(columns={"index": "word"}, inplace=True)
        self.common_words_df = common_words_df
        # print(common_words_df)
        
        # top_5_pos, top_5_neg = self.get_top_words()
        top_words = list(set(common_words_df.head()['word'].to_list() + common_words_df.tail()['word'].to_list()))
        A = self.get_adj_matrix(top_words)       
        
        return common_words_df.head(), common_words_df.tail(), A
        


if __name__ == "__main__":
    
    fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/processed/IEEE/top.csv"
    df = pd.read_csv(fp)
    # print(df.head())
    # print(df.describe())
    # print(df.columns)
    filter_metric = "average_score"
    # filter_metric = "total_score"
    stock_name = "Apple"
    word_counter = CommonWords("2017-01-09", "2018-07-16", stock_name=stock_name, df=df,  min_count=15, filter_metric=filter_metric)
    top5, bottom5, A = word_counter.calculate_words()
    print(top5)
    print(bottom5)
    print(A)
    