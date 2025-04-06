import pandas as pd
from .filter_stopwords import FilterStopwords # change if not using juptyer notebook
# from filter_stopwords import FilterStopwords

def clean_tweets(df):
    """
    Clean tweets in a DataFrame and return the DataFrame with a new column of cleaned tweets.
    
    Parameters:
    df (pandas.DataFrame): DataFrame containing a 'TWEET' column
    
    Returns:
    pandas.DataFrame: Original DataFrame with an additional 'cleaned_tweet' column
    """
    # Create a copy of the DataFrame to avoid modifying the original
    result_df = df.copy()
    
    # Initialize the stopword filter
    stopword_filter = FilterStopwords()
    
    # Apply cleaning to each tweet and store in new column
    result_df['cleaned_tweet'] = result_df['Tweet'].apply(
        lambda x: stopword_filter.filter_stopwords(str(x))
    )
    
    return result_df

# if __name__ == "__main__":
#     # Example usage
#     fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/processed/IEEE/top.csv"
#     df = pd.read_csv(fp)
    
#     # Clean the tweets
#     cleaned_df = clean_tweets(df)
    
#     # Print first few rows to verify
#     print(cleaned_df[['TWEET', 'cleaned_tweet']].head())