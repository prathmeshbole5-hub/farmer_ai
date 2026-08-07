# Predictor class

import os
import json
import numpy as np
import tensorflow as tf

from prediction.image_utils import preprocess_image

# Get project root folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Paths
MODEL_PATH = os.path.join(BASE_DIR, "models", "plant_disease_model.keras")
LABELS_PATH = os.path.join(BASE_DIR, "models", "labels.json")


# Load model
model = tf.keras.models.load_model(MODEL_PATH)

# Load labels


with open(LABELS_PATH, "r", encoding="utf-8-sig") as file:
    class_labels = json.load(file)

def predict(image_path):
    processed_image = preprocess_image(image_path)

    prediction = model.predict(processed_image, verbose=0)

    predicted_index = np.argmax(prediction)
    confidence = float(np.max(prediction))

    predicted_class = class_labels[str(predicted_index)]

    return predicted_class, confidence