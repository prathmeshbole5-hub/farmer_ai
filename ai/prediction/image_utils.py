# Image pre/post-processing utils

import os
import numpy as np
from tensorflow.keras.preprocessing import image

IMG_HEIGHT = 224
IMG_WIDTH = 224


def preprocess_image(image_path):
    # Check image exists
    if not os.path.exists(image_path):
        raise FileNotFoundError(
            f"Image not found:\n{image_path}"
        )

    print(f"\nLoading Image:\n{image_path}")

    # Load image and force RGB
    img = image.load_img(
        image_path,
        target_size=(IMG_HEIGHT, IMG_WIDTH),
        color_mode="rgb"
    )

    # Convert to numpy array
    img_array = image.img_to_array(img)

    # Convert to float32
    img_array = img_array.astype("float32")

    # Normalize (same as training)
    img_array /= 255.0

    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)

    print("Image Shape :", img_array.shape)
    print("Pixel Range :", img_array.min(), "->", img_array.max())

    return img_array