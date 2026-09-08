"""
KrishiMitra AI - Central Configuration and Constants
Defines directory paths, hyperparameters, and quality grader constants.
"""

import os
from pathlib import Path

# Base Paths
AI_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = AI_ROOT.parent

# Dataset Paths
DATASET_ROOT = AI_ROOT / "dataset"
RAW_DATASET_DIR = DATASET_ROOT / "Fruits_Vegetables_Dataset(12000)"
PROCESSED_DATA_DIR = DATASET_ROOT / "processed"

TRAIN_DIR = PROCESSED_DATA_DIR / "train"
VAL_DIR = PROCESSED_DATA_DIR / "validation"
TEST_DIR = PROCESSED_DATA_DIR / "test"

# Metadata & Model Export Paths
METADATA_DIR = AI_ROOT / "metadata"
MODEL_SAVE_DIR = AI_ROOT / "models"
QUALITY_PREPROCESSING_CONFIG = METADATA_DIR / "quality_preprocessing_config.json"
QUALITY_DATASET_META = METADATA_DIR / "quality_grader_dataset.json"

# Quality Grader Specifications
IMAGE_SIZE = (224, 224)
COLOR_MODE = "RGB"
CHANNELS = 3

# Class Label Definitions (Deterministic Ordering)
CLASS_NAMES = ["Fresh", "Rotten"]
CLASS_TO_IDX = {"Fresh": 0, "Rotten": 1}
IDX_TO_CLASS = {0: "Fresh", 1: "Rotten"}
NUM_CLASSES = 2

# ImageNet Normalization Constants (for MobileNetV2)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# Training & DataLoader Defaults (Memory Safe for Laptop / Snapdragon CPU)
DEFAULT_BATCH_SIZE = 32
CPU_LAPTOP_BATCH_SIZE = 16
NUM_WORKERS = 0  # Safe for Windows multi-threading without shared memory deadlocks
SEED = 42
