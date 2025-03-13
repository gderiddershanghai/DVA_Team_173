import pandas as pd
from filter_stopwords import FilterStopwords 


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
        
    def __str__(self):
        return f"DateRange(start_date={self.start_date}, end_date={self.end_date})"

    def get_start_date(self):
        return self.start_date

    def get_end_date(self):
        return self.end_date
    
    def calculate_words(self):
        print(len(set(self.df['STOCK'])))
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
            score = row['TEXTBLOB_POLARITY']
            # print('------BEFORE-------------------------')
            # print(words)
            # print('-------AFTER------------------------')
            # removing stopwords & punctuation
            words = self.stopword_filter.filter_stopwords(row['TWEET'])
            # print(words)
            # break

            for word in words:
                if word in self.common_words:
                    self.common_words[word]["counts"] += 1
                    self.common_words[word]["total_score"] += score
                else:
                    self.common_words[word] = {"counts": 1, "total_score": score}
            if idx==5: break
        self.common_words_df = pd.DataFrame(self.common_words).T
        self.common_words_df = self.common_words_df.sort_values(by=["counts"], ascending=False)
        self.common_words_df["average_score"] = self.common_words_df["total_score"] / self.common_words_df["counts"]
        # filtering out uncommon words
        self.common_words_df = self.common_words_df[self.common_words_df["counts"] > self.min_count]
        # sorting by filter metric
        return self.common_words_df.sort_values(by=[self.filter_metric], ascending=False)
        


if __name__ == "__main__":
    
    # Index(['TWEET', 'STOCK', 'DATE', 'LAST_PRICE', '1_DAY_RETURN', '2_DAY_RETURN',
    #    '3_DAY_RETURN', '7_DAY_RETURN', 'PX_VOLUME', 'VOLATILITY_10D',
    #    'VOLATILITY_30D', 'LSTM_POLARITY', 'TEXTBLOB_POLARITY'],
    #   dtype='object')
    
    fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/processed/IEEE/top.csv"
    df = pd.read_csv(fp)
    # print(df.head())
    # print(df.describe())
    # print(df.columns)
    filter_metric = "average_score"
    # filter_metric = "total_score"
    stock_name = "Google"
    word_counter = CommonWords("2017-01-09", "2018-07-16", stock_name=stock_name, df=df,  min_count=15, filter_metric=filter_metric)
    common_words = word_counter.calculate_words()
    print(common_words.head())
    print(common_words.tail())
    