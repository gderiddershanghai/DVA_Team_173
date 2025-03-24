import os
import torch
import pandas as pd
from transformers import AutoTokenizer
from safetensors.torch import load_model
from dataset_loader import TweetDataset
from tweet_bert_finetune import BERTweetSentimentRegressor

checkpoint_path = "bertweet_regressor/checkpoint-7953"
data_path = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/processed/large_dataset_UNLABELLED.csv"
output_path = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/processed/large_dataset_SCORES.csv"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

df = pd.read_csv(data_path, delimiter=",", encoding="utf-8", on_bad_lines="skip")
df["full_text"] = df["Tweet"]
print(f"Loaded {len(df)} rows from dataset.")

print(df.head())
print(df.tail())


if "full_text" not in df.columns:
    raise KeyError("Column 'full_text' not found in the dataset!")

if "predicted_score" in df.columns:
    df = df[df["predicted_score"].isna()].reset_index(drop=True)
print(f"Filtered dataset, remaining rows to predict: {len(df)}")

print("_________________________________________________")

tokenizer = AutoTokenizer.from_pretrained(checkpoint_path)

model = BERTweetSentimentRegressor()
model.to(device)
load_model(model, os.path.join(checkpoint_path, "model.safetensors"))

# model.half()

if hasattr(torch, "compile"):
    model = torch.compile(model)

model.eval()

tweet_texts = df["full_text"].tolist()
dataset = TweetDataset(
    tweets=tweet_texts,
    scores=None,
    tokenizer=tokenizer,
    max_len=128,
)

print("Loaded dataset for predictions.")
def predict_tweets_and_save(model, dataset, df, output_path, save_interval=10000):
    batch_size = 32
    dataloader = torch.utils.data.DataLoader(
        dataset, batch_size=batch_size, shuffle=False, pin_memory=True, num_workers=4
    )
    
    # Create a copy of the DataFrame to work with
    result_df = df.copy()
    
    # Backup existing output file if it exists
    if os.path.exists(output_path):
        backup_path = output_path + ".bak"
        os.rename(output_path, backup_path)
        print(f"Backed up existing file to {backup_path}")
    
    # Track progress
    processed_idx = 0
    last_saved_idx = 0
    
    with torch.no_grad():
        for i, batch in enumerate(dataloader):
            input_ids = batch["input_ids"].to(device).long()  
            attention_mask = batch["attention_mask"].to(device).half()  

            outputs = model(input_ids=input_ids, attention_mask=attention_mask).squeeze()
            
            # Handle both batch and single-item outputs
            if outputs.dim() == 0:  # Single item
                batch_predictions = [outputs.cpu().item()]
            else:
                batch_predictions = outputs.cpu().tolist()
            
            # Add predictions to the DataFrame at correct indices
            batch_start_idx = processed_idx
            batch_end_idx = batch_start_idx + len(batch_predictions)
            
            for j, pred in enumerate(batch_predictions):
                idx = batch_start_idx + j
                if idx < len(result_df):
                    result_df.at[idx, "predicted_score"] = pred
            
            processed_idx = batch_end_idx
            
            if i % 100 == 0:
                print(f"Processed {processed_idx} tweets...")
            
            # Save progress when we've processed enough rows
            if processed_idx - last_saved_idx >= save_interval:
                save_slice = result_df.iloc[last_saved_idx:processed_idx]
                
                # Write header only on first save
                mode = "w" if last_saved_idx == 0 else "a"
                header = last_saved_idx == 0
                
                save_slice.to_csv(output_path, mode=mode, header=header, index=False)
                print(f"Saved rows {last_saved_idx} to {processed_idx}")
                
                last_saved_idx = processed_idx
    
    # Save any remaining unsaved rows
    if processed_idx > last_saved_idx:
        save_slice = result_df.iloc[last_saved_idx:processed_idx]
        mode = "w" if last_saved_idx == 0 else "a"
        header = last_saved_idx == 0
        
        save_slice.to_csv(output_path, mode=mode, header=header, index=False)
        print(f"Saved final rows {last_saved_idx} to {processed_idx}")
    
    print(f"All predictions saved to {output_path}")
    return result_df

