"""
KrishiMitra AI - Evaluation Metrics Utilities
Computes binary classification metrics: Accuracy, Precision, Recall, F1 Score, and Confusion Matrix.
"""

from typing import List, Dict, Any, Union


def compute_confusion_matrix(y_true: List[int], y_pred: List[int]) -> Dict[str, int]:
    """
    Computes binary 2x2 confusion matrix counts.
    Mapping: Fresh = 0 (Negative), Rotten = 1 (Positive).
    
    Returns:
    - TN: True Fresh
    - FP: False Rotten (Fresh misclassified as Rotten)
    - FN: False Fresh (Rotten misclassified as Fresh)
    - TP: True Rotten
    """
    tn = fp = fn = tp = 0
    for true, pred in zip(y_true, y_pred):
        if true == 0 and pred == 0:
            tn += 1
        elif true == 0 and pred == 1:
            fp += 1
        elif true == 1 and pred == 0:
            fn += 1
        elif true == 1 and pred == 1:
            tp += 1

    return {
        "TN": tn,
        "FP": fp,
        "FN": fn,
        "TP": tp,
        "matrix": [
            [tn, fp],
            [fn, tp]
        ]
    }


def calculate_classification_metrics(
    y_true: List[int],
    y_pred: List[int]
) -> Dict[str, Any]:
    """
    Computes all standard classification metrics from ground truth and predictions.
    
    Returns dictionary with:
    - accuracy
    - precision (macro & per-class)
    - recall (macro & per-class)
    - f1_score (macro & per-class)
    - confusion_matrix
    """
    if len(y_true) != len(y_pred):
        raise ValueError(f"Length mismatch: len(y_true)={len(y_true)} vs len(y_pred)={len(y_pred)}")

    total_samples = len(y_true)
    if total_samples == 0:
        return {}

    cm = compute_confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm["TN"], cm["FP"], cm["FN"], cm["TP"]

    # Accuracy
    accuracy = (tp + tn) / total_samples

    # Rotten (Class 1) metrics
    precision_rotten = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall_rotten = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1_rotten = (
        2 * (precision_rotten * recall_rotten) / (precision_rotten + recall_rotten)
        if (precision_rotten + recall_rotten) > 0 else 0.0
    )

    # Fresh (Class 0) metrics
    precision_fresh = tn / (tn + fn) if (tn + fn) > 0 else 0.0
    recall_fresh = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    f1_fresh = (
        2 * (precision_fresh * recall_fresh) / (precision_fresh + recall_fresh)
        if (precision_fresh + recall_fresh) > 0 else 0.0
    )

    # Macro averages
    macro_precision = (precision_fresh + precision_rotten) / 2.0
    macro_recall = (recall_fresh + recall_rotten) / 2.0
    macro_f1 = (f1_fresh + f1_rotten) / 2.0

    return {
        "total_samples": total_samples,
        "accuracy": round(accuracy, 4),
        "macro_precision": round(macro_precision, 4),
        "macro_recall": round(macro_recall, 4),
        "macro_f1": round(macro_f1, 4),
        "per_class": {
            "Fresh (0)": {
                "precision": round(precision_fresh, 4),
                "recall": round(recall_fresh, 4),
                "f1_score": round(f1_fresh, 4),
                "support": tn + fp
            },
            "Rotten (1)": {
                "precision": round(precision_rotten, 4),
                "recall": round(recall_rotten, 4),
                "f1_score": round(f1_rotten, 4),
                "support": tp + fn
            }
        },
        "confusion_matrix": cm["matrix"]
    }
