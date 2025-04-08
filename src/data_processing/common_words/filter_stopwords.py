import pandas as pd
import nltk
import string
import re
from nltk.corpus import stopwords
from nltk.tokenize import TweetTokenizer
from emoji import demojize
from nltk.stem import PorterStemmer

class FilterStopwords:
    def __init__(self, use_stemming=True):
        # Download necessary NLTK data sets
        nltk.download('stopwords', quiet=True)
        nltk.download('punkt', quiet=True)

        self.tokenizer = TweetTokenizer()
        self.stop_words = set(stopwords.words('english'))
        self.punctuation_table = str.maketrans("", "", string.punctuation)
        self.use_stemming = use_stemming

        # Define word sets to filter
        self.company_names = {
            'jpmorgan', 'chase', 'cisco', 'comcast', 'exxon', 'mobil', 'verizon', 'inc',
            'walmart', 'paypal', 'holdings', 'boeing', 'nike', 'merck', 'at&t', 'kroger',
            'pepsico', 'pfizer', 'intel', 'oracle', 'netflix', 'mcdonalds', 'amazon', 'ford',
            'alphabet', 'mastercard', 'procter', 'gamble', 'meta', 'chevron', 'apple', 'walt',
            'disney', 'starbucks', 'microsoft', 'johnson', 'costco', 'coca', 'cola', 'tesla'
        }
        self.tickers = {
            'unh', 'xom', 'meta', 'aapl', 'googl', 'nke', 'jnj', 'amzn', 'f', 'dis',
            'ma', 'ups', 'bac', 'v', 'ba', 'intc', 'pg', 'nflx', 'tsla', 'ko', 'mcd',
            'ibm', 'hd', 'cvx', 'vz', 'cmcsa', 'csco', 'cost', 'kr', 'msft', 'jpm',
            'wmt', 'pypl', 't', 'sbux', 'pfe', 'pep', 'mrk', 'orcl', 'amd'
        }
        self.extra_stopwords = {
            'free', 'trial', 'great', 'good', 'best', 'nice', 'better', 'win', 'strong',
            'buy', 'sell', 'sold', 'short', 'option', 'options', 'shares', 'stock', 'stocks',
            'investing', 'investment', 'join', 'alert', 'alerts', 'link', 'check', 'video',
            'watch', 'time', 'today', 'love', 'hate', 'twitter', 'game', 'system', 'use',
            'got', 'windows', 'surface', 'wo', 's', 'p', 'e', 'make', 'take', 'go', 'know',
            'say', 'see', 'look', 'want', 'back', 'nothing', 'team', 'group', 'core',
            'meal', 'gear', 'documentary', 'indicator', 'volume', 'chart', 'stochastic',
            'candle', 'strike', 'pullback', 'pattern', 'convergence', 'combo', 'momentum',
            'histogram', 'grid', 'breakdown', 'looking', 'really', 'elon', 'people',
            'musk', 'c', 'ca', 'baba', 'work', 'lol', 'mu', 'calls', 'top', 'high',
            'business', 'sq', 'think', 'demand', 'maybe', 'dm', 'httpurl',
            'surveycity', 'careerarc', 'optionstrade', 'optiontrading',
            'financialservices', 'verizoncommunications', 'visaincordinaryshares',
            'examdumps', 'associate', 'certified', 'ccna', 'technicalanalysis',
            'elliottwave', 'original', 'jeffersontown', 'jefferies', 'oppenheimer',
            'suisse', 'suntrust', 'unitedhealthgroup', 'biontech', 'ibrance',
            'lynparza', 'rometty', 'bourla', 'threadripper', 'maxpain', 'asparagus',
            'asimah', 'latte', 'dunkin', 'straws', 'flyknit', 'vapormax', 'examdumps',
            'associate', 'certified', 'ccna', 'visaincordinaryshares',
            'careerarc', 'nowdownloading', 'optionstrade', 'stockstotrade',
            'threadripper', 'jeffersontown', 'monday', 'tuesday', 'wednesday',
            'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march',
            'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november',
            'december', 'c', 'ca', 'u', 'krogercripples', 'nowdownloading', 'optionstrade',
            'stockstotrade', 'optionstrade', 'optiontrading', 'financialservices',
            'verizoncommunications', 'since'
        }
        self.colleague_stopwords = {
            'the', 'and', 'for', 'this', 'that', 'with', 'have', 'from', 'your', 'https',
            'http', 'www', 'com', 'co', 'org', 'net', 'io', 'ly', 'ly/', 'they', 'we',
            'to', 'in', 'on', 'at', 'by', 'of', 'up', 'down', 'left', 'right', 'out',
            'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
            'where', 'why', 'how', 'all', 'any', 'some', 'one', 'two', 'three', 'four',
            'five', 'six', 'seven', 'eight', 'nine', 'ten', 'market', 'markets', 'price',
            'prices', 'trade', 'trades', 'trading', 'trader', 'traders', 'investor',
            'investors', 'share', 'shareholder', 'shareholders', 'yesterday', 'tomorrow',
            'week', 'month', 'year', 'daily', 'weekly', 'monthly', 'quarterly', 'annual',
            'annually', 'day', 'morning', 'afternoon', 'evening', 'night', 'will', 'would',
            'could', 'should', 'can', 'may', 'might', 'must', 'its', 'their', 'been',
            'has', 'had', 'get', 'getting', 'goes', 'going', 'went', 'gone', 'just',
            'more', 'most', 'other', 'others', 'else', 'much', 'many', 'such', 'tweet',
            'tweets', 'rt', 'follow', 'following', 'follower', 'followers', 'post', 'posts',
            'posting', 'posted', 'user', 'users', 'account', 'accounts', 'am', 'pm', 'vs',
            'via', 'per', 'new', 'now', 'next', 'last', 'ago', 'yet', 'still', 'ever',
            'even', 'also', 'too', 'very', 'quite', 'like', 'said'
        }

        # Create a unified stopword set (forcing everything to lower-case)
        self.words_to_filter = {w.lower() for w in self.stop_words.union(
            self.company_names,
            self.tickers,
            self.extra_stopwords,
            self.colleague_stopwords
        )}

        # If stemming is enabled, build a stemmed version of the stopword set
        if self.use_stemming:
            self.stemmer = PorterStemmer()
            self.stemmed_words_to_filter = {self.stemmer.stem(w) for w in self.words_to_filter}

    def _normalize_token(self, token):
        token = token.lower()
        if token.startswith("@"):
            return "@user"
        elif token.startswith("http") or token.startswith("www"):
            return "httpurl"  # Already lower-case for consistency
        elif len(token) == 1:
            return demojize(token)
        elif token in {"’"}:
            return "'"
        elif token in {"…"}:
            return "..."
        else:
            return token

    def _normalize_tweet(self, text):
        if not isinstance(text, str):
            return ""
        text = text.replace("’", "'").replace("…", "...")
        tokens = self.tokenizer.tokenize(text)
        normalized = " ".join([self._normalize_token(t) for t in tokens])
        # Adjust common contractions and spacing
        normalized = normalized.replace("cannot ", "can not ")
        normalized = normalized.replace("n't ", " n't ")
        normalized = normalized.replace("n 't ", " n't ")
        normalized = normalized.replace("ca n't", "can't")
        normalized = normalized.replace("ai n't", "ain't")
        normalized = normalized.replace("'m ", " 'm ")
        normalized = normalized.replace("'re ", " 're ")
        normalized = normalized.replace("'s ", " 's ")
        normalized = normalized.replace("'ll ", " 'll ")
        normalized = normalized.replace("'d ", " 'd ")
        normalized = normalized.replace("'ve ", " 've ")
        normalized = normalized.replace(" p . m .", " p.m.")
        normalized = normalized.replace(" a . m .", " a.m.")
        return " ".join(normalized.split())

    def filter_stopwords(self, text):
        cleaned = self._normalize_tweet(text)
        tokens = nltk.word_tokenize(cleaned)
        # Remove punctuation and tokens that are single characters
        tokens = [word.translate(self.punctuation_table)
                  for word in tokens if word.isalpha() and len(word) > 1]
        filtered_tokens = []
        for token in tokens:
            token_lower = token.lower()
            if self.use_stemming:
                token_stem = self.stemmer.stem(token_lower)
                if token_stem not in self.stemmed_words_to_filter:
                    filtered_tokens.append(token)
            else:
                if token_lower not in self.words_to_filter:
                    filtered_tokens.append(token)
        return filtered_tokens