df_with_predictions = predict_tweets_and_save(model, dataset, df, output_path)
print(df_with_predictions.tail())
print('og shaope:', df.shape, 'new shape:', df_with_predictions.shape)
# import os
# import torch
# import pandas as pd
# from transformers import AutoTokenizer
# from safetensors.torch import load_model
# from dataset_loader import TweetDataset
# from tweet_bert_finetune import BERTweetSentimentRegressor

# # Paths
# checkpoint_path = "bertweet_regressor/checkpoint-7953"
# data_path = '/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/raw/twitter_data/big_twitter/big_filtered.csv'
# output_path = '/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/raw/twitter_data/big_twitter/big_filtered_labelled.csv'

# # Check for GPU
# device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# print(f"Using device: {device}")

# # Load dataset
# df = pd.read_csv(data_path, delimiter=',', encoding='utf-8', on_bad_lines='skip')
# df['full_text'] = df['Tweet'] # for kennys dataset
# print(f"Loaded {len(df)} rows from dataset.")

# # Ensure "full_text" column exists
# if "full_text" not in df.columns:
#     raise KeyError("Column 'full_text' not found in the dataset!")

# # Filter out rows where 'predicted_score' is already computed
# if "predicted_score" in df.columns:
#     df = df[df["predicted_score"].isna()].reset_index(drop=True)
# print(f"Filtered dataset, remaining rows to predict: {len(df)}")

# print("_________________________________________________")

# # Load tokenizer
# tokenizer = AutoTokenizer.from_pretrained(checkpoint_path)

# # Initialize model
# model = BERTweetSentimentRegressor()
# model.to(device)

# # Load trained weights using `safetensors`
# load_model(model, os.path.join(checkpoint_path, "model.safetensors"))

# # Set model to evaluation mode
# model.eval()

# # Convert dataset into a TweetDataset object (without labels)
# tweet_texts = df["full_text"].tolist()
# dataset = TweetDataset(
#     tweets=tweet_texts,
#     scores=None,  # No actual labels, just predictions
#     tokenizer=tokenizer,
#     max_len=128
# )

# print('Loaded dataset for predictions.')

# # Function to predict scores for tweets
# def predict_tweets_and_save(model, dataset, df, output_path, save_interval=10000):
#     dataloader = torch.utils.data.DataLoader(dataset, batch_size=32, shuffle=False)
#     predictions = []
#     batch_size = 8  

#     with torch.no_grad():
#         for i, batch in enumerate(dataloader):
#             input_ids = batch["input_ids"].to(device)
#             attention_mask = batch["attention_mask"].to(device)

#             outputs = model(input_ids=input_ids, attention_mask=attention_mask).squeeze()
#             predictions.extend(outputs.cpu().tolist())

#             if i % 1000 == 0:
#                 print(f"Processed {i * batch_size} tweets...")

#             if (i + 1) * batch_size % save_interval == 0:
#                 start_idx = len(predictions) - save_interval
#                 end_idx = len(predictions)

#                 # Save only new predictions
#                 df_temp = df.iloc[start_idx:end_idx].copy()
#                 df_temp["predicted_score"] = predictions[start_idx:end_idx]

#                 # Append to file, avoiding duplicates
#                 df_temp.to_csv(output_path, mode="a", header=not os.path.exists(output_path), index=False)
#                 print(f"Saved progress: {end_idx} tweets.")

#                 # Remove saved predictions from memory
#                 del predictions[start_idx:end_idx]

#     return predictions

# # Run predictions
# predicted_scores = predict_tweets_and_save(model, dataset, df, output_path)

# # Add remaining predictions to DataFrame
# df["predicted_score"] = predicted_scores

# # Save final version
# df.to_csv(output_path, mode="a", header=not os.path.exists(output_path), index=False)
# print(f"Final predictions saved to {output_path}")
