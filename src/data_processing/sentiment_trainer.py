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
        Override the default loss to MSE for regression
        Accept **kwargs to handle extra parameters.
        """
        labels = inputs.get("labels")  # Should be a float tensor
        outputs = model(
            input_ids=inputs["input_ids"], 
            attention_mask=inputs["attention_mask"]
        )
        return (F.mse_loss(outputs, labels.float()), outputs) if return_outputs else F.mse_loss(outputs, labels.float())


def main():
    # Paths
    train_fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/training_data/train_df.csv"
    test_fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/training_data/test_df.csv"
    model_weights_fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/weights"
    os.makedirs(model_weights_fp, exist_ok=True)

    # Read CSVs
    train_df = pd.read_csv(train_fp)
    test_df = pd.read_csv(test_fp)

    # Drop rows with missing scores
    train_df.dropna(subset=["score"], inplace=True)
    test_df.dropna(subset=["score"], inplace=True)

    # Convert score column to numeric just in case there are hidden strings
    train_df["score"] = pd.to_numeric(train_df["score"], errors="coerce")
    test_df["score"] = pd.to_numeric(test_df["score"], errors="coerce")
    train_df.dropna(subset=["score"], inplace=True)
    test_df.dropna(subset=["score"], inplace=True)

    print("Loaded the data.")
    print("Train rows:", len(train_df))
    print("Test rows:", len(test_df))

    # Create Datasets
    tokenizer = AutoTokenizer.from_pretrained("finiteautomata/bertweet-base-sentiment-analysis")
    train_dataset = TweetDataset(
        tweets=train_df["text"].tolist(),
        scores=train_df["score"].tolist(),
        tokenizer=tokenizer,
        max_len=128
    )
    test_dataset = TweetDataset(
        tweets=test_df["text"].tolist(),
        scores=test_df["score"].tolist(),
        tokenizer=tokenizer,
        max_len=128
    )

    # Data Collator
    data_collator = DataCollatorWithPadding(tokenizer)

    # Model
    model = BERTweetSentimentRegressor()

    # Training arguments
    # Note: evaluation_strategy="no" => no mid-training evaluation
    #       save_strategy="epoch" => saves model after each epoch
    #       remove_unused_columns=False => keep 'labels' in batch
    training_args = TrainingArguments(
        output_dir="./bertweet_regressor",
        num_train_epochs=3,
        per_device_train_batch_size=8,
        learning_rate=2e-5,
        weight_decay=0.01,
        
        # No evaluation during training
        evaluation_strategy="no",
        
        # Still save each epoch
        save_strategy="epoch",
        logging_strategy="epoch",
        
        remove_unused_columns=False,
        load_best_model_at_end=False,  # No "best" model if we never evaluate
    )

    # Create our custom trainer (no eval_dataset)
    trainer = RegressionTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        data_collator=data_collator,
        tokenizer=tokenizer,
    )

    # Train
    trainer.train()

    # Save final model
    trainer.save_model(model_weights_fp)

    # Generate predictions on train & test sets, save to CSV
    def save_predictions_results(dataset, dataset_name, output_dir):
        predictions = trainer.predict(dataset)
        pred_scores = predictions.predictions  # shape: (batch_size,)
        true_scores = predictions.label_ids     # shape: (batch_size,)
        errors = abs(pred_scores - true_scores)

        results_df = pd.DataFrame({
            "index": range(len(pred_scores)),
            "true_score": true_scores,
            "predicted_score": pred_scores,
            "absolute_error": errors
        })

        output_fp = os.path.join(output_dir, f"{dataset_name}_errors.csv")
        results_df.to_csv(output_fp, index=False)
        print(f"{dataset_name.capitalize()} errors saved to {output_fp}")

    # Save predictions for train & test sets
    save_predictions_results(train_dataset, "train", model_weights_fp)
    # save_predictions_results(test_dataset, "test", model_weights_fp)


if __name__ == "__main__":
    main()





# # train_fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/training_data/train_df.csv"
# # test_fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/training_data/test_df.csv"
# # # path to save model weights
# # model_weights_fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/weights"
# import os
# import pandas as pd
# import torch
# import torch.nn.functional as F
# from transformers import (
#     AutoTokenizer,
#     Trainer,
#     TrainingArguments,
#     DataCollatorWithPadding,
# )
# from dataset_loader import TweetDataset
# from tweet_bert_finetune import BERTweetSentimentRegressor

# class RegressionTrainer(Trainer):
#     def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
#         """
#         Override the default loss to MSE for regression
#         Accept **kwargs to handle extra parameters (e.g., num_items_in_batch).
#         """
#         # print('inputs', inputs)
#         # print(inputs.keys())
#         labels = inputs.get("labels")
#         outputs = model(
#             input_ids=inputs["input_ids"], 
#             attention_mask=inputs["attention_mask"]
#         )
#         # print(outputs,'------------------------------------')
#         # print(labels, '------------------------------------')
#         loss = F.mse_loss(outputs, labels.float())
#         return (loss, outputs) if return_outputs else loss

# def compute_metrics(eval_pred):
#     predictions, labels = eval_pred
#     mse = ((predictions - labels) ** 2).mean().item()
#     mae = abs(predictions - labels).mean().item()
#     return {
#         "eval_mse": mse,
#         "eval_mae": mae,
#     }

