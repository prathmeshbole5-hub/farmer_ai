import os
import json
import numpy as np
from pathlib import Path
import tensorflow as tf
from tensorflow.keras.preprocessing import image

# Determine paths relative to this script
BASE_DIR = Path(__file__).resolve().parent.parent
V3_METRICS_PATH = BASE_DIR / "outputs" / "soil_classification_v3" / "metrics.json"
V4_METRICS_PATH = BASE_DIR / "outputs" / "soil_classification_v4" / "metrics.json"
V4_MODEL_PATH = BASE_DIR / "models" / "soil_classifier_v4.keras"
V4_LABELS_PATH = BASE_DIR / "models" / "soil_labels_v4.json"
TEST_DIR = BASE_DIR / "Dataset" / "soil_classification" / "test"

def run_comparison():
    print("==================================================================")
    print("MODEL V3 VS MODEL V4 SIDE-BY-SIDE COMPARISON")
    print("==================================================================")
    
    # Load metrics
    with open(V3_METRICS_PATH, "r") as f:
        v3 = json.load(f)
    with open(V4_METRICS_PATH, "r") as f:
        v4 = json.load(f)
        
    print(f"{'Metric':<25} | {'Model V3':<12} | {'Model V4':<12} | {'Difference':<10}")
    print("-" * 68)
    
    metrics_to_compare = [
        ("Test Accuracy", "test_accuracy"),
        ("Macro Precision", "macro_precision"),
        ("Macro Recall", "macro_recall"),
        ("Macro F1-Score", "macro_f1")
    ]
    
    for label, key in metrics_to_compare:
        v3_val = v3[key] * 100
        v4_val = v4[key] * 100
        diff = v4_val - v3_val
        print(f"{label:<25} | {v3_val:>10.2f}% | {v4_val:>10.2f}% | {diff:>+9.2f}%")
        
    print("=" * 68)
    print("\nPER-CLASS RECALL & F1 COMPARISON:")
    print("-" * 68)
    print(f"{'Soil Class':<20} | {'V3 Recall':<10} | {'V4 Recall':<10} | {'V3 F1':<8} | {'V4 F1':<8}")
    print("-" * 68)
    
    classes = sorted(v3["per_class_metrics"].keys())
    for cls in classes:
        v3_rec = v3["per_class_metrics"][cls]["recall"] * 100
        v4_rec = v4["per_class_metrics"][cls]["recall"] * 100
        v3_f1 = v3["per_class_metrics"][cls]["f1-score"] * 100
        v4_f1 = v4["per_class_metrics"][cls]["f1-score"] * 100
        print(f"{cls:<20} | {v3_rec:>8.2f}% | {v4_rec:>8.2f}% | {v3_f1:>6.2f}% | {v4_f1:>6.2f}%")
    print("==================================================================\n")
    
    # Determine the best model
    # Success Criteria: macro F1 and test accuracy
    if v4["macro_f1"] > v3["macro_f1"] and v4["test_accuracy"] >= v3["test_accuracy"]:
        print("DECISION: V4 is the new best model")
    else:
        print("DECISION: V3 remains the best model")
    print("==================================================================\n")

def run_predictions():
    print("==================================================================")
    print("MODEL V4 SAMPLE TEST INFERENCE VERIFICATION")
    print("==================================================================")
    print(f"{'Image':<45} | {'Actual Class':<15} | {'Predicted Class':<15} | {'Confidence':<10} | {'Status':<8}")
    print("-" * 105)
    
    # Load V4 model and labels
    model = tf.keras.models.load_model(str(V4_MODEL_PATH))
    with open(V4_LABELS_PATH, "r") as f:
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
