# https://huggingface.co/docs/transformers/en/model_doc/bertweet
# https://huggingface.co/vinai/bertweet-large
# https://github.com/VinAIResearch/BERTweet

# import libraries
import torch
from transformers import AutoModel, AutoTokenizer
from TweetNormalizer import normalizeTweet


# preprocess normalize tweets

tokenizer = AutoTokenizer.from_pretrained("vinai/bertweet-large")
line = normalizeTweet("Dont buy apple stock it fucking sucks ass. Totally regret 😢")
print("Print Testing", line)

input_ids = torch.tensor([tokenizer.encode(line)])
# import tokenizer
# bertweet = AutoModel.from_pretrained("vinai/bertweet-large")