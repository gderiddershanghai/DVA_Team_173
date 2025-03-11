import os
import torch
import pandas as pd
from transformers import AutoTokenizer
from safetensors.torch import load_model
from dataset_loader import TweetDataset
from tweet_bert_finetune import BERTweetSentimentRegressor

# Path to the trained model checkpoint
checkpoint_path = "bertweet_regressor/checkpoint-7953"
checkpoint_path = "bertweet_regressor/checkpoint-7953"
# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(checkpoint_path)

# Initialize model
model = BERTweetSentimentRegressor()

# Load weights using `safetensors`
load_model(model, os.path.join(checkpoint_path, "model.safetensors"))

# Set model to evaluation mode
model.eval()

# Load test dataset
test_fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/training_data/test_df.csv"
test_df = pd.read_csv(test_fp)
test_df = test_df.dropna(subset=["score"])  # Ensure no missing labels

# Convert dataset to PyTorch format
test_dataset = TweetDataset(
    tweets=test_df["text"].tolist(),
    scores=test_df["score"].tolist(),
    tokenizer=tokenizer,
    max_len=128
)

# Function to evaluate model on test dataset
def evaluate_model(model, dataset):
    dataloader = torch.utils.data.DataLoader(dataset, batch_size=8, shuffle=False)
    
    predictions = []
    true_scores = []
    
    with torch.no_grad():
        for batch in dataloader:
            input_ids = batch["input_ids"]
            attention_mask = batch["attention_mask"]
            labels = batch["labels"]
            
            outputs = model(input_ids=input_ids, attention_mask=attention_mask).squeeze()
            predictions.extend(outputs.tolist())
            true_scores.extend(labels.tolist())
    
    predictions = torch.tensor(predictions)
    true_scores = torch.tensor(true_scores)
    
    # Compute evaluation metrics
    mse = torch.nn.functional.mse_loss(predictions, true_scores).item()
    mae = torch.mean(torch.abs(predictions - true_scores)).item()
    
    print(f"Test MSE: {mse:.4f}")
    print(f"Test MAE: {mae:.4f}")

    return predictions, true_scores

# Run evaluation
predictions, true_scores = evaluate_model(model, test_dataset)

# Save results to CSV
results_df = pd.DataFrame({
    "true_score": true_scores,
    "predicted_score": predictions,
    "absolute_error": abs(predictions - true_scores)
})
results_df.to_csv("test_results.csv", index=False)
print("Test results saved to test_results.csv")
