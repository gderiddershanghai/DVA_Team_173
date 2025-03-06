from torch.utils.data import Dataset
import torch
from TweetNormalizer import normalizeTweet

class TweetDataset(Dataset):
    def __init__(self, tweets, scores=None, tokenizer=None, max_len=128):
        """
        Args:
            tweets (list): List of tweet strings.
            scores (list, optional): List of continuous sentiment scores.
                                     If None, the dataset is treated as unlabeled.
            tokenizer: Hugging Face tokenizer.
            max_len (int): Maximum token length.
        """
        self.tweets = tweets
        self.scores = scores
        self.tokenizer = tokenizer
        self.max_len = max_len
        self.has_labels = scores is not None

    def __len__(self):
        return len(self.tweets)

    def __getitem__(self, index):
        tweet = str(self.tweets[index])

        normalized_tweet = normalizeTweet(tweet)
        encoding = self.tokenizer(
            normalized_tweet,
            max_length=self.max_len,
            padding='max_length',
            truncation=True,
            return_tensors="pt"
        )
        item = {
            'input_ids': encoding['input_ids'].squeeze(0),
            'attention_mask': encoding['attention_mask'].squeeze(0)
        }
        if self.has_labels:
            # For training data, include the continuous sentiment score
            item['score'] = torch.tensor(self.scores[index], dtype=torch.float)
        return item