# class FilterStopwords:
#     def __init__(self):
#         nltk.download('stopwords')
#         nltk.download('punkt')

#         self.tokenizer = TweetTokenizer()
#         self.stop_words = set(stopwords.words('english'))
#         self.punctuation_table = str.maketrans("", "", string.punctuation)

        
#         self.company_names = {
#             'jpmorgan', 'chase', 'cisco', 'comcast', 'exxon', 'mobil', 'verizon', 'inc',
#             'walmart', 'paypal', 'holdings', 'boeing', 'nike', 'merck', 'at&t', 'kroger',
#             'pepsico', 'pfizer', 'intel', 'oracle', 'netflix', 'mcdonalds', 'amazon', 'ford',
#             'alphabet', 'mastercard', 'procter', 'gamble', 'meta', 'chevron', 'apple', 'walt',
#             'disney', 'starbucks', 'microsoft', 'johnson', 'costco', 'coca', 'cola', 'tesla'}

        
#         self.tickers = {
#             'unh', 'xom', 'meta', 'aapl', 'googl', 'nke', 'jnj', 'amzn', 'f', 'dis',
#             'ma', 'ups', 'bac', 'v', 'ba', 'intc', 'pg', 'nflx', 'tsla', 'ko', 'mcd',
#             'ibm', 'hd', 'cvx', 'vz', 'cmcsa', 'csco', 'cost', 'kr', 'msft', 'jpm',
#             'wmt', 'pypl', 't', 'sbux', 'pfe', 'pep', 'mrk', 'orcl', 'amd'}

