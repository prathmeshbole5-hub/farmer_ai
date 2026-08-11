"""
KrishiMitra AI - Image Preprocessing and Prediction Utilities
Provides single-image preprocessing, RGB channel normalization, and prediction decoding.
"""

import io
from pathlib import Path
from typing import Union, Tuple, Dict, Any
from PIL import Image

from ai.config.config import (
    IMAGE_SIZE,
    CLASS_TO_IDX,
    IDX_TO_CLASS,
    IMAGENET_MEAN,
    IMAGENET_STD
)
from ai.preprocessing.augmentation import get_single_image_transforms


def load_and_clean_image(image_source: Union[str, Path, bytes, Image.Image]) -> Image.Image:
    """
    Loads an image from a path, raw bytes, or PIL object and ensures clean 3-channel RGB.
    Handles transparency (RGBA), Palette (P), Grayscale (L), and CMYK cleanly.
    """
    if isinstance(image_source, (str, Path)):
        img = Image.open(image_source)
    elif isinstance(image_source, (bytes, bytearray)):
        img = Image.open(io.BytesIO(image_source))
    elif isinstance(image_source, Image.Image):
        img = image_source
    else:
        raise TypeError(f"Unsupported image source type: {type(image_source)}")

    # Handle transparent RGBA by blending onto a neutral white background
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        alpha_img = img.convert("RGBA")
        background = Image.new("RGBA", alpha_img.size, (255, 255, 255))
        alpha_composite = Image.alpha_composite(background, alpha_img)
        return alpha_composite.convert("RGB")
    elif img.mode != "RGB":
        return img.convert("RGB")
    
    return img


def preprocess_single_image(
    image_source: Union[str, Path, bytes, Image.Image],
    target_size: Tuple[int, int] = IMAGE_SIZE
) -> Any:
    """
    Prepares a single image for model inference.
    
    Steps:
    1. Loads and standardizes image to 3-channel RGB.
    2. Applies deterministic evaluation transforms (Resize to 224x224 + ImageNet normalization).
    3. Adds batch dimension: [1, 3, 224, 224].
    
    Returns:
    - PyTorch Tensor (if torch is installed) of shape [1, 3, 224, 224]
    - Or standardized PIL Image / normalized array if running in pure Python mode.
    """
    clean_img = load_and_clean_image(image_source)
    transform = get_single_image_transforms(image_size=target_size)
    
    tensor_or_img = transform(clean_img)
    
    # If returned as a PyTorch Tensor, add batch dimension [1, C, H, W]
    if hasattr(tensor_or_img, "unsqueeze"):
        return tensor_or_img.unsqueeze(0)
    
    return tensor_or_img


def decode_prediction(
    prediction_output: Union[float, list, Any],
    threshold: float = 0.5
) -> Dict[str, Any]:
    """
    Translates raw model output into actual binary dataset target prediction.
    
    Target Mapping:
    - Fresh = 0
    - Rotten = 1
    
    Note: 'confidence' represents the model's output prediction probability for the predicted class.
    """
    # Extract scalar probability of being 'Rotten' (Class 1)
    if hasattr(prediction_output, "item"):
        prob_rotten = float(prediction_output.item())
    elif isinstance(prediction_output, (list, tuple)):
        prob_rotten = float(prediction_output[-1])
    else:
        prob_rotten = float(prediction_output)

    # Clamp probability to valid [0.0, 1.0] range
    prob_rotten = max(0.0, min(1.0, prob_rotten))
    prob_fresh = 1.0 - prob_rotten

    if prob_rotten >= threshold:
        predicted_quality = "Rotten"
        predicted_id = 1
        confidence = prob_rotten
    else:
        predicted_quality = "Fresh"
        predicted_id = 0
        confidence = prob_fresh

    return {
        "quality": predicted_quality,
        "class_id": predicted_id,
        "confidence": round(confidence, 4),
        "probabilities": {
            "Fresh": round(prob_fresh, 4),
            "Rotten": round(prob_rotten, 4)
        }
    }
