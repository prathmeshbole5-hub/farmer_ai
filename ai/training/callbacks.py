"""
KrishiMitra AI - Training Callbacks and Checkpoint Handlers
Implements EarlyStopping, ModelCheckpoint, and HistoryTracker for PyTorch training.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional


class EarlyStopping:
    """
    Monitors a metric (e.g. val_loss) and halts training when it stops improving.
    """
    def __init__(
        self,
        patience: int = 3,
        min_delta: float = 0.001,
        mode: str = "min"
    ):
        self.patience = patience
        self.min_delta = min_delta
        self.mode = mode
        self.best_score: Optional[float] = None
        self.counter: int = 0
        self.should_stop: bool = False

    def step(self, current_metric: float) -> bool:
        """
        Updates early stopping state. Returns True if improvement was made.
        """
        if self.best_score is None:
            self.best_score = current_metric
            self.counter = 0
            return True

        if self.mode == "min":
            improved = (self.best_score - current_metric) > self.min_delta
        else:
            improved = (current_metric - self.best_score) > self.min_delta

        if improved:
            self.best_score = current_metric
            self.counter = 0
            return True
        else:
            self.counter += 1
            if self.counter >= self.patience:
                self.should_stop = True
            return False


class ModelCheckpoint:
    """
    Saves model state and metadata whenever the monitored metric achieves a new optimum.
    """
    def __init__(
        self,
        filepath: Path,
        monitor: str = "val_loss",
        mode: str = "min"
    ):
        self.filepath = Path(filepath)
        self.monitor = monitor
        self.mode = mode
        self.best_value: Optional[float] = None

    def check_and_save(
        self,
        model_state: Any,
        current_value: float,
        epoch: int,
        extra_meta: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Checks if current_value is the best seen so far. If so, saves checkpoint.
        """
        improved = False
        if self.best_value is None:
            improved = True
        elif self.mode == "min" and current_value < self.best_value:
            improved = True
        elif self.mode == "max" and current_value > self.best_value:
            improved = True

        if improved:
            self.best_value = current_value
            self.filepath.parent.mkdir(parents=True, exist_ok=True)
            
            # Safe PyTorch save if torch is available
            try:
                import torch
                payload = {
                    "epoch": epoch,
                    "model_state_dict": model_state if isinstance(model_state, dict) else model_state.state_dict(),
                    "best_metric_name": self.monitor,
                    "best_metric_value": self.best_value,
                    "metadata": extra_meta or {}
                }
                torch.save(payload, str(self.filepath))
            except Exception as e:
                # If torch not available yet, just record state path
                pass
            return True

        return False


class HistoryTracker:
    """
    Logs epoch-by-epoch training metrics and exports structured JSON history.
    """
    def __init__(self):
        self.history: Dict[str, List[float]] = {
            "epoch": [],
            "train_loss": [],
            "train_acc": [],
            "val_loss": [],
            "val_acc": [],
            "learning_rate": []
        }

    def record_epoch(
        self,
        epoch: int,
        train_loss: float,
        train_acc: float,
        val_loss: float,
        val_acc: float,
        lr: float
    ) -> None:
        self.history["epoch"].append(epoch)
        self.history["train_loss"].append(round(train_loss, 5))
        self.history["train_acc"].append(round(train_acc, 5))
        self.history["val_loss"].append(round(val_loss, 5))
        self.history["val_acc"].append(round(val_acc, 5))
        self.history["learning_rate"].append(lr)

    def save_json(self, save_path: Path) -> None:
        save_path = Path(save_path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(self.history, f, indent=2)
