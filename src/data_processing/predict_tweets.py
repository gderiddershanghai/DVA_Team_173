import os
import torch
import pandas as pd
from transformers import AutoTokenizer
from safetensors.torch import load_model
from dataset_loader import TweetDataset
from tweet_bert_finetune import BERTweetSentimentRegressor


# CHANGE THIS TO YOURS IF YOU WANT TO RUN
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
    print('WRONG COLUMN NAME')

if "predicted_score" in df.columns:
    df = df[df["predicted_score"].isna()].reset_index(drop=True)
print(f"Filtered dataset, remaining rows to predict: {len(df)}")

print("_________________________________________________")

tokenizer = AutoTokenizer.from_pretrained(checkpoint_path)

model = BERTweetSentimentRegressor()
model.to(device)
load_model(model, os.path.join(checkpoint_path, "model.safetensors"))

# model.half() / don't do it, just run on cuda and its super fast

if hasattr(torch, "compile"):
    model = torch.compile(model)

model.eval()

tweet_texts = df["full_text"].tolist()
dataset = TweetDataset(
    tweets=tweet_texts,
    scores=None,
    tokenizer=tokenizer,
    max_len=128)

print("loaded dataset for preds")
def predict_tweets_and_save(model, dataset, df, output_path, save_interval=10000):
    batch_size = 32
    dataloader = torch.utils.data.DataLoader(
        dataset, batch_size=batch_size, shuffle=False, pin_memory=True, num_workers=4)
    
    result_df = df.copy()
    
    
    
    # copied from tweet_bert_finetune.py
    if os.path.exists(output_path):
        backup_path = output_path + ".bak"
        os.rename(output_path, backup_path)
        print(f"Backed up existing file to {backup_path}")
    
    # VERY IMPORTANT OR IT WILL SKIP
    processed_idx = 0
    last_saved_idx = 0
    
    with torch.no_grad():
        for i, batch in enumerate(dataloader):
            input_ids = batch["input_ids"].to(device).long()  
            attention_mask = batch["attention_mask"].to(device).half()  

            outputs = model(input_ids=input_ids, attention_mask=attention_mask).squeeze()
            
            # Handle both batch and single-item outputs
            if outputs.dim() == 0:  
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
                print(f"---------------------------------processed {processed_idx} tweets")
            
            # SAVE
            if processed_idx - last_saved_idx >= save_interval:
                save_slice = result_df.iloc[last_saved_idx:processed_idx]
                
                # only write heaedr first pass
                mode = "w" if last_saved_idx == 0 else "a"
                header = last_saved_idx == 0
                
                save_slice.to_csv(output_path, mode=mode, header=header, index=False)
                print(f"did rows {last_saved_idx} thru {processed_idx}")
                
                last_saved_idx = processed_idx
    
    # save ramaing rows
    if processed_idx > last_saved_idx:
        save_slice = result_df.iloc[last_saved_idx:processed_idx]
        mode = "w" if last_saved_idx == 0 else "a"
        header = last_saved_idx == 0
        
        save_slice.to_csv(output_path, mode=mode, header=header, index=False)
        print("had some more rows")
    
    print(f"preds saved to saved to {output_path}")
    return result_df

df_with_predictions = predict_tweets_and_save(model, dataset, df, output_path)
print(df_with_predictions.tail())
print('og shaope:', df.shape, 'new shape:', df_with_predictions.shape)
