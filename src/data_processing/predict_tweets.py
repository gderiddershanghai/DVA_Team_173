import os
import torch
import pandas as pd
from transformers import AutoTokenizer
from safetensors.torch import load_model
from dataset_loader import TweetDataset
from tweet_bert_finetune import BERTweetSentimentRegressor

# Paths
checkpoint_path = "bertweet_regressor/checkpoint-7953"
data_path = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/raw/twitter_data/kaggle/tweets_remaining_09042020_16072020.csv"
output_path = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/raw/twitter_data/kaggle/tweets_predicted_09042020_16072020.csv"

# Check for GPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# Load dataset
df = pd.read_csv(data_path, delimiter=';', encoding='utf-8', on_bad_lines='skip')
print(f"Loaded {len(df)} rows from dataset.")

# Ensure "full_text" column exists
if "full_text" not in df.columns:
    raise KeyError("Column 'full_text' not found in the dataset!")

# Filter out rows where 'predicted_score' is already computed
if "predicted_score" in df.columns:
    df = df[df["predicted_score"].isna()].reset_index(drop=True)
print(f"Filtered dataset, remaining rows to predict: {len(df)}")

print("_________________________________________________")

# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(checkpoint_path)

# Initialize model
model = BERTweetSentimentRegressor()
model.to(device)

# Load trained weights using `safetensors`
load_model(model, os.path.join(checkpoint_path, "model.safetensors"))

# Set model to evaluation mode
model.eval()

# Convert dataset into a TweetDataset object (without labels)
tweet_texts = df["full_text"].tolist()
dataset = TweetDataset(
    tweets=tweet_texts,
    scores=None,  # No actual labels, just predictions
    tokenizer=tokenizer,
    max_len=128
)

print('Loaded dataset for predictions.')

# Function to predict scores for tweets
def predict_tweets_and_save(model, dataset, df, output_path, save_interval=10000):
    dataloader = torch.utils.data.DataLoader(dataset, batch_size=8, shuffle=False)
    predictions = []
    batch_size = 8  

    with torch.no_grad():
        for i, batch in enumerate(dataloader):
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask).squeeze()
            predictions.extend(outputs.cpu().tolist())

            if i % 1000 == 0:
                print(f"Processed {i * batch_size} tweets...")

            if (i + 1) * batch_size % save_interval == 0:
                start_idx = len(predictions) - save_interval
                end_idx = len(predictions)

                # Save only new predictions
                df_temp = df.iloc[start_idx:end_idx].copy()
                df_temp["predicted_score"] = predictions[start_idx:end_idx]

                # Append to file, avoiding duplicates
                df_temp.to_csv(output_path, mode="a", header=not os.path.exists(output_path), index=False)
                print(f"Saved progress: {end_idx} tweets.")

                # Remove saved predictions from memory
                del predictions[start_idx:end_idx]

    return predictions

# Run predictions
predicted_scores = predict_tweets_and_save(model, dataset, df, output_path)

# Add remaining predictions to DataFrame
df["predicted_score"] = predicted_scores

# Save final version
df.to_csv(output_path, mode="a", header=not os.path.exists(output_path), index=False)
print(f"Final predictions saved to {output_path}")
