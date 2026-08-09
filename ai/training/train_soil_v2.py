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
OUTPUTS_DIR = BASE_DIR / "outputs" / "soil_classification_v2"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

print("Starting Soil Classification V2 Training Pipeline")
print("=================================================")
print(f"TensorFlow Version : {tf.__version__}")
print(f"Train Directory    : {TRAIN_DIR.resolve()}")
print(f"Val Directory      : {VAL_DIR.resolve()}")
print(f"Test Directory     : {TEST_DIR.resolve()}")
print(f"Models Directory   : {MODELS_DIR.resolve()}")
print(f"Outputs Directory  : {OUTPUTS_DIR.resolve()}")
print("=================================================\n")

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

# Save V2 class labels mapping file
class_labels = {str(i): name for i, name in enumerate(class_names)}
labels_path = MODELS_DIR / "soil_labels_v2.json"
with open(labels_path, "w", encoding="utf-8") as f:
    json.dump(class_labels, f, indent=4)
print(f"Saved class labels V2 to: {labels_path}\n")

# ============================================================
# CLASS IMBALANCE HANDLING (EXPLANATION)
# ============================================================
# Since our training set is now perfectly balanced with 300 samples
# per class, we do not need to calculate or apply custom class weights.
# We will use uniform class weights (None) to prevent the model from 
# over-predicting minority classes artificially.
print("Using uniform class weights since the V2 training dataset is already balanced.")

# ============================================================
# MODEL DEFINITION (MobileNetV2 Transfer Learning)
# ============================================================
print("Building MobileNetV2 V2 transfer learning model...")

# Augmentation layer (only active during training)
data_augmentation = tf.keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.1),
    layers.RandomZoom(0.1)
], name="data_augmentation")

# Input & Preprocessing
inputs = layers.Input(shape=(224, 224, 3))
x = data_augmentation(inputs)
# MobileNetV2 preprocessing expects [-1, 1], so we scale [0, 255] accordingly
x = layers.Rescaling(1./127.5, offset=-1.0)(x)

# Feature Extractor
base_model = tf.keras.applications.MobileNetV2(
    input_shape=(224, 224, 3),
    include_top=False,
    weights="imagenet"
)
base_model.trainable = False

x = base_model(x, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.2)(x)
outputs = layers.Dense(num_classes, activation="softmax")(x)

model = tf.keras.Model(inputs, outputs)

# Optimizer & compilation
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

model.summary()

# ============================================================
# MODEL TRAINING
# ============================================================
MAX_EPOCHS = 15
model_save_path = MODELS_DIR / "soil_classifier_v2.keras"

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

print("\nTraining complete.")

# Ensure the best weights are saved to the target file
model.save(str(model_save_path))
print(f"Final V2 model saved to: {model_save_path}\n")

# ============================================================
# EVALUATION ON TEST DATASET
# ============================================================
print("Evaluating V2 model on test dataset...")
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
plt.title("Confusion Matrix - Soil Classification V2")
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
