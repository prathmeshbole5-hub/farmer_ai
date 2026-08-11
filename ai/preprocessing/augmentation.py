"""
KrishiMitra AI - Image Augmentation Pipeline for Produce Quality Grading
Implements conservative, agricultural-freshness-appropriate dynamic augmentations.

Key Design Decisions:
1. Dynamic On-The-Fly: Augmentations are computed per batch during training; no physical images are duplicated.
2. Conservative Policy: Preserves visual decay/freshness cues (color texture, spots, fungal growth).
3. Zero Augmentation on Eval: Validation, Test, and Single-Image inference use deterministic transforms only.
"""

from typing import Tuple, Optional, Callable
from PIL import Image

# Normalization constants (ImageNet standards for MobileNetV2)
DEFAULT_MEAN = [0.485, 0.456, 0.406]
DEFAULT_STD = [0.229, 0.224, 0.225]


def get_train_transforms(
    image_size: Tuple[int, int] = (224, 224),
    mean: list = None,
    std: list = None
) -> Callable:
    """
    Builds dynamic training data augmentation pipeline.
    
    Augmentations:
    - Resize(256) + RandomCrop(224) or RandomResizedCrop: Simulates varying fruit/veg distances.
    - RandomHorizontalFlip(p=0.5): Produce freshness is invariant to left/right orientation.
    - RandomRotation(degrees=15): Accommodates slight angle tilt from farmer mobile cameras.
    - ColorJitter(brightness=0.15, contrast=0.15, saturation=0.10): Handles outdoor/field lighting variations.
    - ToTensor() + Normalize(): Converts pixel range [0, 255] to ImageNet standardized tensors.
    """
    mean = mean or DEFAULT_MEAN
    std = std or DEFAULT_STD

    try:
        from torchvision import transforms
        train_pipeline = transforms.Compose([
            transforms.Resize((256, 256), interpolation=transforms.InterpolationMode.BILINEAR),
            transforms.RandomCrop(image_size),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=15),
            transforms.ColorJitter(
                brightness=0.15,
                contrast=0.15,
                saturation=0.10,
                hue=0.02
            ),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std)
        ])
        return train_pipeline
    except ImportError:
        # Fallback functional transform when torchvision is not yet installed
        def fallback_train_transform(img: Image.Image):
            img_rgb = img.convert("RGB")
            return img_rgb.resize(image_size, Image.Resampling.BILINEAR)
        return fallback_train_transform


def get_eval_transforms(
    image_size: Tuple[int, int] = (224, 224),
    mean: list = None,
    std: list = None
) -> Callable:
    """
    Builds deterministic evaluation pipeline for Validation and Testing.
    
    Operations (NO random augmentations):
    - Direct deterministic Resize to target dimensions.
    - ToTensor() conversion.
    - Standard ImageNet Normalization.
    """
    mean = mean or DEFAULT_MEAN
    std = std or DEFAULT_STD

    try:
        from torchvision import transforms
        eval_pipeline = transforms.Compose([
            transforms.Resize(image_size, interpolation=transforms.InterpolationMode.BILINEAR),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std)
        ])
        return eval_pipeline
    except ImportError:
        def fallback_eval_transform(img: Image.Image):
            img_rgb = img.convert("RGB")
            return img_rgb.resize(image_size, Image.Resampling.BILINEAR)
        return fallback_eval_transform


def get_single_image_transforms(
    image_size: Tuple[int, int] = (224, 224),
    mean: list = None,
    std: list = None
) -> Callable:
    """
    Convenience alias for single-image inference transforms (identical to eval pipeline).
    """
    return get_eval_transforms(image_size=image_size, mean=mean, std=std)
