from flask import Flask, request, jsonify
import pandas as pd

app = Flask(__name__)

# Load dataset (modify the path accordingly)
CSV_PATH = r"C:\Users\Clover\Documents\GitHub\DVA_Team_173\data_full\raw\twitter_data\stocktwits_sample.csv.gz"

df = pd.read_csv(CSV_PATH, compression='gzip')

@app.route('/tweets', methods=['GET'])
def get_tweets():
    ticker = request.args.get('ticker', '').upper()
    
    if not ticker:
        return jsonify({"error": "Please provide a stock ticker"}), 400

    # Filter tweets for the requested stock ticker
    stock_tweets = df[df['tickers'].str.contains(ticker, na=False, case=False)]
    
    if stock_tweets.empty:
        return jsonify({"error": "No tweets found for this stock"}), 404

    # Extract top 5 bullish & bearish words based on author followers
    bullish = stock_tweets[stock_tweets['sentiment'].str.contains("Bullish", na=False)]
    bearish = stock_tweets[stock_tweets['sentiment'].str.contains("Bearish", na=False)]
    
    
    def extract_top_words(group, sentiment_label):
        top_words = (group.nlargest(5, 'author_followers')
                          [['text', 'sentiment_score', 'author_followers']]
                          .apply(lambda row: {
                              "word": row["text"].split()[0],  # Just pick the first word as an example
                              "text": row["text"],
                              "sentiment_score": row["sentiment_score"],
                              "sentiment": sentiment_label
                          }, axis=1)
                          .tolist())
        return top_words

    positive_words = extract_top_words(bullish, "positive")
    negative_words = extract_top_words(bearish, "negative")

    return jsonify({"positive": positive_words, "negative": negative_words})

if __name__ == '__main__':
    app.run(debug=True, port=8000)