# def main():
#     train_fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/training_data/train_df.csv"
#     test_fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/data_full/training_data/test_df.csv"
#     model_weights_fp = "/home/ginger/code/gderiddershanghai/DVA_Team_173/weights"
    
#     os.makedirs(model_weights_fp, exist_ok=True)

#     train_df = pd.read_csv(train_fp)
#     train_df = train_df.dropna(subset=["score"])   

#     test_df = pd.read_csv(test_fp)
#     test_df = test_df.dropna(subset=["score"]) 

#     # train_df["score"] = pd.to_numeric(train_df["score"], errors="coerce")
#     # train_df = train_df.dropna(subset=["score"])
#     # test_df["score"] = pd.to_numeric(test_df["score"], errors="coerce")
#     # test_df = test_df.dropna(subset=["score"])
#     # print("Train missing after numeric conversion:", train_df["score"].isna().sum())
#     # print("Test missing after numeric conversion:", test_df["score"].isna().sum())


#     # print("Train DF columns:", train_df.columns)
#     # print("Missing in 'score':", train_df['score'].isnull().sum())
#     # print("Test DF columns:", test_df.columns)
#     # print("Missing in 'score':", test_df['score'].isnull().sum())



#     tokenizer = AutoTokenizer.from_pretrained("finiteautomata/bertweet-base-sentiment-analysis")

#     train_dataset = TweetDataset(
#         tweets=train_df["text"].tolist(),
#         scores=train_df["score"].tolist(),
#         tokenizer=tokenizer,
#         max_len=128
#     )
#     test_dataset = TweetDataset(
#         tweets=test_df["text"].tolist(),
#         scores=test_df["score"].tolist(),
#         tokenizer=tokenizer,
#         max_len=128
#     )
#     # print("Train dataset length:", len(train_dataset))
#     # print("Test dataset length:", len(test_dataset))
#     print('loaded the data')
#     # for i in range(len(train_dataset)):
#     #     item = train_dataset[i]
#     #     lbl = item["labels"]
#     #     # Check if it's None or not a float
#     #     if not torch.is_tensor(lbl):
#     #         print(f"Found non-tensor label at index {i}: {lbl}")
#     #         break
#     #     if lbl.dtype != torch.float32:
#     #         print(f"Found non-float label at index {i}: {lbl}")
#     #         break
#     #     if torch.isnan(lbl):
#     #         print(f"Found NaN label at index {i}")
#     #         break

    
#     print("Number of rows after dropping missing scores:", len(train_df))
#     train_sample = train_dataset[0]
#     print("Sample from train_dataset:", train_sample)

    

#     data_collator = DataCollatorWithPadding(tokenizer)

#     model = BERTweetSentimentRegressor()

#     training_args = TrainingArguments(
#         output_dir="./bertweet_regressor",
#         evaluation_strategy="epoch",
#         save_strategy="epoch",
#         logging_strategy="epoch",
#         num_train_epochs=3,
#         per_device_train_batch_size=8,
#         per_device_eval_batch_size=8,
#         learning_rate=2e-5,
#         remove_unused_columns=False,
#         weight_decay=0.01,
#         load_best_model_at_end=True,
#         metric_for_best_model="eval_mse",
#         greater_is_better=False,
#     )

#     # training_args = TrainingArguments(
#     #     output_dir="./bertweet_regressor",
#     #     evaluation_strategy="epoch",
#     #     save_strategy="epoch",
#     #     logging_strategy="epoch",
#     #     num_train_epochs=3,
#     #     per_device_train_batch_size=8,
#     #     per_device_eval_batch_size=8,
#     #     learning_rate=2e-5,
#     #     weight_decay=0.01,
#     #     load_best_model_at_end=True,
#     #     metric_for_best_model="eval_mse",
#     #     greater_is_better=False,
#     #     remove_unused_columns=False,
#     #     label_names=["labels"],  # Explicitly specify label name
#     # )


#     trainer = RegressionTrainer(
#         model=model,
#         args=training_args,
#         train_dataset=train_dataset,
#         # eval_dataset=test_dataset,
#         tokenizer=tokenizer,
#         data_collator=data_collator,
#         compute_metrics=compute_metrics,
#     )

#     trainer.train()
#     trainer.save_model(model_weights_fp)

#     def save_predictions_results(dataset, dataset_name, output_dir):
#         predictions = trainer.predict(dataset)
#         pred_scores = predictions.predictions
#         true_scores = predictions.label_ids
#         errors = abs(pred_scores - true_scores)

#         results_df = pd.DataFrame({
#             "index": range(len(pred_scores)),
#             "true_score": true_scores,
#             "predicted_score": pred_scores,
#             "absolute_error": errors
#         })

#         output_fp = os.path.join(output_dir, f"{dataset_name}_errors.csv")
#         results_df.to_csv(output_fp, index=False)
#         print(f"{dataset_name.capitalize()} errors saved to {output_fp}")

#     save_predictions_results(train_dataset, "train", model_weights_fp)
#     save_predictions_results(test_dataset, "test", model_weights_fp)

# if __name__ == "__main__":
#     main()
