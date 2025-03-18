import pandas as pd
import json

# Path to the compressed CSV file
csv_path = r"C:\Users\Clover\Documents\GitHub\DVA_Team_173\data_full\raw\twitter_data\stocktwits_sample.csv.gz"

# Load CSV
df = pd.read_csv(csv_path, compression='gzip')

# Keep only relevant columns
df = df[['author', 'author_followers', 'sentiment', 'text', 'tickers', 'sentiment_score']]

# Drop NaNs in 'sentiment' column
df = df.dropna(subset=['sentiment'])

# Convert 'sentiment' column from JSON-like to just "Bullish" or "Bearish"
df['sentiment'] = df['sentiment'].apply(lambda x: eval(x)['basic'] if isinstance(x, str) else None)

# Select top 5 positive and negative words based on author followers
# positive_df = df[df['sentiment'] == "Bullish"].nlargest(5, 'author_followers')
# negative_df = df[df['sentiment'] == "Bearish"].nlargest(5, 'author_followers')

# Merge data
# top_words = pd.concat([positive_df, negative_df])

# Format data
data = [
    {
        "word": row["text"].split()[0],  # First word as keyword (simplification)
        "score": row["sentiment_score"],
        "sentiment": "positive" if row["sentiment"] == "Bullish" else "negative",
        "text": row["text"]
    }
    for _, row in df.iterrows()
]

# Save as JSON
# json_path = "data/word_cloud_data.json"
json_path = r"C:\Users\Clover\Documents\GitHub\DVA_Team_173\data_full\word_cloud_data.json"
with open(json_path, "w") as f:
    json.dump(data, f, indent=4)

print(f"✅ JSON saved to {json_path}")
