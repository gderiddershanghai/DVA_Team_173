

LINKS TO ORIGINAL DATASETS

STOCK DATA
https://www.kaggle.com/datasets/footballjoe789/us-stock-dataset

TWITTER DATA
Carina Found https://www.kaggle.com/datasets/thedevastator/tweet-sentiment-s-impact-on-stock-returns
IEEE Dataset https://ieee-dataport.org/open-access/stock-market-tweets-data
Kenny https://www.kaggle.com/datasets/equinxx/stock-tweets-for-sentiment-analysis-and-prediction
Large Dataset Ginger https://www.kaggle.com/datasets/omermetinn/tweets-about-the-top-companies-from-2015-to-2020

LINKS TO CLEAN DATASETS
https://drive.google.com/drive/folders/1PPvOJULRUWUcHZwWMKx_v-nUEV7TC_U7?usp=drive_link

LINK TO API END POINT
https://dva-api-urhl4viviq-uc.a.run.app/docs

LINK TO DEPLOYED DASHBOARD
https://gderiddershanghai.github.io/dva_team173_frontend/

===============================
BERT FINETUNING & MODELING
===============================

src/data_processing/TweetNormalizer.py  
Custom tweet normalization for BERT inputs as per finetuned model instructions

src/data_processing/dataset_loader.py  
Loads and formats tweet datasets for training

notebooks/ginger/training_data_set_creation.ipynb  
Generates train/test datasets

src/data_processing/tweet_bert_finetune.py  
Loads BERT model + regression head for sentiment prediction

src/data_processing/sentiment_trainer.py  
Code for finetuning 

src/data_processing/predict_tweets.py  
Code to get score predictions 

===============================
DATA CLEANING & MERGING
===============================

notebooks/ginger/check_for_duplicates.ipynb  
Removes duplicate tweets

notebooks/ginger/cleaning_carinas_labelled_dataset.ipynb  
Cleans Carina’s dataset

notebooks/ginger/reducing_the_large_dataset.ipynb  
notebooks/ginger/big_tweets.ipynb  
Filters and trims large tweet datasets

notebooks/ginger/merging_all_datasets.ipynb  
Combines all datasets (Carina, Kenny, Jason, Ginger)

src/data_processing/get_target_stocks.py  
Selects target stock tickers based on total number of tweets

===============================
TWEET CLEANING & STOPWORDS
===============================

src/data_processing/common_words/filter_stopwords.py  
Most of the logix for the tweet_cleaner function

src/data_processing/common_words/tweet_cleaner.py  
Function for cleaning the tweets

notebooks/ginger/histograms/  
Score distribution plots to filter neutral sentiment

notebooks/ginger/split stocks.ipynb  
Final tweet cleanup & consolidation

===============================
ADJACENCY MATRIX & TOP WORDS
===============================

src/components/dashboard/calculations/get_common_words.py  
Extracts the top words & builds adjacency matrix

src/components/dashboard/calculations/word_mapping.py  
Dictionary to correct spelling and normalize word forms
