import os
import json
import numpy as np
from pathlib import Path
import tensorflow as tf
from tensorflow.keras.preprocessing import image

# Determine paths relative to this script
BASE_DIR = Path(__file__).resolve().parent.parent
V1_METRICS_PATH = BASE_DIR / "outputs" / "soil_classification" / "metrics.json"
V2_METRICS_PATH = BASE_DIR / "outputs" / "soil_classification_v2" / "metrics.json"
V2_MODEL_PATH = BASE_DIR / "models" / "soil_classifier_v2.keras"
V2_LABELS_PATH = BASE_DIR / "models" / "soil_labels_v2.json"
TEST_DIR = BASE_DIR / "Dataset" / "soil_classification" / "test"

def run_comparison():
    print("==================================================================")
    print("MODEL V1 VS MODEL V2 SIDE-BY-SIDE COMPARISON")
    print("==================================================================")
    
    # Load metrics
    with open(V1_METRICS_PATH, "r") as f:
        v1 = json.load(f)
    with open(V2_METRICS_PATH, "r") as f:
        v2 = json.load(f)
        
    print(f"{'Metric':<25} | {'Model V1':<12} | {'Model V2':<12} | {'Difference':<10}")
    print("-" * 68)
    
    metrics_to_compare = [
        ("Test Accuracy", "test_accuracy"),
        ("Macro Precision", "macro_precision"),
        ("Macro Recall", "macro_recall"),
        ("Macro F1-Score", "macro_f1")
    ]
    
    for label, key in metrics_to_compare:
        v1_val = v1[key] * 100 if "accuracy" in key or "precision" in key or "recall" in key or "f1" in key else v1[key]
        v2_val = v2[key] * 100 if "accuracy" in key or "precision" in key or "recall" in key or "f1" in key else v2[key]
        diff = v2_val - v1_val
        print(f"{label:<25} | {v1_val:>10.2f}% | {v2_val:>10.2f}% | {diff:>+9.2f}%")
        
    print("=" * 68)
    print("\nPER-CLASS RECALL & F1 COMPARISON:")
    print("-" * 68)
    print(f"{'Soil Class':<20} | {'V1 Recall':<10} | {'V2 Recall':<10} | {'V1 F1':<8} | {'V2 F1':<8}")
    print("-" * 68)
    
    classes = sorted(v1["per_class_metrics"].keys())
    for cls in classes:
        v1_rec = v1["per_class_metrics"][cls]["recall"] * 100
        v2_rec = v2["per_class_metrics"][cls]["recall"] * 100
        v1_f1 = v1["per_class_metrics"][cls]["f1-score"] * 100
        v2_f1 = v2["per_class_metrics"][cls]["f1-score"] * 100
        print(f"{cls:<20} | {v1_rec:>8.2f}% | {v2_rec:>8.2f}% | {v1_f1:>6.2f}% | {v2_f1:>6.2f}%")
    print("==================================================================\n")

def run_predictions():
    print("==================================================================")
    print("MODEL V2 SAMPLE TEST INFERENCE VERIFICATION")
    print("==================================================================")
    print(f"{'Image':<45} | {'Actual Class':<15} | {'Predicted Class':<15} | {'Confidence':<10} | {'Status':<8}")
    print("-" * 105)
    
    # Load V2 model and labels
    model = tf.keras.models.load_model(str(V2_MODEL_PATH))
    with open(V2_LABELS_PATH, "r") as f:
        labels_dict = json.load(f)
        
    classes = sorted([d.name for d in TEST_DIR.iterdir() if d.is_dir()])
    
    correct_count = 0
    total_count = 0
    
    for class_name in classes:
        class_dir = TEST_DIR / class_name
        images = sorted([f.name for f in class_dir.iterdir() if f.is_file()])
        
        # Test 2 images per class
        selected_images = images[:2]
        for img_name in selected_images:
            img_path = class_dir / img_name
            
            # Load and preprocess
            img = image.load_img(str(img_path), target_size=(224, 224), color_mode="rgb")
            img_array = image.img_to_array(img).astype("float32")
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
            
            short_name = f"{class_name}/{img_name}"
            if len(short_name) > 43:
                short_name = short_name[:40] + "..."
            print(f"{short_name:<45} | {class_name:<15} | {predicted_class:<15} | {confidence * 100:>8.2f}% | {status:<8}")
            
    print("-" * 105)
    accuracy = (correct_count / total_count) * 100 if total_count > 0 else 0
    print(f"Sample Verification Summary: {correct_count}/{total_count} correct ({accuracy:.2f}% accuracy)")
    print("==================================================================")

if __name__ == "__main__":
    run_comparison()
    run_predictions()