#         # Extra noisy or common finance/spam terms
#         self.extra_stopwords = {
#             'free', 'trial', 'great', 'good', 'best', 'nice', 'better', 'win', 'strong',
#             'buy', 'sell', 'sold', 'short', 'option', 'options', 'shares', 'stock', 'stocks',
#             'investing', 'investment',  'join', 'alert', 'alerts', 'link',
#             'check', 'video', 'watch', 'time', 'today', 'love', 'hate', 'twitter', 'game', 
#             'system', 'use', 'got',
#             'windows', 'surface', 'wo', 's', 'p', 'e','make', 'take', 'go', 'know', 'say', 'see', 'look', 'want', 'back', 'nothing',
#             'team', 'group', 'core',
#              'meal', 'gear',  'documentary', 'indicator', 'volume', 'chart', 'stochastic', 'candle', 'strike', 'pullback',
#             'pattern', 'convergence', 'combo', 'momentum', 'histogram', 'grid', 'breakdown',
#             'looking', 'really', 'elon', 'people', 'musk', 'c', 'ca', 'baba', 'work', 'lol', 'mu', 'calls', 'top', 'high', 'business', 'sq', 'think', 'demand', 'maybe',

#             'dm', 'HTTPURL', 'surveycity', 'careerarc', 'optionstrade', 'optiontrading',
#             'financialservices', 'verizoncommunications', 'visaincordinaryshares',
#             'examdumps', 'associate', 'certified', 'ccna',
#         'technicalanalysis', 'elliottwave','original',
#             'jeffersontown', 'jefferies', 'oppenheimer', 'suisse', 'suntrust',
#             'unitedhealthgroup', 'biontech', 'ibrance', 'lynparza', 'rometty', 'bourla',
#             'threadripper', 'maxpain', 'asparagus', 'asimah', 
#             'latte', 'dunkin', 'straws', 'flyknit', 'vapormax', 
#             'examdump', 'examdumps', 'associate', 'certified', 'ccna', 'visaincordinaryshares',
#             'careerarc', 'nowdownloading', 'optionstrade', 'stockstotrade',
#             'threadripper', 'jeffersontown',
            
#                 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
#             'january', 'february', 'march', 'april', 'may', 'june', 'july',
#             'august', 'september', 'october', 'november', 'december', 'c', 'ca',
#             'u', 'krogercripples', 'nowdownloading', 'optionstrade', 'stockstotrade',
#             'optionstrade', 'optiontrading', 'financialservices', 'verizoncommunications',
                    
            
#         }

