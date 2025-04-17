import pandas as pd
from .filter_stopwords import FilterStopwords  # MAKE SURE TO CHANGE IF NOT IN IPYNB

def clean_tweets(df):
    """
    function to clean tweets
    """
    result_df = df.copy()

    if 'Tweet' not in result_df.columns:
        print("No Tweet in DF")
        return

    stopword_filter = FilterStopwords()
    tweets = result_df['Tweet'].fillna("").astype(str)

    result_df['cleaned_tweet'] = tweets.apply(lambda tweet: ' '.join(stopword_filter.filter_stopwords(tweet)))

    return result_df