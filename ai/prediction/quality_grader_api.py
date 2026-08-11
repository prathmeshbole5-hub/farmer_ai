"""
KrishiMitra AI - Quality Grader Production CLI Inference API
Headless inference entry point for MobileNetV2 produce quality classification (Fresh vs. Rotten).

Input:
  sys.argv[1]: Absolute or relative path to the image file.

Output:
  JSON formatted string exclusively printed to STDOUT.
  {
    "success": true,
    "quality": "Fresh" | "Rotten",
    "class_id": 0 | 1,
    "confidence": float,
    "probabilities": {
      "Fresh": float,
      "Rotten": float
    }
  }
"""

import os
import sys
import json
from pathlib import Path

# Configure utf-8 encoding safely for Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def run_inference():
    try:
        # Validate argument
        if len(sys.argv) < 2:
            print(json.dumps({
                "success": False,
                "error": "No image path provided."
            }))
            return

        image_path = Path(sys.argv[1]).resolve()
        if not image_path.is_file():
            print(json.dumps({
                "success": False,
                "error": f"Image file not found: {image_path.name}"
            }))
            return

        # Model Checkpoint Path
        checkpoint_path = PROJECT_ROOT / "ai" / "models" / "quality_grader_mobilenetv2_best.pt"
        if not checkpoint_path.is_file():
            print(json.dumps({
                "success": False,
                "error": "Quality Grader model checkpoint not found on server."
            }))
            return

        # Lazy import PyTorch and model builder
        import torch
        from ai.models.model_builder import build_mobilenet_v2_quality_grader
        from ai.preprocessing.preprocess import preprocess_single_image, decode_prediction

        # Conservative CPU thread limit for inference
        torch.set_num_threads(4)

        # 1. Reconstruct MobileNetV2 Architecture
        model = build_mobilenet_v2_quality_grader(
            num_classes=2,
            pretrained=False,
            freeze_backbone=True,
            dropout_rate=0.2
        )

        # 2. Load Checkpoint State Dict
        checkpoint = torch.load(str(checkpoint_path), map_location="cpu")
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        model.load_state_dict(state_dict, strict=True)
        model.eval()

        # 3. Production Preprocessing Pipeline
        input_tensor = preprocess_single_image(image_path)

        # 4. Forward Pass (torch.no_grad)
        with torch.no_grad():
            logits = model(input_tensor)
            probs = torch.softmax(logits, dim=1).squeeze(0)

        # Validate numerical stability
        if torch.isnan(logits).any() or torch.isinf(logits).any():
            print(json.dumps({
                "success": False,
                "error": "Numerical instability detected during inference."
            }))
            return

        prob_rotten = float(probs[1].item())

        # 5. Decode Prediction
        decoded = decode_prediction(prob_rotten)

        response_payload = {
            "success": True,
            "quality": decoded["quality"],
            "class_id": decoded["class_id"],
            "confidence": decoded["confidence"],
            "probabilities": decoded["probabilities"]
        }

        print(json.dumps(response_payload))

    except Exception as e:
        # Write traceback exclusively to stderr, never stdout
        sys.stderr.write(f"[QUALITY_GRADER_INFERENCE_ERROR] {str(e)}\n")
        print(json.dumps({
            "success": False,
            "error": f"Inference failed: {str(e)}"
        }))


if __name__ == "__main__":
    run_inference()
