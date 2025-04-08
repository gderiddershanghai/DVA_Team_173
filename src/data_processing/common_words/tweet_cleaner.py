import pandas as pd
from .filter_stopwords import FilterStopwords  

def clean_tweets(df: pd.DataFrame, verbose: bool = True) -> pd.DataFrame:
    """
    Clean tweets in a DataFrame and return the DataFrame with a new column of cleaned tweets as space-separated strings.

    Parameters:
    df (pandas.DataFrame): DataFrame containing a 'Tweet' column
    verbose (bool): Whether to print processing progress

    Returns:
    pandas.DataFrame: Original DataFrame with an additional 'cleaned_tweet' column
    """
    result_df = df.copy()

    if 'Tweet' not in result_df.columns:
        raise ValueError("DataFrame must contain a 'Tweet' column.")

    stopword_filter = FilterStopwords()
    tweets = result_df['Tweet'].fillna("").astype(str)

    if verbose:
        print(f"Processing {len(tweets)} tweets...")

    result_df['cleaned_tweet'] = tweets.apply(
        lambda tweet: ' '.join(stopword_filter.filter_stopwords(tweet))
    )

    return result_df



# import pandas as pd
# from .filter_stopwordsv2 import FilterStopwords  # adjust import if needed

# def clean_tweets(df: pd.DataFrame, verbose: bool = True, test_mode: bool = False) -> pd.DataFrame:
#     """
#     Clean tweets in a DataFrame and return the DataFrame with a new column of cleaned tweets.

#     Parameters:
#     df (pandas.DataFrame): DataFrame containing a 'Tweet' column
#     verbose (bool): Whether to print processing progress
#     test_mode (bool): Whether to run a test batch upon initializing the filter

#     Returns:
#     pandas.DataFrame: Original DataFrame with an additional 'cleaned_tweet' column
#     """

#     result_df = df.copy()

#     if 'Tweet' not in result_df.columns:
#         raise ValueError("DataFrame must contain a 'Tweet' column.")

#     stopword_filter = FilterStopwords(test_mode=test_mode)

#     tweets = result_df['Tweet'].fillna("").astype(str).tolist()
#     cleaned = stopword_filter.filter_many(tweets, verbose=verbose)

#     result_df['cleaned_tweet'] = cleaned
#     return result_df
