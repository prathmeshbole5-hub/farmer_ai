"""
KrishiMitra AI - Quality Grader Model Architecture Builder
Defines the MobileNetV2 transfer learning architecture for binary produce freshness classification.

Task:
- Class 0: Fresh
- Class 1: Rotten
- Input Shape: [batch_size, 3, 224, 224]
- Classifier Output: 2 logits (in_features=1280, out_features=2)
"""

from typing import Dict, Any, Tuple, Optional

# Constants
DEFAULT_NUM_CLASSES = 2
DEFAULT_DROPOUT_RATE = 0.2
MOBILENET_LAST_CHANNEL = 1280


def build_mobilenet_v2_quality_grader(
    num_classes: int = DEFAULT_NUM_CLASSES,
    pretrained: bool = False,
    freeze_backbone: bool = True,
    dropout_rate: float = DEFAULT_DROPOUT_RATE
) -> Any:
    """
    Constructs and configures the MobileNetV2 Quality Grader model.

    Parameters:
    - num_classes (int): Number of target quality classes (default: 2 for Fresh / Rotten).
    - pretrained (bool): If True, initializes with ImageNet weights (MobileNet_V2_Weights.DEFAULT).
                        If False, initializes architecture without downloading weights.
    - freeze_backbone (bool): If True, freezes convolutional feature extractor layers (requires_grad = False).
                              If False, all parameters remain trainable for full fine-tuning.
    - dropout_rate (float): Dropout probability preceding the final linear layer (default: 0.2).

    Returns:
    - Configured PyTorch nn.Module instance.
    """
    try:
        import torch
        import torch.nn as nn
        from torchvision import models
    except ImportError as e:
        raise ImportError(
            "PyTorch and torchvision are required to build the MobileNetV2 model instance. "
            "Please ensure the ML environment is activated."
        ) from e

    # 1. Instantiate Base MobileNetV2 Architecture
    if pretrained:
        weights = models.MobileNet_V2_Weights.DEFAULT
        model = models.mobilenet_v2(weights=weights)
    else:
        model = models.mobilenet_v2(weights=None)

    # 2. Configure Feature Extractor Parameter Freezing and BatchNorm Locking
    if freeze_backbone:
        for param in model.features.parameters():
            param.requires_grad = False
        # Lock BatchNorm running statistics to ImageNet defaults
        for module in model.features.modules():
            if isinstance(module, (nn.BatchNorm2d, nn.modules.batchnorm._BatchNorm)):
                module.eval()
                module.track_running_stats = False

    # 3. Replace Classifier Head for 2-Class Fresh/Rotten Quality Classification
    in_features = model.last_channel  # 1280
    model.classifier = nn.Sequential(
        nn.Dropout(p=dropout_rate),
        nn.Linear(in_features=in_features, out_features=num_classes)
    )

    # Ensure classifier parameters are explicitly trainable
    for param in model.classifier.parameters():
        param.requires_grad = True

    return model


def set_backbone_trainable(model: Any, trainable: bool = True) -> None:
    """
    Toggles gradient computation for the entire convolutional feature extractor.
    """
    if not hasattr(model, "features"):
        raise AttributeError("Model does not have a 'features' attribute.")
    for param in model.features.parameters():
        param.requires_grad = trainable


def unfreeze_last_n_blocks(model: Any, n_blocks: int = 3) -> None:
    """
    Unfreezes the last N inverted residual blocks of the feature extractor for partial fine-tuning.
    """
    if not hasattr(model, "features"):
        raise AttributeError("Model does not have a 'features' attribute.")

    total_blocks = len(model.features)
    unfreeze_start_idx = max(0, total_blocks - n_blocks)

    for idx, block in enumerate(model.features):
        is_trainable = (idx >= unfreeze_start_idx)
        for param in block.parameters():
            param.requires_grad = is_trainable


def count_parameters(model: Any) -> Dict[str, int]:
    """
    Calculates parameter statistics for the given PyTorch model.
    """
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    frozen_params = total_params - trainable_params

    return {
        "total_parameters": total_params,
        "trainable_parameters": trainable_params,
        "frozen_parameters": frozen_params
    }


def get_model_summary(model: Any) -> Dict[str, Any]:
    """
    Generates a structured overview of the model configuration and parameter distribution.
    """
    param_counts = count_parameters(model)
    return {
        "architecture": "MobileNetV2",
        "num_classes": DEFAULT_NUM_CLASSES,
        "input_shape": [None, 3, 224, 224],
        "classifier_head": str(getattr(model, "classifier", None)),
        "parameter_summary": param_counts,
        "is_backbone_frozen": (param_counts["frozen_parameters"] > 0)
    }
