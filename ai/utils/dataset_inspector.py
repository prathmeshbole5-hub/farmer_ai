"""
Dataset Inspector Utility for KrishiMitra AI Quality Grader Dataset
Performs comprehensive programmatic inspection of image dataset.
"""

import os
import sys
import hashlib
from collections import defaultdict, Counter
from pathlib import Path
from PIL import Image

def inspect_dataset(dataset_dir: str):
    dataset_path = Path(dataset_dir).resolve()
    print(f"=" * 80)
    print(f"KRISHIMITRA AI - DATASET INSPECTION REPORT")
    print(f"Target Directory: {dataset_path}")
    print(f"=" * 80)

    if not dataset_path.exists():
        print(f"ERROR: Dataset directory '{dataset_path}' does not exist.")
        return

    # Trackers
    all_files = []
    metadata_files = []
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff', '.tif', '.gif'}
    ext_counter = Counter()
    non_image_files = []

    # File structure & split check
    subdirs = [d.name.lower() for d in dataset_path.iterdir() if d.is_dir()]
    split_keywords = {'train', 'val', 'valid', 'validation', 'test'}
    has_top_level_splits = any(k in subdirs for k in split_keywords)

    # Class and category mapping
    fruit_classes = defaultdict(list)
    vegetable_classes = defaultdict(list)
    other_classes = defaultdict(list)
    
    # Image properties
    dimensions = Counter()
    color_modes = Counter()
    file_formats = Counter()
    corrupted_files = []
    file_hashes = defaultdict(list)
    zero_byte_files = []

    total_images = 0

    print("\n[1/4] Scanning all files and directory structure...")
    for root, dirs, files in os.walk(dataset_path):
        rel_root = Path(root).relative_to(dataset_path)
        for f in files:
            file_path = Path(root) / f
            file_ext = file_path.suffix.lower()
            ext_counter[file_ext] += 1

            if file_ext in {'.csv', '.json', '.txt', '.xml', '.yaml', '.yml'}:
                metadata_files.append(str(file_path.relative_to(dataset_path)))

            if file_ext in image_extensions:
                total_images += 1
                all_files.append(file_path)

                # Class identification based on directory hierarchy
                parts = rel_root.parts
                if len(parts) >= 2:
                    top_category = parts[0].strip()
                    class_name = parts[1].strip()
                    if top_category.lower() == 'fruits':
                        fruit_classes[class_name].append(file_path)
                    elif top_category.lower() == 'vegetables':
                        vegetable_classes[class_name].append(file_path)
                    else:
                        other_classes[f"{top_category}/{class_name}"].append(file_path)
                elif len(parts) == 1:
                    class_name = parts[0].strip()
                    other_classes[class_name].append(file_path)
                else:
                    other_classes["root"].append(file_path)
            else:
                non_image_files.append(str(file_path.relative_to(dataset_path)))

    print(f"      Total files found: {sum(ext_counter.values())}")
    print(f"      Total image files: {total_images}")

    # Check for inner split directories
    has_inner_splits = False
    for root, dirs, files in os.walk(dataset_path):
        d_lower = [d.lower() for d in dirs]
        if any(k in d_lower for k in split_keywords):
            has_inner_splits = True
            break

    print("\n[2/4] Verifying image integrity, color modes, dimensions, and duplicates...")
    for idx, img_path in enumerate(all_files, 1):
        if idx % 2000 == 0 or idx == total_images:
            print(f"      Processed {idx}/{total_images} images...")

        # Check zero-byte
        try:
            sz = os.path.getsize(img_path)
            if sz == 0:
                zero_byte_files.append(str(img_path))
                corrupted_files.append((str(img_path), "Zero-byte file"))
                continue
        except Exception as e:
            corrupted_files.append((str(img_path), f"Stat error: {e}"))
            continue

        # Hash for duplicates
        try:
            with open(img_path, 'rb') as f_obj:
                file_hash = hashlib.md5(f_obj.read()).hexdigest()
                file_hashes[file_hash].append(img_path)
        except Exception as e:
            corrupted_files.append((str(img_path), f"Read error: {e}"))
            continue

        # PIL integrity verification
        try:
            with Image.open(img_path) as img:
                img.verify()
            
            # Reopen to read mode & size
            with Image.open(img_path) as img:
                dimensions[img.size] += 1
                color_modes[img.mode] += 1
                file_formats[img.format] += 1
        except Exception as e:
            corrupted_files.append((str(img_path), f"PIL error: {e}"))

    # Duplicate analysis
    duplicate_groups = {h: paths for h, paths in file_hashes.items() if len(paths) > 1}
    total_duplicate_images = sum(len(paths) - 1 for paths in duplicate_groups.values())

    # Combine all unique classes
    all_classes_map = {}
    for c, imgs in fruit_classes.items():
        all_classes_map[f"Fruits/{c}"] = len(imgs)
    for c, imgs in vegetable_classes.items():
        all_classes_map[f"Vegetables/{c}"] = len(imgs)
    for c, imgs in other_classes.items():
        all_classes_map[c] = len(imgs)

    total_fruit_images = sum(len(v) for v in fruit_classes.values())
    total_veg_images = sum(len(v) for v in vegetable_classes.values())
    total_other_images = sum(len(v) for v in other_classes.values())
    total_classes_count = len(all_classes_map)

    # Class balance calculation
    counts = list(all_classes_map.values())
    if counts:
        min_count = min(counts)
        max_count = max(counts)
        avg_count = sum(counts) / len(counts)
        imbalance_ratio = max_count / min_count if min_count > 0 else float('inf')
    else:
        min_count = max_count = avg_count = imbalance_ratio = 0

    print("\n" + "=" * 80)
    print("                      DETAILED INSPECTION RESULTS")
    print("=" * 80)

    # 1. Total image files
    print(f"\n1. EXACT TOTAL NUMBER OF IMAGE FILES: {total_images}")

    # 2. Exact number of classes
    print(f"2. EXACT NUMBER OF CLASSES: {total_classes_count}")
    print(f"   - Fruit classes: {len(fruit_classes)}")
    print(f"   - Vegetable classes: {len(vegetable_classes)}")
    if other_classes:
        print(f"   - Other/Uncategorized classes: {len(other_classes)}")

    # 3 & 4. Class breakdown table
    print(f"\n3 & 4. CLASS BREAKDOWN (Exact Class Names & Image Counts):")
    print(f"--------------------------------------------------------------------------------")
    print(f"{'Category':<15} | {'Class Name':<35} | {'Image Count':<12} | {'Percentage':<10}")
    print(f"--------------------------------------------------------------------------------")
    for c_name in sorted(fruit_classes.keys()):
        cnt = len(fruit_classes[c_name])
        pct = (cnt / total_images * 100) if total_images else 0
        print(f"{'Fruits':<15} | {c_name:<35} | {cnt:<12} | {pct:>6.2f}%")
    print(f"--------------------------------------------------------------------------------")
    for c_name in sorted(vegetable_classes.keys()):
        cnt = len(vegetable_classes[c_name])
        pct = (cnt / total_images * 100) if total_images else 0
        print(f"{'Vegetables':<15} | {c_name:<35} | {cnt:<12} | {pct:>6.2f}%")
    if other_classes:
        print(f"--------------------------------------------------------------------------------")
        for c_name in sorted(other_classes.keys()):
            cnt = len(other_classes[c_name])
            pct = (cnt / total_images * 100) if total_images else 0
            print(f"{'Other':<15} | {c_name:<35} | {cnt:<12} | {pct:>6.2f}%")
    print(f"--------------------------------------------------------------------------------")

    # 5 & 6. Category Totals
    print(f"\n5. TOTAL IMAGES UNDER FRUITS: {total_fruit_images}")
    print(f"6. TOTAL IMAGES UNDER VEGETABLES: {total_veg_images}")
    if total_other_images > 0:
        print(f"   TOTAL IMAGES UNDER OTHER: {total_other_images}")

    # 7. Image dimensions
    print(f"\n7. IMAGE DIMENSIONS:")
    print(f"   - Total unique dimension resolutions: {len(dimensions)}")
    widths = [w for (w, h) in dimensions.keys()]
    heights = [h for (w, h) in dimensions.keys()]
    if widths and heights:
        print(f"   - Width range: min={min(widths)}px, max={max(widths)}px")
        print(f"   - Height range: min={min(heights)}px, max={max(heights)}px")
        print(f"   - Top 10 most common resolutions (Width x Height):")
        for dim, cnt in dimensions.most_common(10):
            print(f"       * {dim[0]} x {dim[1]}: {cnt} images ({cnt/total_images*100:.2f}%)")

    # 8. Color modes
    print(f"\n8. IMAGE COLOR MODES:")
    for mode, cnt in color_modes.most_common():
        print(f"   - {mode}: {cnt} images ({cnt/total_images*100:.2f}%)")

    # 9. File formats & extensions
    print(f"\n9. FILE FORMATS & EXTENSIONS:")
    print(f"   - Extensions found on disk:")
    for ext, cnt in ext_counter.most_common():
        print(f"       * {ext if ext else '(no extension)'}: {cnt} files")
    print(f"   - Internal image formats detected by PIL:")
    for fmt, cnt in file_formats.most_common():
        print(f"       * {fmt}: {cnt} images")

    # 10. Corrupted/unreadable images
    print(f"\n10. CORRUPTED / UNREADABLE IMAGES: {len(corrupted_files)}")
    if corrupted_files:
        for p, err in corrupted_files[:10]:
            print(f"    - {p}: {err}")
        if len(corrupted_files) > 10:
            print(f"    ... and {len(corrupted_files)-10} more.")
    else:
        print("    [PASS] All image files are 100% valid, readable, and verified.")

    # 11. Class balance
    print(f"\n11. CLASS BALANCE ANALYSIS:")
    print(f"    - Min count per class: {min_count}")
    print(f"    - Max count per class: {max_count}")
    print(f"    - Mean count per class: {avg_count:.2f}")
    print(f"    - Imbalance ratio (Max/Min): {imbalance_ratio:.2f}")
    if min_count == max_count:
        print("    - Status: PERFECTLY BALANCED (Every class has the exact same count)")
    elif imbalance_ratio < 1.2:
        print("    - Status: NEARLY BALANCED")
    else:
        print("    - Status: IMBALANCED")

    # 12. Pre-existing splits
    print(f"\n12. PRE-EXISTING TRAIN/VAL/TEST SPLITS:")
    if has_top_level_splits or has_inner_splits:
        print("    - Found pre-existing train/val/test splits.")
    else:
        print("    - NONE. The dataset is currently raw / unsplit.")

    # 13. Annotation / Metadata files
    print(f"\n13. CSV/JSON/TXT ANNOTATION OR METADATA FILES:")
    if metadata_files:
        print(f"    - Found {len(metadata_files)} metadata files:")
        for mf in metadata_files:
            print(f"        * {mf}")
    else:
        print("    - NONE found within the dataset directory.")

    # 14. Problem formulation based ONLY on dataset structure
    print(f"\n14. TASK FORMULATION INFERRED FROM DATASET STRUCTURE:")
    # Check naming conventions for quality grades or commodity types
    has_fresh_rot = any('fresh' in c.lower() or 'rotten' in c.lower() for c in all_classes_map.keys())
    has_grade_abc = any('grade' in c.lower() for c in all_classes_map.keys())
    print(f"    - Directory organization: Standard Hierarchical Multi-Class Classification structure.")
    print(f"    - Top level: 2 Super-categories ('Fruits', 'Vegetables')")
    print(f"    - Leaf level: {total_classes_count} distinct category subfolders.")
    if has_fresh_rot:
        print(f"    - Content type: Freshness/Defect quality classification.")
    elif has_grade_abc:
        print(f"    - Content type: Discrete Quality Grading (A/B/C/etc.).")
    else:
        print(f"    - Content type: Multi-class Commodity / Produce Type Classification.")

    # 15. Duplicates and Suspicious Files
    print(f"\n15. DUPLICATE & SUSPICIOUS FILES:")
    print(f"    - Zero-byte files: {len(zero_byte_files)}")
    print(f"    - Non-image files: {len(non_image_files)}")
    print(f"    - Exact duplicate images (by MD5 hash): {total_duplicate_images} images across {len(duplicate_groups)} distinct hashes.")
    if duplicate_groups:
        print(f"      (Sample duplicate group: {len(list(duplicate_groups.values())[0])} copies of the same image found)")

    print("\n" + "=" * 80)
    print("                    END OF DATASET INSPECTION REPORT")
    print("=" * 80)

if __name__ == "__main__":
    dataset_path = "c:/Users/shreya gupta/Downloads/farmer_ai-main/farmer_ai-main/ai/dataset/Fruits_Vegetables_Dataset(12000)"
    if len(sys.argv) > 1:
        dataset_path = sys.argv[1]
    inspect_dataset(dataset_path)
