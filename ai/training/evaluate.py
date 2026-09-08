"""
KrishiMitra AI - Model Evaluation Pipeline
Evaluates the Quality Grader on validation or unseen test datasets.
"""

from typing import Dict, Any, Tuple, List, Optional
from ai.utils.metrics import calculate_classification_metrics


def evaluate_model(
    model: Any,
    data_loader: Any,
    criterion: Optional[Any] = None,
    device: str = "cpu"
) -> Dict[str, Any]:
    """
    Runs model evaluation across a DataLoader.
    
    Returns:
    - Dict with loss, accuracy, precision, recall, f1_score, and confusion matrix.
    """
    try:
        import torch
    except ImportError as e:
        raise ImportError("PyTorch is required for model evaluation.") from e

    model.eval()
    model.to(device)

    total_loss = 0.0
    y_true: List[int] = []
    y_pred: List[int] = []
    y_probs: List[float] = []

    with torch.no_grad():
        for batch_idx, (images, targets) in enumerate(data_loader):
            images = images.to(device)
            targets = targets.to(device)

            outputs = model(images)
            
            if criterion is not None:
                loss = criterion(outputs, targets)
                total_loss += loss.item() * images.size(0)

            # Compute softmax probabilities & argmax predictions
            probs = torch.softmax(outputs, dim=1)
            preds = torch.argmax(probs, dim=1)

            y_true.extend(targets.cpu().numpy().tolist())
            y_pred.extend(preds.cpu().numpy().tolist())
            y_probs.extend(probs[:, 1].cpu().numpy().tolist())

    total_samples = len(y_true)
    avg_loss = (total_loss / total_samples) if (criterion and total_samples > 0) else 0.0

    # Calculate full metrics
    metrics = calculate_classification_metrics(y_true, y_pred)
    metrics["loss"] = round(avg_loss, 5)

    return metrics
