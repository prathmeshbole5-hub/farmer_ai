"""
KrishiMitra AI - Training Configuration Dataclass
Provides structured, configurable hyperparameters for the Quality Grader model.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Tuple, List, Dict, Optional

from ai.config.config import (
    TRAIN_DIR,
    VAL_DIR,
    TEST_DIR,
    MODEL_SAVE_DIR,
    METADATA_DIR,
    IMAGE_SIZE,
    CLASS_TO_IDX,
    SEED
)


@dataclass
class TrainingConfig:
    """
    Encapsulates all hyperparameters and runtime settings for a training run.
    """
    # Experiment Identifiers
    experiment_name: str = "quality_grader_mobilenetv2_exp1"
    
    # Dataset & Task
    num_classes: int = 2
    class_to_idx: Dict[str, int] = field(default_factory=lambda: dict(CLASS_TO_IDX))
    image_size: Tuple[int, int] = IMAGE_SIZE
    
    # Transfer Learning Policy
    pretrained: bool = True
    freeze_backbone: bool = True
    dropout_rate: float = 0.2
    
    # Optimization Hyperparameters
    batch_size: int = 16  # Safe batch size for laptop CPU memory
    optimizer_name: str = "Adam"
    learning_rate: float = 0.001
    weight_decay: float = 1e-4
    loss_function: str = "CrossEntropyLoss"
    
    # Epochs & Scheduling
    max_epochs: int = 10
    early_stopping_patience: int = 3
    early_stopping_min_delta: float = 0.001
    lr_reduction_patience: int = 2
    lr_reduction_factor: float = 0.5
    min_lr: float = 1e-6
    
    # Checkpointing & Paths
    save_best_only: bool = True
    monitor_metric: str = "val_loss"
    monitor_mode: str = "min"
    
    # Runtime & Hardware
    seed: int = SEED
    device: str = "cpu"
    num_workers: int = 0
    num_threads: int = 4  # Conservative CPU thread limit for laptop thermals
    
    # Artifact Paths
    train_dir: Path = TRAIN_DIR
    val_dir: Path = VAL_DIR
    test_dir: Path = TEST_DIR
    model_save_dir: Path = MODEL_SAVE_DIR
    best_model_path: Path = field(default_factory=lambda: MODEL_SAVE_DIR / "quality_grader_mobilenetv2_best.pt")
    checkpoint_path: Path = field(default_factory=lambda: MODEL_SAVE_DIR / "quality_grader_checkpoint.pt")
    history_path: Path = field(default_factory=lambda: METADATA_DIR / "training_history_exp1.json")


def get_default_training_config() -> TrainingConfig:
    """
    Returns the standard default configuration for Experiment 1.
    """
    return TrainingConfig()
