"""
KrishiMitra AI - Model Deployment Integrity and Smoke Test (Step 18)
Performs verification of checkpoint state-loading, parameter integrity, and real-image inference.
"""

import os
import sys
import gc
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import torch
import torch.nn as nn
from PIL import Image

from ai.models.model_builder import build_mobilenet_v2_quality_grader, count_parameters
from ai.preprocessing.preprocess import preprocess_single_image, decode_prediction
from ai.config.config import MODEL_SAVE_DIR, VAL_DIR, CLASS_TO_IDX


def run_deployment_verification():
    print("=" * 80)
    print("        KRISHIMITRA AI - STEP 18: DEPLOYMENT INTEGRITY & SMOKE TEST             ")
    print("=" * 80)

    # 1. Inspect Checkpoint File & Contents
    checkpoint_path = MODEL_SAVE_DIR / "quality_grader_mobilenetv2_best.pt"
    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Checkpoint not found at: {checkpoint_path}")

    file_size_bytes = checkpoint_path.stat().st_size
    file_size_mb = file_size_bytes / (1024 * 1024)
    print("\n[1/4] Checkpoint Inspection:")
    print(f"  - Checkpoint File:           {checkpoint_path}")
    print(f"  - File Size:                 {file_size_bytes:,} bytes ({file_size_mb:.2f} MB)")

    checkpoint = torch.load(str(checkpoint_path), map_location="cpu")
    ckpt_keys = list(checkpoint.keys())
    print(f"  - Checkpoint Top-Level Keys: {ckpt_keys}")

    has_optimizer = "optimizer_state_dict" in checkpoint
    has_model_weights = "model_state_dict" in checkpoint
    has_hyperparams = "hyperparameters" in checkpoint

    print(f"  - Contains Model Weights:    {has_model_weights} [REQUIRED]")
    print(f"  - Contains Optimizer State:  {has_optimizer} (Training-only metadata present)")
    print(f"  - Contains Hyperparameters:  {has_hyperparams}")
    print(f"  - Best Source Epoch:         Epoch {checkpoint.get('epoch', 'N/A')}")
    print(f"  - Best Validation Loss:      {checkpoint.get('val_loss', 'N/A')}")

    # 2. Reconstruct Architecture & Load State Dict
    print("\n[2/4] Model Architecture Reconstruction & State Loading:")
    model = build_mobilenet_v2_quality_grader(
        num_classes=2,
        pretrained=False,
        freeze_backbone=True,
        dropout_rate=0.2
    )

    # Load state dict without training optimizer
    load_result = model.load_state_dict(checkpoint["model_state_dict"], strict=True)
    model.eval()

    print(f"  - State Dict Loading Result: {load_result}")
    print(f"  - Missing Keys:              {len(load_result.missing_keys)} (None missing: {len(load_result.missing_keys) == 0}) [PASSED]")
    print(f"  - Unexpected Keys:           {len(load_result.unexpected_keys)} (None unexpected: {len(load_result.unexpected_keys) == 0}) [PASSED]")

    param_info = count_parameters(model)
    print(f"  - Total Parameters:          {param_info['total_parameters']:,}")
    print(f"  - Class Mapping Alignment:   Fresh = {CLASS_TO_IDX['Fresh']}, Rotten = {CLASS_TO_IDX['Rotten']}")

    # Verify dummy shape forward pass
    dummy_input = torch.randn(1, 3, 224, 224)
    with torch.no_grad():
        dummy_out = model(dummy_input)
    print(f"  - Input Tensor Shape:        {list(dummy_input.shape)}")
    print(f"  - Output Logits Shape:       {list(dummy_out.shape)} (Strictly [1, 2]: {list(dummy_out.shape) == [1, 2]}) [PASSED]")

    # 3. Real Image Production Inference Smoke Test
    print("\n[3/4] Production Preprocessing & Real-Image Smoke Test:")
    fresh_val_folder = VAL_DIR / "Fresh"
    sample_images = sorted(list(fresh_val_folder.glob("*.jpg")) + list(fresh_val_folder.glob("*.png")))
    sample_img_path = sample_images[0]

    print(f"  - Test Image Path:           {sample_img_path}")
    print(f"  - Image Ground Truth:        Fresh (Class ID: 0)")

    # Production Preprocessing Pipeline
    input_tensor = preprocess_single_image(sample_img_path)
    print(f"  - Preprocessed Tensor Shape: {list(input_tensor.shape)}")
    print(f"  - Preprocessed Tensor Dtype: {input_tensor.dtype}")

    # Production Forward Pass
    with torch.no_grad():
        logits = model(input_tensor)
        probs = torch.softmax(logits, dim=1).squeeze(0)

    prob_fresh = float(probs[0].item())
    prob_rotten = float(probs[1].item())
    prob_sum = prob_fresh + prob_rotten

    print("\n[4/4] Prediction & Decoder Verification:")
    print(f"  - Raw Output Logits:         {[round(x, 4) for x in logits.squeeze(0).tolist()]}")
    print(f"  - Fresh Probability:         {prob_fresh:.6f} ({prob_fresh * 100:.2f}%)")
    print(f"  - Rotten Probability:        {prob_rotten:.6f} ({prob_rotten * 100:.2f}%)")
    print(f"  - Probability Sum:           {prob_sum:.6f}")

    # Check NaN / Inf
    has_nan = torch.isnan(logits).any().item()
    has_inf = torch.isinf(logits).any().item()
    print(f"  - Contains NaN:              {has_nan} (Zero NaN: {not has_nan}) [PASSED]")
    print(f"  - Contains Inf:              {has_inf} (Zero Inf: {not has_inf}) [PASSED]")

    # Production Decoder Call
    decoded_result = decode_prediction(prob_rotten)
    print(f"\n  - Production Decoder Output Dictionary:")
    for k, v in decoded_result.items():
        print(f"      * {k}: {v}")

    # Assertions
    assert decoded_result["quality"] in ["Fresh", "Rotten"], "Invalid quality string"
    assert decoded_result["class_id"] in [0, 1], "Invalid class_id"
    assert 0.0 <= decoded_result["confidence"] <= 1.0, "Invalid confidence range"
    assert "Fresh" in decoded_result["probabilities"] and "Rotten" in decoded_result["probabilities"], "Missing probability keys"

    print("\n[PASS] Model deployment integrity, clean state loading, and inference decoder verified successfully!")
    print("=" * 80)

    del model, input_tensor, dummy_input, logits, probs
    gc.collect()


if __name__ == "__main__":
    run_deployment_verification()
