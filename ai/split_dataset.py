import os
import shutil
import random
from pathlib import Path

# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
SOURCE_DIR = BASE_DIR / "Dataset" / "archive" / "Orignal-Dataset"
OUTPUT_DIR = BASE_DIR / "Dataset" / "soil_classification"

TRAIN_RATIO = 0.70
VALIDATION_RATIO = 0.15
TEST_RATIO = 0.15

SEED = 42
random.seed(SEED)

# ============================================================
# CHECK SOURCE DATASET
# ============================================================

if not SOURCE_DIR.exists():
    raise FileNotFoundError(
        f"Dataset not found at: {SOURCE_DIR.resolve()}"
    )

print("Source dataset:")
print(SOURCE_DIR.resolve())
print()

# ============================================================
# CLEAN AND CREATE OUTPUT DIRECTORIES
# ============================================================

# First inspect output directories
print("Inspecting output split directories under:")
print(OUTPUT_DIR.resolve())

# Safely clean ONLY the generated split directories
for split in ["train", "validation", "test"]:
    split_dir = OUTPUT_DIR / split
    if split_dir.exists():
        print(f"Cleaning existing split directory: {split_dir.resolve()}")
        # Delete subdirectories and files inside split_dir
        for child in split_dir.iterdir():
            if child.is_dir():
                shutil.rmtree(child)
            else:
                child.unlink()
    else:
        split_dir.mkdir(parents=True, exist_ok=True)

print("Output directories prepared and cleared.\n")

# ============================================================
# FIND SOIL CLASSES
# ============================================================

classes = [
    folder.name
    for folder in SOURCE_DIR.iterdir()
    if folder.is_dir()
]

classes.sort()

print("Classes found:")
for class_name in classes:
    print(" -", class_name)

print()

# ============================================================
# IMAGE EXTENSIONS
# ============================================================

IMAGE_EXTENSIONS = (
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp"
)

# ============================================================
# SPLIT DATASET
# ============================================================

total_images_processed = 0
train_total = 0
val_total = 0
test_total = 0

split_data = {}

# Count the files and calculate splits first, to print the summary before copying
print("Dataset split summary (Plan):")
print("=" * 60)

for class_name in classes:
    source_class_dir = SOURCE_DIR / class_name
    
    images = [
        file.name
        for file in source_class_dir.iterdir()
        if file.is_file() and file.name.lower().endswith(IMAGE_EXTENSIONS)
    ]
    
    # Store sorted to have consistent shuffle order with SEED
    images.sort()
    random.shuffle(images)
    
    total = len(images)
    
    train_count = int(total * TRAIN_RATIO)
    validation_count = int(total * VALIDATION_RATIO)
    
    train_images = images[:train_count]
    validation_images = images[
        train_count : train_count + validation_count
    ]
    test_images = images[train_count + validation_count :]
    
    split_data[class_name] = {
        "images": images,
        "train": train_images,
        "validation": validation_images,
        "test": test_images,
        "source_dir": source_class_dir
    }
    
    print(f"{class_name}:")
    print(f"  Total      : {total}")
    print(f"  Train      : {len(train_images)}")
    print(f"  Validation : {len(validation_images)}")
    print(f"  Test       : {len(test_images)}")
    print()

print("=" * 60)
print("Starting copy operations...\n")

# Copy the images
for class_name, data in split_data.items():
    source_class_dir = data["source_dir"]
    
    # Create the class folders in the split directories
    for split in ["train", "validation", "test"]:
        (OUTPUT_DIR / split / class_name).mkdir(parents=True, exist_ok=True)
        
    # Copy images to train
    for img in data["train"]:
        shutil.copy2(source_class_dir / img, OUTPUT_DIR / "train" / class_name / img)
    # Copy images to validation
    for img in data["validation"]:
        shutil.copy2(source_class_dir / img, OUTPUT_DIR / "validation" / class_name / img)
    # Copy images to test
    for img in data["test"]:
        shutil.copy2(source_class_dir / img, OUTPUT_DIR / "test" / class_name / img)
        
    total_images_processed += len(data["images"])
    train_total += len(data["train"])
    val_total += len(data["validation"])
    test_total += len(data["test"])

# ============================================================
# POST-SPLIT VERIFICATION
# ============================================================

print("Performing validation checks...")

# 1. Check every class exists in train/validation/test and has correct counts
# and no empty directories
for class_name in classes:
    for split in ["train", "validation", "test"]:
        split_class_dir = OUTPUT_DIR / split / class_name
        if not split_class_dir.exists():
            raise AssertionError(f"Verification Failed: {split_class_dir} does not exist!")
            
        copied_images = [
            f.name for f in split_class_dir.iterdir() if f.is_file()
        ]
        
        expected_count = len(split_data[class_name][split])
        if len(copied_images) != expected_count:
            raise AssertionError(
                f"Verification Failed: {split}/{class_name} has {len(copied_images)} files, expected {expected_count}!"
            )
            
        if expected_count == 0:
            raise AssertionError(
                f"Verification Failed: {split}/{class_name} has 0 expected files, leaving an empty class directory!"
            )

# 2. Verify no files were deleted from original dataset
for class_name in classes:
    source_class_dir = SOURCE_DIR / class_name
    current_files = [
        f.name for f in source_class_dir.iterdir() if f.is_file() and f.name.lower().endswith(IMAGE_EXTENSIONS)
    ]
    expected_original_count = len(split_data[class_name]["images"])
    if len(current_files) != expected_original_count:
        raise AssertionError(
            f"Verification Failed: Original dataset class {class_name} was modified! Found {len(current_files)} files, expected {expected_original_count}."
        )

# 3. Verify total number of copied images matches the split sum
actual_total_copied = 0
for split in ["train", "validation", "test"]:
    for class_name in classes:
        actual_total_copied += len([f for f in (OUTPUT_DIR / split / class_name).iterdir() if f.is_file()])

expected_total_copied = train_total + val_total + test_total
if actual_total_copied != expected_total_copied:
    raise AssertionError(
        f"Verification Failed: Total copied images is {actual_total_copied}, expected {expected_total_copied}."
    )

if actual_total_copied != total_images_processed:
    raise AssertionError(
        f"Verification Failed: Total copied images ({actual_total_copied}) does not match total processed ({total_images_processed})."
    )

print("All validation checks passed successfully!")
print("=" * 60)
print("DATASET SPLIT COMPLETE AND VERIFIED")
print("=" * 60)
print(f"Total original images: {total_images_processed}")
print(f"Train images: {train_total}")
print(f"Validation images: {val_total}")
print(f"Test images: {test_total}")
print(f"Output directory: {OUTPUT_DIR.resolve()}")