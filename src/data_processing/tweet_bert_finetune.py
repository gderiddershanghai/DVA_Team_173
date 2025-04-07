# checked
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


# results when using the mean vector
# Test MSE: 0.0779
# Test MAE: 0.1548
# Test results saved to test_results.csv


# class and mean vectors actually perform pretty similarly
class BERTweetSentimentRegressor(nn.Module):
    def __init__(self, model_name="finiteautomata/bertweet-base-sentiment-analysis", output_type="class"):
        super(BERTweetSentimentRegressor, self).__init__()
        self.output_type = output_type
        # load pretrained model
        self.bertweet = AutoModelForSequenceClassification.from_pretrained(model_name)
        
        # use regression head isntead of classification one
        self.regressor = nn.Linear(self.bertweet.config.hidden_size, 1)
    
    def forward(self, input_ids, attention_mask, labels=None): # LABELS MESS UP THE TRAINING
        outputs = self.bertweet.roberta(input_ids=input_ids, attention_mask=attention_mask)
        if self.output_type=="mean":
            pooled_output = outputs.last_hidden_state.mean(dim=1) # use MEAN
        else:
            pooled_output = outputs.last_hidden_state[:, 0, :]  # use [CLS] token 
        score = self.regressor(pooled_output).view(-1)  
        # print('this is the shape of score:', score.shape)
        # print('this is the shape of score.view(-1)', score.view(-1).shape)
        # score = score.view(-1)
        return score
    
if __name__ == "__main__":
    
    # tweet = "Fuck APPLE they suck so bad. Totally regret 😢 "
    tweet = "OMG APPLE IS SO GOOD, I LOVE THEM!!!! "
    

    # normalize tweet
    normalized_tweet = normalizeTweet(tweet)
    print(f"tweet before : {normalized_tweet}")

    # tokenize
    tokenizer = AutoTokenizer.from_pretrained("finiteautomata/bertweet-base-sentiment-analysis")
    inputs = tokenizer(normalized_tweet, return_tensors="pt", 
                       padding=True, truncation=True, 
                       max_length=512) # can make shorter as tweets wont exceed this

    # get model
    model = BERTweetSentimentRegressor()
    with torch.no_grad():
        sentiment_score = model(input_ids=inputs["input_ids"], 
            attention_mask=inputs["attention_mask"])

    
    print(f"Predicted Score: {sentiment_score.item()}")