# https://huggingface.co/docs/transformers/en/model_doc/bertweet
# https://huggingface.co/vinai/bertweet-large
# https://github.com/VinAIResearch/BERTweet
# https://huggingface.co/finiteautomata/bertweet-base-sentiment-analysis

# import libraries
import torch
from transformers import AutoModel, AutoTokenizer
from TweetNormalizer import normalizeTweet
import torch.nn as nn
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Load pre-trained BERTweet model
class BERTweetSentimentRegressor(nn.Module):
    def __init__(self, model_name="finiteautomata/bertweet-base-sentiment-analysis", output_type="mean"):
        super(BERTweetSentimentRegressor, self).__init__()
        self.output_type = output_type
        # Load pre-trained sentiment classification model
        self.bertweet = AutoModelForSequenceClassification.from_pretrained(model_name)
        
        # Replace classification head (3 classes) with a single regression output
        self.regressor = nn.Linear(self.bertweet.config.hidden_size, 1)
    
    def forward(self, input_ids, attention_mask):
        outputs = self.bertweet.roberta(input_ids=input_ids, attention_mask=attention_mask)
        if self.output_type=="mean":
            pooled_output = outputs.last_hidden_state.mean(dim=1)
        else:
            pooled_output = outputs.last_hidden_state[:, 0, :]  # Use [CLS] token representation
        score = self.regressor(pooled_output)  # Output a single sentiment score
        return score
    
if __name__ == "__main__":
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained("finiteautomata/bertweet-base-sentiment-analysis")

    # Sample tweet
    tweet = "Fuck APPLE they suck so bad. Totally regret 😢 "
    tweet = "OMG APPLE IS SO GOOD, I LOVE THEM!!!! "
    

    # Normalize tweet
    normalized_tweet = normalizeTweet(tweet)
    print(f"Normalized Tweet: {normalized_tweet}")

    # Tokenize input
    inputs = tokenizer(normalized_tweet, return_tensors="pt", padding=True, truncation=True, max_length=512)

    # Load model
    model = BERTweetSentimentRegressor()

    # Run model on input
    with torch.no_grad():
        sentiment_score = model(
            input_ids=inputs["input_ids"], 
            attention_mask=inputs["attention_mask"]
        )

    # Print the continuous sentiment score
    print(f"Predicted Sentiment Score: {sentiment_score.item()}")