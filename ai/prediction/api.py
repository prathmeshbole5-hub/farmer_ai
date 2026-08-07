import sys
import json
import os

# Current folder (prediction/)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Add prediction folder to Python path
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

# Import predictor
from prediction.predictor import predict


def main():
    try:
        if len(sys.argv) < 2:
            print(json.dumps({
                "success": False,
                "error": "No image path provided."
            }))
            return

        image_path = sys.argv[1]

        disease, confidence = predict(image_path)

        result = {
            "success": True,
            "disease": disease,
            "confidence": round(float(confidence) * 100, 2)
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))


if __name__ == "__main__":
    main()