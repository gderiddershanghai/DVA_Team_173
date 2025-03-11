import pandas as pd
import nltk #must be installed prior to use
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import re

#to use function
#df[col1] = df.apply(lambda x: filter_stopwords(x['col1']),axis=1)

#get a sentence and filter stopwords
class filter_stopwords:
    def __init__(self):
      #  nltk.download('punkt_tab')
        nltk.download('stopwords')
        nltk.download('punkt_tab')
        nltk.download('punkt')
        nltk.download('wordnet')
        nltk.download('omw-1.4')
        self.stop_words = set(stopwords.words('english'))

    def filter_stopwords(self, sentence):
        sentence1 = re.sub("https?:\/\/.*?[\s+]","", sentence)
        sentence1 = re.sub("@","", sentence1)
        tokens = word_tokenize(sentence1)
        #need to remove words that starts with 'http'
        return [x for x in tokens if not x.lower() in self.stop_words]

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