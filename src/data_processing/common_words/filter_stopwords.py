import pandas as pd
import nltk #must be installed prior to use
import string
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import re

#to use function
#df[col1] = df.apply(lambda x: filter_stopwords(x['col1']),axis=1)

#get a sentence and filter stopwords
class FilterStopwords:
    def __init__(self):
        nltk.download('stopwords')
        nltk.download('punkt_tab')
        nltk.download('punkt')
        nltk.download('wordnet')
        nltk.download('omw-1.4')
        self.stop_words = set(stopwords.words('english'))
        self.punctuation_table = str.maketrans("", "", string.punctuation)
        
        # Just in case, filtering out company names and tickers
        self.company_names = {
            'jpmorgan', 'chase',  'cisco', 
            'comcast', 'exxon', 'mobil', 'verizon',  'inc', 'walmart',
            'paypal', 'holdings', 
             'boeing',  'nike', 'merck',
            'at&t', 'kroger', 'pepsico', 'pfizer', 'intel', 
            'oracle', 'netflix', 'mcdonalds', 'amazon', 'ford',
            'alphabet',  'mastercard', 'procter', 'gamble',
            'meta', 'chevron', 'apple', 'walt', 'disney', 'starbucks',
            'microsoft', 'johnson', 'costco',
            'coca', 'cola', 'tesla'}
        
        self.tickers = {
            'unh', 'xom', 'meta', 'aapl', 'googl', 'nke', 'jnj', 'amzn', 'f', 'dis',
            'ma', 'ups', 'bac', 'v', 'ba', 'intc', 'pg', 'nflx', 'tsla', 'ko', 'mcd',
            'ibm', 'hd', 'cvx', 'vz', 'cmcsa', 'csco', 'cost', 'kr', 'msft', 'jpm',
            'wmt', 'pypl', 't', 'sbux', 'pfe', 'pep', 'mrk', 'orcl', 'amd'}
        self.words_to_filter = self.stop_words.union(self.company_names).union(self.tickers)
        
        
    def filter_stopwords(self, sentence):
        sentence1 = re.sub("http[s]?://\S+","", sentence)
        sentence1 = re.sub("@","", sentence1)
        # remove numbers
        sentence1 = re.sub(r"\S*\d+\S*", "", sentence1)

        sentence1 = re.sub(r"[^\w\s]", "", sentence1)
        tokens = word_tokenize(sentence1)
        cleaned_tokens = [word.translate(self.punctuation_table) for word in tokens]
        #need to remove words that starts with 'http'
        # return [word for word in cleaned_tokens if word.lower() not in self.stop_words and word.strip()]
        return [word for word in cleaned_tokens 
                if word.lower() not in self.words_to_filter and word.strip()]

#to use function
#df[col1] = df.apply(lambda x: filter_stopwords(x['col1']),axis=1)

#run through data
#fs = filter_stopwords()
#bottom
#df = pd.read_csv('bottom.csv')
#df['TWEET'] = df.apply(lambda x: fs.filter_stopwords(x['TWEET']),axis=1)
#print(df.head())
#df.to_csv('bottom_filtered.csv', index=False)
#top
#df = pd.read_csv('mid.csv')
#df['TWEET'] = df.apply(lambda x: fs.filter_stopwords(x['TWEET']),axis=1)
#df.to_csv('mid_filtered.csv', index=False)
#top
#df = pd.read_csv('top.csv')
#df['TWEET'] = df.apply(lambda x: fs.filter_stopwords(x['TWEET']),axis=1)
#print(df.head())
#df.to_csv('top_filtered.csv', index=False)