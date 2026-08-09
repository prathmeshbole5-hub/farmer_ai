import os
import json
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support

# ============================================================
# PATHS SETTING
# ============================================================
BASE_DIR = Path(__file__).resolve().parent.parent
TRAIN_DIR = BASE_DIR / "Dataset" / "soil_classification_v2" / "train"
VAL_DIR = BASE_DIR / "Dataset" / "soil_classification" / "validation"
TEST_DIR = BASE_DIR / "Dataset" / "soil_classification" / "test"
MODELS_DIR = BASE_DIR / "models"
OUTPUTS_DIR = BASE_DIR / "outputs" / "soil_classification_v3"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

print("Starting Soil Classification V3 Fine-Tuning Pipeline")
print("======================================================")
print(f"TensorFlow Version : {tf.__version__}")
print(f"Train Directory    : {TRAIN_DIR.resolve()}")
print(f"Val Directory      : {VAL_DIR.resolve()}")
print(f"Test Directory     : {TEST_DIR.resolve()}")
print(f"Models Directory   : {MODELS_DIR.resolve()}")
print(f"Outputs Directory  : {OUTPUTS_DIR.resolve()}")
print("======================================================\n")

# ============================================================
# DATASET LOADING
# ============================================================
IMG_SIZE = (224, 224)
BATCH_SIZE = 32

print("Loading datasets...")
train_ds = tf.keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    label_mode="categorical",
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=True,
    seed=42
)

val_ds = tf.keras.utils.image_dataset_from_directory(
    VAL_DIR,
    label_mode="categorical",
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False
)

test_ds = tf.keras.utils.image_dataset_from_directory(
    TEST_DIR,
    label_mode="categorical",
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False
)

class_names = train_ds.class_names
num_classes = len(class_names)
print(f"\nFound {num_classes} classes: {class_names}")

# Save class labels V3 mapping (same as V2)
class_labels = {str(i): name for i, name in enumerate(class_names)}
labels_path = MODELS_DIR / "soil_labels_v3.json"
with open(labels_path, "w", encoding="utf-8") as f:
    json.dump(class_labels, f, indent=4)
print(f"Saved class labels V3 to: {labels_path}\n")

# ============================================================
# LOAD MODEL V2 AND APPLY FINE-TUNING STRATEGY
# ============================================================
model_v2_path = MODELS_DIR / "soil_classifier_v2.keras"
if not model_v2_path.exists():
    raise FileNotFoundError(f"Model V2 baseline not found at: {model_v2_path.resolve()}")

print(f"Loading Model V2 baseline from: {model_v2_path.resolve()}...")
model = tf.keras.models.load_model(str(model_v2_path))

# Inspect layers
base_model = model.get_layer("mobilenetv2_1.00_224")

# Set base model trainable
base_model.trainable = True

# Unfreeze final 30 layers (out of 154 layers, index 124 to 153)
fine_tune_at = 124

print("Applying unfreezing strategy:")
print(f"  - Total base layers: {len(base_model.layers)}")
print(f"  - Unfreezing layers from index {fine_tune_at} onwards...")

for i, layer in enumerate(base_model.layers):
    if i < fine_tune_at:
        layer.trainable = False
    else:
        # Check if it's a BatchNormalization layer
        if "batch_normalization" in layer.name.lower() or isinstance(layer, tf.keras.layers.BatchNormalization):
            layer.trainable = False
        else:
            layer.trainable = True

trainable_base_count = sum(1 for l in base_model.layers if l.trainable)
print(f"  - Base layers marked as trainable: {trainable_base_count} (BatchNormalization layers kept frozen)")

# Re-compile model with very small learning rate
print("Re-compiling model with Adam(learning_rate=1e-5)...")
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

model.summary()

# ============================================================
# MODEL TRAINING (FINE-TUNING)
# ============================================================
MAX_EPOCHS = 10
model_save_path = MODELS_DIR / "soil_classifier_v3.keras"

callbacks = [
    EarlyStopping(
        monitor="val_loss",
        patience=3,
        restore_best_weights=True,
        verbose=1
    ),
    ModelCheckpoint(
        filepath=str(model_save_path),
        monitor="val_loss",
        save_best_only=True,
        mode="min",
        verbose=1
    )
]

print(f"Starting training (max epochs: {MAX_EPOCHS})...")
history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=MAX_EPOCHS,
    callbacks=callbacks
)

print("\nFine-tuning complete.")

# Ensure the best weights are saved to the target file
model.save(str(model_save_path))
print(f"Final V3 model saved to: {model_save_path}\n")

# ============================================================
# EVALUATION ON TEST DATASET
# ============================================================
print("Evaluating V3 model on test dataset...")
test_loss, test_acc = model.evaluate(test_ds, verbose=0)
print(f"Test Loss     : {test_loss:.4f}")
print(f"Test Accuracy : {test_acc:.4f}\n")

# Compute detailed metrics
print("Predicting on test set to compute confusion matrix and detailed metrics...")
y_true = []
y_pred = []

for images, labels in test_ds:
    preds = model.predict(images, verbose=0)
    y_true.extend(np.argmax(labels.numpy(), axis=1))
    y_pred.extend(np.argmax(preds, axis=1))

y_true = np.array(y_true)
y_pred = np.array(y_pred)

# General metrics
accuracy = accuracy_score(y_true, y_pred)
precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="macro")

correct = int(np.sum(y_true == y_pred))
incorrect = len(y_true) - correct

print(f"Correct Predictions   : {correct}")
print(f"Incorrect Predictions : {incorrect}")

# Confusion matrix
cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(10, 8))
sns.heatmap(
    cm,
    annot=True,
    fmt="d",
    xticklabels=class_names,
    yticklabels=class_names,
    cmap="Blues"
)
plt.title("Confusion Matrix - Soil Classification V3")
plt.ylabel("True Class")
plt.xlabel("Predicted Class")
plt.tight_layout()
cm_plot_path = OUTPUTS_DIR / "confusion_matrix.png"
plt.savefig(cm_plot_path)
plt.close()
print(f"Saved confusion matrix plot to: {cm_plot_path}")

# Per-class metrics
report = classification_report(y_true, y_pred, target_names=class_names, output_dict=True)
metrics = {
    "test_accuracy": test_acc,
    "macro_precision": precision,
    "macro_recall": recall,
    "macro_f1": f1,
    "correct_predictions": correct,
    "incorrect_predictions": incorrect,
    "per_class_metrics": {
        name: {
            "precision": report[name]["precision"],
            "recall": report[name]["recall"],
            "f1-score": report[name]["f1-score"],
            "support": report[name]["support"]
        } for name in class_names
    },
    "history": {
        "loss": [float(x) for x in history.history["loss"]],
        "accuracy": [float(x) for x in history.history["accuracy"]],
        "val_loss": [float(x) for x in history.history["val_loss"]],
        "val_accuracy": [float(x) for x in history.history["val_accuracy"]],
        "actual_epochs": len(history.history["loss"]),
        "best_epoch": int(np.argmin(history.history["val_loss"])) + 1
    }
}

metrics_path = OUTPUTS_DIR / "metrics.json"
with open(metrics_path, "w", encoding="utf-8") as f:
    json.dump(metrics, f, indent=4)
print(f"Saved evaluation metrics to: {metrics_path}")

print("\nPipeline execution finished successfully!")
