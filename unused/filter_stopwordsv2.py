import spacy
import re
from typing import List


class FilterStopwords:
    def __init__(self, test_mode: bool = True):
        # Load spaCy English tokenizer only
        self.nlp = spacy.load("en_core_web_sm", disable=["ner", "parser", "tagger"])

        # Base stopwords
        self.spacy_stopwords = self.nlp.Defaults.stop_words

        # Add domain-specific company names and tickers
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

        self.custom_stopwords = self.spacy_stopwords.union(self.company_names).union(self.tickers)

        if test_mode:
            self._test_batch()

    def _clean_text(self, text: str) -> str:
        if not isinstance(text, str):
            return ""
        # Remove URLs, mentions, numbers, symbols
        text = re.sub(r"http\S+", "", text)
        text = re.sub(r"@\w+", "", text)
        text = re.sub(r"\S*\d+\S*", "", text)
        text = text.strip()
        return text

    def filter_stopwords(self, text: str) -> List[str]:
        cleaned = self._clean_text(text)
        if not cleaned:
            return []

        doc = self.nlp(cleaned)
        return [
            token.text.lower() for token in doc
            if token.is_alpha and
               not token.is_stop and
               token.text.lower() not in self.custom_stopwords
        ]

    def filter_many(self, texts: List[str], verbose: bool = False) -> List[List[str]]:
        # Pre-clean and filter out empties
        cleaned_texts = [self._clean_text(t) for t in texts if isinstance(t, str) and t.strip()]
        if verbose:
            print(f"✅ {len(cleaned_texts)} non-empty tweets to process.")

        results = []
        for i, doc in enumerate(self.nlp.pipe(cleaned_texts, batch_size=1000)):
            if verbose and i % 1000 == 0:
                print(f"Processed {i} tweets...")
            tokens = [
                token.text.lower() for token in doc
                if token.is_alpha and
                   not token.is_stop and
                   token.text.lower() not in self.custom_stopwords
            ]
            results.append(tokens)

        return results

    def _test_batch(self):
        print("🧪 Running test batch...")
        sample = [
            "Join RobinhoodApp and get free shares now! http://stonks.link",
            "@elonmusk tweeted about $TSLA again 🚀",
            "Apple is about to announce their quarterly earnings.",
            "",
            "Check this out! http://example.com",
        ]
        cleaned = self.filter_many(sample)
        for i, (orig, filt) in enumerate(zip(sample, cleaned)):
            print(f"\nTweet {i + 1}: {orig}")
            print(f"Filtered : {filt}")
        print("✅ Test batch done.\n")
