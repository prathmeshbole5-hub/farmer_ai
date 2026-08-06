import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import os

print("TensorFlow Version:", tf.__version__)

# ==========================
# Dataset Configuration
# ==========================

DATASET_PATH = "dataset/PlantVillage"

IMG_HEIGHT = 224
IMG_WIDTH = 224
BATCH_SIZE = 32
EPOCHS = 18

# ==========================
# Data Preprocessing
# ==========================

train_datagen = ImageDataGenerator(
    rescale=1.0 / 255,
    validation_split=0.2
)

train_dataset = train_datagen.flow_from_directory(
    DATASET_PATH,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    subset="training",
    shuffle=True
)

validation_dataset = train_datagen.flow_from_directory(
    DATASET_PATH,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    subset="validation",
    shuffle=False
)

print("\nClass Mapping:")
print(train_dataset.class_indices)

NUM_CLASSES = len(train_dataset.class_indices)

print(f"\nNumber of Classes: {NUM_CLASSES}")

# ==========================
# Build CNN Model
# ==========================

model = tf.keras.Sequential([

    tf.keras.layers.Input(shape=(IMG_HEIGHT, IMG_WIDTH, 3)),

    tf.keras.layers.Conv2D(
        32,
        (3, 3),
        activation="relu"
    ),
    tf.keras.layers.MaxPooling2D((2, 2)),

    tf.keras.layers.Conv2D(
        64,
        (3, 3),
        activation="relu"
    ),
    tf.keras.layers.MaxPooling2D((2, 2)),

    tf.keras.layers.Conv2D(
        128,
        (3, 3),
        activation="relu"
    ),
    tf.keras.layers.MaxPooling2D((2, 2)),

    tf.keras.layers.Flatten(),

    tf.keras.layers.Dense(
        128,
        activation="relu"
    ),

    tf.keras.layers.Dropout(0.5),

    tf.keras.layers.Dense(
        NUM_CLASSES,
        activation="softmax"
    )

])

# ==========================
# Compile Model
# ==========================

model.compile(
    optimizer="adam",
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

print("\nModel Summary:")
model.summary()

# ==========================
# Train Model
# ==========================

history = model.fit(
    train_dataset,
    validation_data=validation_dataset,
    epochs=EPOCHS
)

# ==========================
# Save Model
# ==========================

os.makedirs("models", exist_ok=True)

model.save("models/plant_disease_model.keras")

print("\nModel saved successfully!")

# ==========================
# Evaluate Model
# ==========================

loss, accuracy = model.evaluate(validation_dataset)

print(f"\nValidation Loss: {loss:.4f}")
print(f"Validation Accuracy: {accuracy:.4f}")

print("\nTraining Completed Successfully!")