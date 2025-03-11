# from torch.utils.data import Dataset
# import torch
# from TweetNormalizer import normalizeTweet

# class TweetDataset(Dataset):
#     def __init__(self, tweets, scores, tokenizer, max_len=128):
#         self.tweets = tweets
#         self.scores = scores
#         self.tokenizer = tokenizer
#         self.max_len = max_len

#     def __len__(self):
#         return len(self.tweets)

#     def __getitem__(self, idx):
#         tweet = str(self.tweets[idx])
#         score = float(self.scores[idx])
#         # Normalize the tweet
#         normalized_tweet = normalizeTweet(tweet)

#         encoding = self.tokenizer(
#             normalized_tweet,
#             max_length=self.max_len,
#             padding="max_length",
#             truncation=True,
#             return_tensors="pt"
#         )
#         return {
#             "input_ids": encoding["input_ids"].squeeze(0),
#             "attention_mask": encoding["attention_mask"].squeeze(0),
#             # IMPORTANT: The Trainer expects "labels", not "score"
#             "labels": torch.tensor(score, dtype=torch.float),
#         }
from torch.utils.data import Dataset
import torch
from TweetNormalizer import normalizeTweet

class TweetDataset(Dataset):
    def __init__(self, tweets, scores=None, tokenizer=None, max_len=128):
        self.tweets = tweets
        self.scores = scores  # Now optional for inference
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.tweets)

    def __getitem__(self, idx):
        tweet = str(self.tweets[idx])
        normalized_tweet = normalizeTweet(tweet)

        encoding = self.tokenizer(
            normalized_tweet,
            max_length=self.max_len,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        )

        item = {
            "input_ids": encoding["input_ids"].squeeze(0),
            "attention_mask": encoding["attention_mask"].squeeze(0),
        }

        # Add labels if they exist (for training)
        if self.scores is not None:
            item["labels"] = torch.tensor(float(self.scores[idx]), dtype=torch.float)

        return item
