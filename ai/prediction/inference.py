from prediction.predictor import predict
import os

IMAGE_PATH = os.path.join(
    "dataset",
    "PlantVillage",
    "Potato___Late_blight",
    "0acdc2b2-0dde-4073-8542-6fca275ab974___RS_LB 4857.JPG"
)

print("Current folder:", os.getcwd())
print("Image exists:", os.path.exists(IMAGE_PATH))

disease, confidence = predict(IMAGE_PATH)

print("=" * 40)
print("Prediction :", disease)
print("Confidence :", round(confidence * 100, 2), "%")
print("=" * 40)