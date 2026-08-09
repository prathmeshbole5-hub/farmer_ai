import os
import json
import numpy as np
from pathlib import Path
import tensorflow as tf
from tensorflow.keras.utils import load_img, img_to_array

# Determine paths relative to this script
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "soil_classifier_v4.keras"
LABELS_PATH = BASE_DIR / "models" / "soil_labels_v4.json"
TEST_DIR = BASE_DIR / "Dataset" / "soil_classification" / "test"

def load_labels():
    with open(LABELS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def verify_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found at {MODEL_PATH.resolve()}")
    if not TEST_DIR.exists():
        raise FileNotFoundError(f"Test directory not found at {TEST_DIR.resolve()}")
        
    model = tf.keras.models.load_model(str(MODEL_PATH))
    labels_dict = load_labels()
    
    classes = sorted([d.name for d in TEST_DIR.iterdir() if d.is_dir()])
    
    print("==================================================================")
    print("SOIL CLASSIFIER MODEL VERIFICATION REPORT")
    print("==================================================================")
    print(f"{'Image':<45} | {'Actual Class':<15} | {'Predicted Class':<15} | {'Confidence':<10} | {'Status':<8}")
    print("-" * 105)
    
    correct_count = 0
    total_count = 0
    
    # We will pick 2 images from each class folder to verify (14 images total)
    for class_name in classes:
        class_dir = TEST_DIR / class_name
        images = sorted([f.name for f in class_dir.iterdir() if f.is_file()])
        
        # Select first 2 images
        selected_images = images[:2]
        
        for img_name in selected_images:
            img_path = class_dir / img_name
            
            # Load and preprocess
            img = load_img(str(img_path), target_size=(224, 224), color_mode="rgb")
            img_array = img_to_array(img).astype("float32")
            img_array = np.expand_dims(img_array, axis=0)
            
            # Predict
            preds = model.predict(img_array, verbose=0)[0]
            predicted_idx = np.argmax(preds)
            confidence = preds[predicted_idx]
            predicted_class = labels_dict[str(predicted_idx)]
            
            status = "Correct" if predicted_class == class_name else "Incorrect"
            if status == "Correct":
                correct_count += 1
            total_count += 1
            
            # Print row
            short_name = f"{class_name}/{img_name}"
            # Truncate short_name if too long
            if len(short_name) > 43:
                short_name = short_name[:40] + "..."
            print(f"{short_name:<45} | {class_name:<15} | {predicted_class:<15} | {confidence * 100:>8.2f}% | {status:<8}")
            
    print("-" * 105)
    accuracy = (correct_count / total_count) * 100 if total_count > 0 else 0
    print(f"Verification Summary: {correct_count}/{total_count} correct ({accuracy:.2f}% accuracy on sample set)")
    print("==================================================================")

if __name__ == "__main__":
    verify_model()
