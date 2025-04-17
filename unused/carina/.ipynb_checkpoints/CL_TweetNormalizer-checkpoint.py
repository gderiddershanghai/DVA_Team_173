import re
import ftfy  # Fixes text encoding issues
from emoji import is_emoji
from nltk.tokenize import TweetTokenizer

tokenizer = TweetTokenizer()
cashtag_rx = re.compile(r'\$[A-Za-z]+')  # Regex for cash tags

def normalizeToken(token):
    lowercased_token = token.lower()
    if token.startswith("@"):  
        return "@USER"
    elif lowercased_token.startswith("http") or lowercased_token.startswith("www"):  
        return "HTTPURL"
    elif cashtag_rx.match(token):  
        return "cash_tag"
    elif is_emoji(token):  
        return token  # Preserve emojis
    elif token.startswith("#"):  
        return lowercased_token  # Convert hashtags to lowercase
    elif len(token) >= 3 and token.isalpha():  
        return lowercased_token  # Keep only meaningful words (length >= 3)
    elif token == "’":
        return "'"
    elif token == "…":
        return "..."
    else:
        return None  

def normalizeTweet(tweet):
    tweet = ftfy.fix_text(tweet)  # Fix encoding issues
    tweet = re.sub(cashtag_rx, "cash_tag", tweet)  
    tokens = tokenizer.tokenize(tweet.replace("’", "'").replace("…", "..."))
    normTweet = " ".join(filter(None, [normalizeToken(token) for token in tokens]))

    normTweet = (
        normTweet.replace("cannot ", "can not ")
        .replace("n't ", " n't ")
        .replace("n 't ", " n't ")
        .replace("ca n't", "can't")
        .replace("ai n't", "ain't")
    )
    normTweet = (
        normTweet.replace("'m ", " 'm ")
        .replace("'re ", " 're ")
        .replace("'s ", " 's ")
        .replace("'ll ", " 'll ")
        .replace("'d ", " 'd ")
        .replace("'ve ", " 've ")
    )
    normTweet = (
        normTweet.replace(" p . m .", " p.m.")
        .replace(" p . m ", " p.m ")
        .replace(" a . m .", " a.m.")
        .replace(" a . m ", " a.m ")
    )

    return " ".join(normTweet.split())

if __name__ == "__main__":
    sample_tweet = "SC has first two presumptive cases of coronavirus, DHEC confirms https://postandcourier.com/health/covid19… via @postandcourier #COVID19 $AAPL ï¿½"
    print(normalizeTweet(sample_tweet))