#         # Words from your colleague's COMMON_WORDS list
#         self.colleague_stopwords = {
#             'the', 'and', 'for', 'this', 'that', 'with', 'have', 'from', 'your', 'https', 'http',
#             'www', 'com', 'co', 'org', 'net', 'io', 'ly', 'ly/', 'they', 'we', 'to', 'in', 'on',
#             'at', 'by', 'of', 'up', 'down', 'left', 'right', 'out', 'over', 'under', 'again',
#             'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
#             'any', 'some', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
#             'ten', 'market', 'markets', 'price', 'prices', 'trade', 'trades', 'trading', 'trader',
#             'traders', 'investor', 'investors', 'share', 'shareholder', 'shareholders',
#             'yesterday', 'tomorrow', 'week', 'month', 'year', 'daily', 'weekly', 'monthly',
#             'quarterly', 'annual', 'annually', 'day', 'morning', 'afternoon', 'evening', 'night',
#             'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'its', 'their',
#             'been', 'has', 'had', 'get', 'getting', 'goes', 'going', 'went', 'gone', 'just',
#             'more', 'most', 'other', 'others', 'else', 'much', 'many', 'such', 'tweet', 'tweets',
#             'rt', 'follow', 'following', 'follower', 'followers', 'post', 'posts', 'posting',
#             'posted', 'user', 'users', 'account', 'accounts', 'am', 'pm', 'vs', 'via', 'per',
#             'new', 'now', 'next', 'last', 'ago', 'yet', 'still', 'ever', 'even', 'also', 'too',
#             'very', 'quite', 'like', 'said'}
        
#         # GPT 03 generated list
        
        
#         # unnsure about the following
#         # 1) company names and tickers that are different from the one tagged in the tweet
#         # 2) 'trial', 'great', 'good', 'best', 'nice', 'better', 'win', 'strong',
#         #    'buy', 'sell', 'sold', 'short',  'profit', 'loss', 'windows', 'surface', 'ip',


#         self.words_to_filter = self.stop_words.union(
#             self.company_names,
#             self.tickers,
#             self.extra_stopwords,
#             self.colleague_stopwords
#         )

#     def _normalize_token(self, token):
#         token = token.lower()
#         if token.startswith("@"):
#             return "@USER"
#         elif token.startswith("http") or token.startswith("www"):
#             return "HTTPURL"
#         elif len(token) == 1:
#             return demojize(token)
#         elif token in {"’"}:
#             return "'"
#         elif token in {"…"}:
#             return "..."
#         else:
#             return token

#     def _normalize_tweet(self, text):
#         if not isinstance(text, str):
#             return ""
#         text = text.replace("’", "'").replace("…", "...")
#         tokens = self.tokenizer.tokenize(text)
#         normalized = " ".join([self._normalize_token(t) for t in tokens])

#         # Handle contractions and phrasing
#         normalized = normalized.replace("cannot ", "can not ")
#         normalized = normalized.replace("n't ", " n't ")
#         normalized = normalized.replace("n 't ", " n't ")
#         normalized = normalized.replace("ca n't", "can't")
#         normalized = normalized.replace("ai n't", "ain't")
#         normalized = normalized.replace("'m ", " 'm ")
#         normalized = normalized.replace("'re ", " 're ")
#         normalized = normalized.replace("'s ", " 's ")
#         normalized = normalized.replace("'ll ", " 'll ")
#         normalized = normalized.replace("'d ", " 'd ")
#         normalized = normalized.replace("'ve ", " 've ")
#         normalized = normalized.replace(" p . m .", " p.m.")
#         normalized = normalized.replace(" a . m .", " a.m.")

#         return " ".join(normalized.split())

#     def filter_stopwords(self, text):
#         cleaned = self._normalize_tweet(text)
#         tokens = nltk.word_tokenize(cleaned)
#         tokens = [word.translate(self.punctuation_table) for word in tokens if word.isalpha()]
#         return [word for word in tokens if word.lower() not in self.words_to_filter]

