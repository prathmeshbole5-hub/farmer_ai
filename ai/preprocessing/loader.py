"""
KrishiMitra AI - Memory-Safe Lazy DataLoader for Quality Grader
Implements lazy-loading dataset and batch generators.

Key Architectural Guarantees:
1. Low Memory Footprint: Only file paths and integer labels are indexed at initialization (<5MB RAM).
2. Dynamic Streaming: Images are decompressed, converted to RGB, and augmented on-the-fly inside __getitem__.
3. Deterministic Labeling: Class index mapping is explicitly fixed (Fresh: 0, Rotten: 1).
4. Laptop / Snapdragon Friendly: Uses configurable batch sizes and safe worker counts for Windows OS.
"""

import os
from pathlib import Path
from typing import Tuple, List, Dict, Optional, Callable, Union, Any
from PIL import Image

from ai.config.config import (
    TRAIN_DIR,
    VAL_DIR,
    TEST_DIR,
    CLASS_TO_IDX,
    DEFAULT_BATCH_SIZE,
    CPU_LAPTOP_BATCH_SIZE,
    IMAGE_SIZE,
    NUM_WORKERS
)
from ai.preprocessing.augmentation import (
    get_train_transforms,
    get_eval_transforms
)
from ai.preprocessing.preprocess import load_and_clean_image


try:
    from torch.utils.data import Dataset as BaseDataset, DataLoader
except ImportError:
    BaseDataset = object
    DataLoader = None


class QualityGraderDataset(BaseDataset):
    """
    Lazy dataset that dynamically reads and transforms images on request.
    Compatible with PyTorch Dataset interface.
    """
    def __init__(
        self,
        root_dir: Union[str, Path] = None,
        transform: Optional[Callable] = None,
        class_to_idx: Dict[str, int] = None
    ):
        super().__init__()
        self.root_dir = Path(root_dir).resolve()
        self.transform = transform
        self.class_to_idx = class_to_idx or CLASS_TO_IDX
        self.samples: List[Tuple[Path, int]] = []

        if not self.root_dir.exists():
            raise FileNotFoundError(f"Dataset root directory not found: {self.root_dir}")

        # Deterministic class discovery
        valid_extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
        for class_name, class_idx in sorted(self.class_to_idx.items()):
            class_folder = self.root_dir / class_name
            if not class_folder.is_dir():
                continue
            
            for file_path in sorted(class_folder.iterdir()):
                if file_path.is_file() and file_path.suffix.lower() in valid_extensions:
                    self.samples.append((file_path, class_idx))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int) -> Tuple[Any, int]:
        """
        Loads image on-demand, converts to clean RGB, applies dynamic transform, and returns (image, label).
        """
        img_path, label = self.samples[index]
        
        # Load and clean RGB
        img = load_and_clean_image(img_path)
        
        # Apply assigned transformation (augmentation for train, eval resize for val/test)
        if self.transform:
            transformed_img = self.transform(img)
        else:
            transformed_img = img

        return transformed_img, label


def create_data_loaders(
    data_dir: Optional[Path] = None,
    train_batch_size: int = CPU_LAPTOP_BATCH_SIZE,
    eval_batch_size: int = CPU_LAPTOP_BATCH_SIZE,
    image_size: Tuple[int, int] = IMAGE_SIZE,
    num_workers: int = NUM_WORKERS
) -> Tuple[Any, Any, Any, Dict[str, int]]:
    """
    Constructs train, validation, and test data loaders with appropriate transforms.
    
    Returns:
    - (train_loader, val_loader, test_loader, class_to_idx)
    """
    base_data_dir = Path(data_dir) if data_dir else (TRAIN_DIR.parent)
    train_dir = base_data_dir / "train"
    val_dir = base_data_dir / "validation"
    test_dir = base_data_dir / "test"

    # Define transforms
    train_transform = get_train_transforms(image_size=image_size)
    eval_transform = get_eval_transforms(image_size=image_size)

    # Initialize lazy datasets
    train_dataset = QualityGraderDataset(root_dir=train_dir, transform=train_transform)
    val_dataset = QualityGraderDataset(root_dir=val_dir, transform=eval_transform)
    test_dataset = QualityGraderDataset(root_dir=test_dir, transform=eval_transform)

    # Build PyTorch DataLoaders if PyTorch is installed
    if DataLoader is not None:
        train_loader = DataLoader(
            train_dataset,
            batch_size=train_batch_size,
            shuffle=True,
            num_workers=num_workers,
            pin_memory=False
        )
        val_loader = DataLoader(
            val_dataset,
            batch_size=eval_batch_size,
            shuffle=False,
            num_workers=num_workers,
            pin_memory=False
        )
        test_loader = DataLoader(
            test_dataset,
            batch_size=eval_batch_size,
            shuffle=False,
            num_workers=num_workers,
            pin_memory=False
        )
        return train_loader, val_loader, test_loader, CLASS_TO_IDX
    else:
        # Return datasets directly when running in lightweight mode without PyTorch
        return train_dataset, val_dataset, test_dataset, CLASS_TO_IDX
