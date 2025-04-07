# checked
import os
import pandas as pd
import torch
import torch.nn.functional as F
from transformers import (
    AutoTokenizer,
    Trainer,
    TrainingArguments,
    DataCollatorWithPadding,
)
from dataset_loader import TweetDataset
from tweet_bert_finetune import BERTweetSentimentRegressor


class RegressionTrainer(Trainer):
    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        """
        override default loss since most losses are below 1, we use MAE isntead
        """
        labels = inputs.get("labels")  # SHOULD BE FLOAT TENSOR
        # print('labels', labels)
        outputs = model(
            input_ids=inputs["input_ids"], 
            attention_mask=inputs["attention_mask"])
        return (F.mse_loss(outputs, labels.float()), outputs) if return_outputs else F.mse_loss(outputs, labels.float())


def main():
    # I know this is a bit of a mess, sorry!
    train_fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/training_data/train_df.csv"
    test_fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/training_data/test_df.csv"
    model_weights_fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/weights"
    os.makedirs(model_weights_fp, exist_ok=True)

    ############################### loading and preprocessing data
    train_df = pd.read_csv(train_fp)
    test_df = pd.read_csv(test_fp)
    train_df.dropna(subset=["score"], inplace=True)
    test_df.dropna(subset=["score"], inplace=True)
    train_df["score"] = pd.to_numeric(train_df["score"], errors="coerce")
    test_df["score"] = pd.to_numeric(test_df["score"], errors="coerce")
    train_df.dropna(subset=["score"], inplace=True)
    test_df.dropna(subset=["score"], inplace=True)

    print("Loaded data")
    print("train rows ", len(train_df))
    print("test rows ", len(test_df))

    # create datasets
    tokenizer = AutoTokenizer.from_pretrained("finiteautomata/bertweet-base-sentiment-analysis")
    train_dataset = TweetDataset(
        tweets=train_df["text"].tolist(),
        scores=train_df["score"].tolist(),
        tokenizer=tokenizer,
        max_len=128) # short tweets, 128 is enough
    
    # ended up not using this because it kept breaking my code and couldnt figure out why
    test_dataset = TweetDataset(
        tweets=test_df["text"].tolist(),
        scores=test_df["score"].tolist(),
        tokenizer=tokenizer,
        max_len=128
    )


    data_collator = DataCollatorWithPadding(tokenizer)
    model = BERTweetSentimentRegressor()
    print("loaded bert")

    training_args = TrainingArguments(
        output_dir="./bertweet_regressor",
        num_train_epochs=3,
        per_device_train_batch_size=8,
        learning_rate=2e-5,
        weight_decay=0.01,
        
        # no eval, it keeps breaking
        evaluation_strategy="no",
        
        # save each epoch just in case
        save_strategy="epoch",
        logging_strategy="epoch",
        
        remove_unused_columns=False,
        load_best_model_at_end=False,  # no "best" model if we never evaluate
    )

    trainer = RegressionTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        data_collator=data_collator,
        tokenizer=tokenizer,)

    trainer.train()
    trainer.save_model(model_weights_fp)

    # save preds for inspections
    def save_predictions_results(dataset, dataset_name, output_dir):
        predictions = trainer.predict(dataset) ###################
        pred_scores = predictions.predictions  # check shape ####
        true_scores = predictions.label_ids     ####################
        errors = abs(pred_scores - true_scores) # mae

        results_df = pd.DataFrame({
            "index": range(len(pred_scores)),
            "true_score": true_scores,
            "predicted_score": pred_scores,
            "absolute_error": errors})

        output_fp = os.path.join(output_dir, f"{dataset_name}_errors.csv")
        results_df.to_csv(output_fp, index=False)
        print(f"{dataset_name.capitalize()} errors saved to {output_fp}")

    # save preds for inspections
    save_predictions_results(train_dataset, "train", model_weights_fp)
    # save_predictions_results(test_dataset, "test", model_weights_fp)


if __name__ == "__main__":
    main()

