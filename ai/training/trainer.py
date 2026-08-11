"""
KrishiMitra AI - Quality Grader Model Trainer
Orchestrates PyTorch training, validation, early stopping, LR scheduling, and model checkpointing.
"""

from pathlib import Path
from typing import Dict, Any, Optional, Tuple

from ai.training.train_config import TrainingConfig, get_default_training_config
from ai.training.callbacks import EarlyStopping, ModelCheckpoint, HistoryTracker
from ai.training.evaluate import evaluate_model
from ai.models.model_builder import build_mobilenet_v2_quality_grader, count_parameters
from ai.preprocessing.loader import create_data_loaders


class QualityGraderTrainer:
    """
    Manages the training lifecycle for the MobileNetV2 Quality Grader.
    """
    def __init__(self, config: Optional[TrainingConfig] = None):
        self.config = config or get_default_training_config()
        self.history = HistoryTracker()
        self.early_stopping = EarlyStopping(
            patience=self.config.early_stopping_patience,
            min_delta=self.config.early_stopping_min_delta,
            mode=self.config.monitor_mode
        )
        self.checkpoint = ModelCheckpoint(
            filepath=self.config.best_model_path,
            monitor=self.config.monitor_metric,
            mode=self.config.monitor_mode
        )

    def train_epoch(
        self,
        model: Any,
        train_loader: Any,
        criterion: Any,
        optimizer: Any,
        device: str
    ) -> Tuple[float, float]:
        """
        Executes one full training epoch.
        Maintains features in eval mode when backbone is frozen to preserve ImageNet BatchNorm stats.
        """
        import torch
        if self.config.freeze_backbone and hasattr(model, "features"):
            model.features.eval()
            model.classifier.train()
        else:
            model.train()

        running_loss = 0.0
        correct_predictions = 0
        total_samples = 0

        for images, targets in train_loader:
            images = images.to(device)
            targets = targets.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            preds = torch.argmax(outputs, dim=1)
            correct_predictions += (preds == targets).sum().item()
            total_samples += targets.size(0)

        epoch_loss = running_loss / total_samples
        epoch_acc = correct_predictions / total_samples
        return epoch_loss, epoch_acc

    def fit(self) -> Dict[str, Any]:
        """
        Main execution loop for training and validation.
        NOTE: This method must be explicitly called when ready to train.
        """
        import torch
        import torch.nn as nn
        import torch.optim as optim

        # Set conservative CPU thread limit for laptop thermals
        if hasattr(torch, "set_num_threads") and self.config.num_threads:
            torch.set_num_threads(self.config.num_threads)

        device = self.config.device

        # 1. Build Model Architecture
        model = build_mobilenet_v2_quality_grader(
            num_classes=self.config.num_classes,
            pretrained=self.config.pretrained,
            freeze_backbone=self.config.freeze_backbone,
            dropout_rate=self.config.dropout_rate
        )
        model.to(device)

        # 2. Data Loaders (Train and Validation ONLY - Test is strictly excluded)
        train_loader, val_loader, test_loader, _ = create_data_loaders(
            train_batch_size=self.config.batch_size,
            eval_batch_size=self.config.batch_size,
            image_size=self.config.image_size,
            num_workers=self.config.num_workers
        )

        # 3. Loss, Optimizer, and LR Scheduler
        criterion = nn.CrossEntropyLoss()
        
        # Only pass trainable parameters from classifier head to optimizer
        trainable_params = [p for p in model.parameters() if p.requires_grad]
        optimizer = optim.Adam(
            trainable_params,
            lr=self.config.learning_rate,
            weight_decay=self.config.weight_decay
        )

        scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            optimizer,
            mode=self.config.monitor_mode,
            factor=self.config.lr_reduction_factor,
            patience=self.config.lr_reduction_patience,
            min_lr=self.config.min_lr
        )

        print("=" * 80)
        print(f"STARTING TRAINING: {self.config.experiment_name}")
        print(f"Device: {device} | Max Epochs: {self.config.max_epochs} | Batch Size: {self.config.batch_size}")
        print(f"Parameters: {count_parameters(model)}")
        print("=" * 80)

        for epoch in range(1, self.config.max_epochs + 1):
            train_loss, train_acc = self.train_epoch(
                model=model,
                train_loader=train_loader,
                criterion=criterion,
                optimizer=optimizer,
                device=device
            )

            # Validation (Validation set used strictly for checkpointing & early stopping)
            val_metrics = evaluate_model(
                model=model,
                data_loader=val_loader,
                criterion=criterion,
                device=device
            )
            val_loss = val_metrics["loss"]
            val_acc = val_metrics["accuracy"]

            current_lr = optimizer.param_groups[0]["lr"]

            # Record history
            self.history.record_epoch(
                epoch=epoch,
                train_loss=train_loss,
                train_acc=train_acc,
                val_loss=val_loss,
                val_acc=val_acc,
                lr=current_lr
            )

            print(
                f"Epoch [{epoch:02d}/{self.config.max_epochs:02d}] "
                f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc*100:.2f}% | "
                f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc*100:.2f}% | "
                f"LR: {current_lr:.6f}"
            )

            # Save best checkpoint
            saved = self.checkpoint.check_and_save(
                model_state=model,
                current_value=val_loss,
                epoch=epoch,
                extra_meta={"val_accuracy": val_acc, "train_accuracy": train_acc}
            )
            if saved:
                print(f"  --> Saved new best model checkpoint to {self.config.best_model_path}")

            # Step learning rate scheduler
            scheduler.step(val_loss)

            # Early stopping check
            self.early_stopping.step(val_loss)
            if self.early_stopping.should_stop:
                print(f"\n[Early Stopping] No improvement in {self.config.early_stopping_patience} consecutive epochs. Halting.")
                break

        # Save training history JSON
        self.history.save_json(self.config.history_path)
        print(f"\nTraining complete. History saved to {self.config.history_path}")

        return self.history.history