# all_words_2 = [
#     'looking', 'really', 'elon', 'people', 'musk', 'c', 'ca', 'baba', 'work', 'lol', 'mu', 'calls', 'top', 'high', 'business', 'sq', 'think', 'demand', 'maybe',
#     'nvda', 'shorts', 'company', 'goog', 'gs', 'says', 'selling', 'never', 'buying', 'sales', 'spx', 'ceo', 'try', 'profit', 'fb', 'bad', 'twtr', 'fraud', 'sec', 'tslaq', 'bidu',
#     'ge', 'management', 'china', 'sure', 'cash', 'research', 'news', 'dia', 'well', 'stake', 'gld', 'wfc', 'finance', 'higher', 'money', 'app', 'active', 'low', 'patent', 'ip',
#     'stockmarket', 'vix', 'roku', 'djia', 'u', 'iphone', 'bullish', 'tech', 'room', 'ios',
#     'read', 'value', 'bezos', 'retail', 'trump', 'offering', 'since', 'bought', 'gold', 'tlt', 'alexa', 'gs', 'ndx', 'making', 'guides', 'growth', 'slv',
#     'youtube', 'gild', 'swing', 'sign', 'search', 'data', 'miss', 'faang', 'fang', 'snap', 'google', 'update', 'rating', 'facebook', 'cat', 'feed',
#     'rose', 'declined', 'flow', 'btc', 'cut', 'HTTPURL', 'xbox', 'chk', 'asset', 'jd', 'target', 'nok',
#     'brett', 'monday', 'sen', 'credible', 'saying', 'show', 'story', 'wants', 'let', 'assaulted', 'ms', 'assault', 'alleged', 'breaking', 'sexual',
#     'forward', 'judge', 'made', 'remember', 'hearing', 'w', 'first', 'democrats', 'senator', 'fbi', 'lying', 'thank', 'republicans', 'thursday', 'gop', 'h', 'testimony',
#     'come', 'big', 'movie', 'florida', 'hold', 'shanghai', 'world', 'dividend', 'closed', 'opening', 'nickelodeon', 'coronavirus', 'disneyland', 'james', 'mouse',
#     'long', 'streaming', 'gunn', 'earnings', 'coming', 'covid', 'years', 'favorite', 'theme', 'call', 'park', 'reopen', 'parks', 'cases', 'network', 'put', 'reopening', 'close',
#     'stop', 'ads', 'companies', 'ad', 'india', 'support', 'highs', 'social', 'zuckerberg', 'open', 'breakout', 'media', 'us', 'move', 'speech', 'boycott', 'platform', 'mark', 'advertisers', 'break', 'advertising',
#     'lost', 'react', 'flyknit', 'burn', 'police', 'air', 'donate', 'women', 'red', 'way', 'boycotting', 'white', 'purchase', 'adidas', 'sale', 'presto', 'force',
#     'something', 'making', 'socks', 'made', 'max', 'vapormax', 'men', 'clothes', 'burning', 'available', 'shoes', 'dm',
#     'chill', 'shows', 'fav', 'already', 'please', 'na', 'full', 'spotify', 'access', 'watching', 'tv', 'minecraft', 'original', 'need', 'film', 'black', 'premium', 'loved', 'movies',
#     'security', 'moving', 'committee', 'turned', 'military', 'negative', 'chair', 'russian', 'guidance', 'indicators', 'community', 'maxpain', 'daytrading', 'pc', 'b', 'samsung', 'obama', 'technical', 'brennan', 'optionsflow', 'positive', 'senate', 'interest',
#     'technicalanalysis', 'provision', 'july', 'june', 'sentiment', 'score', 'odds', 'income', 'form', 'lower', 'loss', 'small', 'beat', 'filed', 'credit', 'view', 'delayed',
#     'nelson', 'r', 'toilet', 'paper', 'bollinger', 'hygiene', 'reports', 'expiration', 'peltz', 'cont', 'increase', 'cfo', 'volatility', 'longerterm',
#     'added', 'position', 'term', 'bank', 'paying', 'start', 'filing', 'paid', 'elliottwave',
#     'gift', 'hiring', 'al', 'bitcoin', 'cup', 'order', 'dunkin', 'latte', 'straws', 'kuwait', 'asimah', 'city', 'refugees', 'called', 'plastic',
#     'shopping', 'car', 'reuters', 'visa', 'bmw', 'stores', 'little', 'find', 'food', 'woman', 'online', 'ebay',
#     'pay', 'surveycity', 'usd', 'click', 'someone', 'ends', 'minutes', 'hi', 'working', 'dar', 'serious', 'anyone', 'lucky', 'cbs', 'fast', 'using', 'accept', 'friend', 'away', 'en', 'retweets', 'enter', 'hours', 'ready',
#     'risk', 'financialservices', 'zone', 'boa', 'fundamental', 'place', 'jun', 'loan', 'premium',
#     'biontech', 'treatment', 'trials', 'potential', 'nct', 'candidate', 'study', 'primary', 'play', 'early', 'months', 'rsi', 'breast', 'ibrance', 'bourla', 'clinical',
#     'act', 'heroes', 'financial', 'visaincordinaryshares', 'second', 'travel', 'expiration', 'david',
#     'enters', 'taking', 'expected', 'showing', 'weekend', 'midday', 'decline', 'ended', 'cycle', 'box',
#     'medical', 'billion', 'j', 'analysts', 'talc', 'healthcare', 'talks', 'revenue', 'raises', 'report', 'drug', 'devices', 'cuts',
#     'beautiful', 'threadripper', 'confirms', 'servers', 'current', 'timeframe', 'area', 'fair', 'spotted', 'near', 'trying', 'chip', 'direction', 'based', 'stockstotrade', 'guys', 'leak', 'pierre', 'decent', 'signals', 'lenovo', 'center', 'fundamentals', 'milan', 'expectations',
#     'tuesday', 'snacks', 'zone', 'coke', 'lead', 'pepsi', 'brands', 'results', 'currently', 'drink',
#     'burger', 'eat', 'happy', 'fries', 'sony', 'mac', 'job', 'never', 'every', 'workers', 'ai',
#     'throttled', 'support', 'wireless', 'bluejeans', 'service', 'macd', 'line', 'services', 'internet', 'evp', 'wildfire', 'department', 'verizoncommunications', 'chief',
#     'avg', 'pandemic', 'later', 'social', 'way', 'globally', 'decline', 'global', 'overbought', 'far', 'add', 'impact',
#     'optionstrade', 'point', 'roe', 'information', 'poor', 'ref', 'visit', 'neutral', 'roa', 'optiontrading', 'noticeable', 'nyse', 'weak', 'satellites',
#     'trend', 'jefferies', 'friday', 'analyst', 'wednesday', 'details', 'canada', 'royal', 'oppenheimer', 'improving', 'foundation', 'perform', 'major',
#     'lynparza', 'application', 'oks', 'line', 'lowers', 'common', 'receives',
#     'setup', 'misses', 'unitedhealthgroup', 'performance', 'suisse', 'incorporated', 'band', 'suntrust', 'pledges', 'residents', 'results', 'banks',
#     'worst', 'appearances', 'holding', 'breakout', 'excellent', 'resistance',
#     'implied', 'communication', 'makes', 'flow', 'studios', 'disappear', 'lmao', 'divisions', 'communications', 'suddenly', 'theme', 'struggles', 'technology', 'dropped', 'feeling', 'lockdown',
#     'leading', 'change', 'international', 'machines', 'leader', 'rometty', 'design', 'stellar', 'drive', 'x',
#     'crying', 'id', 'discount', 'capital', 'sorry', 'everything', 'photo', 'corporation',
#     'morgan', 'venezuela', 'increases', 'macd', 'divergence', 'downgraded', 'march',
#     'man', 'companies', 'software', 'essentials', 'talk', 'set', 'concert', 'players', 'sap', 'oakland', 'reading',
#     'life', 'labor', 'fedex', 'transportation', 'truck', 'openings', 'delivery', 'galaxy', 'mcdonald', 'parcel', 'drivers', 'future', 'latest', 'downs', 'deliver', 'careerarc', 'always', 'thanks',
#     'optionstrade', 'become', 'provider', 'inspiring', 'help', 'routing', 'networking', 'services', 'leaders', 'nowdownloading', 'unified', 'examdump', 'ip', 'associate', 'certified', 'ccna', 'examdumps', 'anything',
#     'deals', 'tried', 'due', 'church', 'outskirts', 'killed', 'concern', 'beats', 'shooting', 'round', 'jeffersontown', 'loudest'
# ]
