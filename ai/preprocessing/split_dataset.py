"""
KrishiMitra AI - Quality Grader Dataset Preprocessing & Leakage-Safe Splitting
Handles:
1. Exact duplicate group analysis and conflicting label detection
2. Fresh (0) / Rotten (1) binary quality mapping
3. Leakage-safe grouped stratification (Train 70% / Val 15% / Test 15%)
4. Clean dataset generation under ai/dataset/processed/
5. Metadata generation under ai/metadata/quality_grader_dataset.json
6. Complete post-split verification
"""

import os
import sys
import json
import shutil
import hashlib
import random
from pathlib import Path
from collections import defaultdict, Counter
from PIL import Image

def run_quality_grader_splitting(
    source_dir: str = None,
    output_dir: str = None,
    metadata_file: str = None,
    seed: int = 42
):
    # Paths setup
    base_dir = Path(__file__).resolve().parent.parent
    source_path = Path(source_dir).resolve() if source_dir else (base_dir / "dataset" / "Fruits_Vegetables_Dataset(12000)")
    output_path = Path(output_dir).resolve() if output_dir else (base_dir / "dataset" / "processed")
    meta_path = Path(metadata_file).resolve() if metadata_file else (base_dir / "metadata" / "quality_grader_dataset.json")

    print("=" * 80)
    print("KRISHIMITRA AI - QUALITY GRADER DATASET PROCESSING & SPLITTING")
    print(f"Source:   {source_path}")
    print(f"Output:   {output_path}")
    print(f"Metadata: {meta_path}")
    print("=" * 80)

    if not source_path.exists():
        raise FileNotFoundError(f"Source dataset directory not found at: {source_path}")

    # Set random seed
    random.seed(seed)

    # 1. SCAN AND MAP ALL ORIGINAL IMAGES
    print("\n[Step 1/6] Scanning and validating original dataset files...")
    image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}
    
    file_records = []
    hash_to_records = defaultdict(list)
    corrupted_images = []
    
    for root, dirs, files in os.walk(source_path):
        rel_path = Path(root).relative_to(source_path)
        parts = rel_path.parts
        
        for fname in files:
            fpath = Path(root) / fname
            ext = fpath.suffix.lower()
            if ext not in image_extensions:
                continue

            # Identify category, class, quality label
            if len(parts) >= 2:
                top_category = parts[0]
                class_name = parts[1]
            elif len(parts) == 1:
                top_category = "General"
                class_name = parts[0]
            else:
                top_category = "General"
                class_name = "Unknown"

            # Determine quality target label
            if class_name.lower().startswith("fresh"):
                quality_label = "Fresh"
                quality_id = 0
                commodity = class_name[5:]
            elif class_name.lower().startswith("rotten"):
                quality_label = "Rotten"
                quality_id = 1
                commodity = class_name[6:]
            else:
                quality_label = "Unknown"
                quality_id = -1
                commodity = class_name

            # Verify image & compute MD5
            try:
                with open(fpath, "rb") as f_obj:
                    file_bytes = f_obj.read()
                    file_hash = hashlib.md5(file_bytes).hexdigest()

                with Image.open(fpath) as img:
                    img.verify()

                record = {
                    "path": fpath,
                    "filename": fname,
                    "rel_path": str(fpath.relative_to(source_path)),
                    "top_category": top_category,
                    "class_name": class_name,
                    "commodity": commodity,
                    "quality_label": quality_label,
                    "quality_id": quality_id,
                    "hash": file_hash,
                    "size_bytes": len(file_bytes)
                }
                file_records.append(record)
                hash_to_records[file_hash].append(record)
            except Exception as e:
                corrupted_images.append({"path": str(fpath), "error": str(e)})

    total_original = len(file_records)
    print(f"      Scanned {total_original} images across {len(hash_to_records)} unique image hashes.")
    if corrupted_images:
        print(f"      WARNING: Found {len(corrupted_images)} unreadable images!")
    else:
        print(f"      All {total_original} images verified uncorrupted.")

    # 2. DUPLICATE & CONFLICT ANALYSIS
    print("\n[Step 2/6] Performing deep duplicate & cross-label conflict analysis...")
    duplicate_groups = {h: recs for h, recs in hash_to_records.items() if len(recs) > 1}
    
    duplicates_within_same_class = 0
    duplicates_cross_commodity_same_label = 0
    duplicates_conflicting_labels = 0
    
    conflicting_hash_groups = []
    usable_records = []
    removed_records = []
    warnings = []

    for h, recs in hash_to_records.items():
        quality_labels = set(r["quality_label"] for r in recs)
        class_names = set(r["class_name"] for r in recs)

        if len(quality_labels) > 1:
            # Conflicting label: Same image labeled as BOTH Fresh and Rotten!
            duplicates_conflicting_labels += 1
            conflicting_hash_groups.append({
                "hash": h,
                "classes": list(class_names),
                "labels": list(quality_labels),
                "paths": [r["rel_path"] for r in recs]
            })
            for r in recs:
                removed_records.append(r)
            warnings.append(
                f"CRITICAL CONFLICT: Image hash {h[:8]} has conflicting labels {list(quality_labels)} across classes {list(class_names)}. Removed all {len(recs)} copies to prevent label corruption."
            )
        else:
            # All copies agree on quality label
            if len(recs) > 1:
                if len(class_names) == 1:
                    duplicates_within_same_class += (len(recs) - 1)
                else:
                    duplicates_cross_commodity_same_label += (len(recs) - 1)
            
            for r in recs:
                usable_records.append(r)

    print(f"      Total duplicate hash groups: {len(duplicate_groups)} (comprising {sum(len(v) for v in duplicate_groups.values())} files)")
    print(f"      - Duplicate instances within same class: {duplicates_within_same_class}")
    print(f"      - Duplicate instances across classes with SAME label: {duplicates_cross_commodity_same_label}")
    print(f"      - Conflicting duplicate groups (Fresh vs Rotten): {duplicates_conflicting_labels}")
    print(f"      - Usable images for splitting: {len(usable_records)}")
    print(f"      - Removed/Ignored images: {len(removed_records)}")

    # 3. GROUPED STRATIFIED SPLIT (LEAKAGE SAFE)
    print("\n[Step 3/6] Generating Leakage-Safe Stratified Splits (70/15/15)...")
    # Group usable records by hash to guarantee that all copies of an image stay together
    hash_to_usable = defaultdict(list)
    for r in usable_records:
        hash_to_usable[r["hash"]].append(r)

    # Sub-stratify by (commodity, quality_label)
    strata = defaultdict(list)
    for h, recs in hash_to_usable.items():
        # Representative group key from the first record
        rep = recs[0]
        stratum_key = (rep["commodity"], rep["quality_label"])
        strata[stratum_key].append(recs)

    train_records = []
    val_records = []
    test_records = []

    for stratum_key, group_list in sorted(strata.items()):
        # Shuffle group bundles reproducibly
        random.shuffle(group_list)
        
        # Calculate target item counts
        stratum_total_items = sum(len(g) for g in group_list)
        target_train_items = int(round(stratum_total_items * 0.70))
        target_val_items = int(round(stratum_total_items * 0.15))
        
        cur_train_items = 0
        cur_val_items = 0
        
        for g in group_list:
            g_len = len(g)
            if cur_train_items + g_len <= target_train_items or (cur_train_items < target_train_items and cur_val_items >= target_val_items):
                train_records.extend(g)
                cur_train_items += g_len
            elif cur_val_items + g_len <= target_val_items or (cur_val_items < target_val_items):
                val_records.extend(g)
                cur_val_items += g_len
            else:
                test_records.extend(g)

    # 4. PREPARE OUTPUT DIRECTORIES AND COPY FILES
    print("\n[Step 4/6] Creating clean processed dataset directories and copying files...")
    if output_path.exists():
        print(f"      Cleaning existing output directory: {output_path}")
        shutil.rmtree(output_path)
    output_path.mkdir(parents=True, exist_ok=True)

    splits_map = {
        "train": train_records,
        "validation": val_records,
        "test": test_records
    }

    for split_name, records in splits_map.items():
        for q_label in ["Fresh", "Rotten"]:
            (output_path / split_name / q_label).mkdir(parents=True, exist_ok=True)

        for r in records:
            src = r["path"]
            # Disambiguate destination filename cleanly to prevent collisions
            dest_filename = f"{r['top_category']}_{r['class_name']}_{r['filename']}"
            dst = output_path / split_name / r["quality_label"] / dest_filename
            shutil.copy2(src, dst)
            r["dest_path"] = str(dst)

    # 5. POST-SPLIT VALIDATION & LEAKAGE VERIFICATION
    print("\n[Step 5/6] Verifying output dataset integrity and leak safety...")
    train_hashes = set()
    val_hashes = set()
    test_hashes = set()
    
    split_counts = {
        "train": {"Fresh": 0, "Rotten": 0, "total": 0},
        "validation": {"Fresh": 0, "Rotten": 0, "total": 0},
        "test": {"Fresh": 0, "Rotten": 0, "total": 0}
    }

    for split_name in ["train", "validation", "test"]:
        for q_label in ["Fresh", "Rotten"]:
            dir_to_check = output_path / split_name / q_label
            files_in_dir = list(dir_to_check.iterdir())
            count = len(files_in_dir)
            split_counts[split_name][q_label] = count
            split_counts[split_name]["total"] += count

            for f in files_in_dir:
                # verify image readability in destination
                with open(f, "rb") as f_obj:
                    f_hash = hashlib.md5(f_obj.read()).hexdigest()
                with Image.open(f) as img:
                    img.verify()
                
                if split_name == "train":
                    train_hashes.add(f_hash)
                elif split_name == "validation":
                    val_hashes.add(f_hash)
                elif split_name == "test":
                    test_hashes.add(f_hash)

    # Verify zero overlap between split hashes
    leak_train_val = train_hashes.intersection(val_hashes)
    leak_train_test = train_hashes.intersection(test_hashes)
    leak_val_test = val_hashes.intersection(test_hashes)

    if leak_train_val or leak_train_test or leak_val_test:
        raise RuntimeError(
            f"DATA LEAKAGE DETECTED!\n"
            f"Train/Val overlap: {len(leak_train_val)}\n"
            f"Train/Test overlap: {len(leak_train_test)}\n"
            f"Val/Test overlap: {len(leak_val_test)}"
        )
    print("      [PASSED] Leakage check: 0 image hashes overlap across train, validation, and test splits.")

    total_copied = sum(split_counts[s]["total"] for s in ["train", "validation", "test"])
    if total_copied != len(usable_records):
        raise RuntimeError(f"Count mismatch! Copied {total_copied}, expected {len(usable_records)}")
    print(f"      [PASSED] Total count check: All {total_copied} usable images successfully copied.")

    # 6. WRITE METADATA JSON
    print("\n[Step 6/6] Writing dataset metadata JSON...")
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    
    fresh_total = sum(1 for r in usable_records if r["quality_label"] == "Fresh")
    rotten_total = sum(1 for r in usable_records if r["quality_label"] == "Rotten")

    metadata = {
        "dataset_name": "KrishiMitra AI Quality Grader Processed Dataset",
        "class_mapping": {
            "Fresh": 0,
            "Rotten": 1
        },
        "target_attribute": "quality_label",
        "total_original_images": total_original,
        "total_usable_images": len(usable_records),
        "removed_ignored_images": len(removed_records),
        "quality_counts": {
            "Fresh": fresh_total,
            "Rotten": rotten_total
        },
        "splits": {
            "train": {
                "total": split_counts["train"]["total"],
                "Fresh": split_counts["train"]["Fresh"],
                "Rotten": split_counts["train"]["Rotten"],
                "ratio": round(split_counts["train"]["total"] / len(usable_records), 4)
            },
            "validation": {
                "total": split_counts["validation"]["total"],
                "Fresh": split_counts["validation"]["Fresh"],
                "Rotten": split_counts["validation"]["Rotten"],
                "ratio": round(split_counts["validation"]["total"] / len(usable_records), 4)
            },
            "test": {
                "total": split_counts["test"]["total"],
                "Fresh": split_counts["test"]["Fresh"],
                "Rotten": split_counts["test"]["Rotten"],
                "ratio": round(split_counts["test"]["total"] / len(usable_records), 4)
            }
        },
        "duplicate_analysis": {
            "total_duplicate_groups": len(duplicate_groups),
            "duplicate_files_count": sum(len(v) for v in duplicate_groups.values()),
            "duplicates_within_same_class": duplicates_within_same_class,
            "duplicates_cross_commodity_same_label": duplicates_cross_commodity_same_label,
            "duplicates_conflicting_labels": duplicates_conflicting_labels,
            "leakage_protection": "Exact duplicate hash bundles assigned atomically to the same split partition"
        },
        "conflicting_duplicate_groups": conflicting_hash_groups,
        "warnings": warnings,
        "seed": seed
    }

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"      Metadata successfully saved to {meta_path}")

    # PRINT FINAL REPORT
    print("\n" + "=" * 80)
    print("                    DATASET PREPROCESSING & SPLIT REPORT")
    print("=" * 80)
    print(f"Original Dataset:        {total_original} images")
    print(f"Removed / Conflicting:   {len(removed_records)} images")
    print(f"Total Usable Images:     {len(usable_records)} images")
    print(f"Target Label Mapping:    Fresh = 0, Rotten = 1\n")

    print(f"{'Split':<15} | {'Fresh (0)':<12} | {'Rotten (1)':<12} | {'Total':<10} | {'Percentage':<10}")
    print("-" * 65)
    for s_name in ["train", "validation", "test"]:
        f_cnt = split_counts[s_name]["Fresh"]
        r_cnt = split_counts[s_name]["Rotten"]
        t_cnt = split_counts[s_name]["total"]
        pct = (t_cnt / len(usable_records)) * 100
        print(f"{s_name.capitalize():<15} | {f_cnt:<12} | {r_cnt:<12} | {t_cnt:<10} | {pct:>6.2f}%")
    print("-" * 65)
    print(f"{'Total Processed':<15} | {fresh_total:<12} | {rotten_total:<12} | {total_copied:<10} | {'100.00%':>7}")
    print("=" * 80)

    return metadata

if __name__ == "__main__":
    run_quality_grader_splitting()
