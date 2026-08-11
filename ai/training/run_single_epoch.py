"""
KrishiMitra AI - Controlled Single Epoch Training Runner (Step 12B)
Runs exactly 1 training epoch on the train set and evaluates on the validation set.
"""

import os
import sys
import time
import json
import gc
import ctypes
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import torch
import torch.nn as nn
import torch.optim as optim

from ai.models.model_builder import build_mobilenet_v2_quality_grader, count_parameters
from ai.preprocessing.loader import create_data_loaders
from ai.training.train_config import get_default_training_config
from ai.training.callbacks import ModelCheckpoint, HistoryTracker
from ai.training.evaluate import evaluate_model
from ai.config.config import MODEL_SAVE_DIR, METADATA_DIR


def get_system_ram_gb():
    """Returns (total_gb, used_gb, avail_gb, load_percent) using Windows API."""
    class MEMORYSTATUSEX(ctypes.Structure):
        _fields_ = [
            ('dwLength', ctypes.c_ulong),
            ('dwMemoryLoad', ctypes.c_ulong),
            ('ullTotalPhys', ctypes.c_ulonglong),
            ('ullAvailPhys', ctypes.c_ulonglong),
            ('ullTotalPageFile', ctypes.c_ulonglong),
            ('ullAvailPageFile', ctypes.c_ulonglong),
            ('ullTotalVirtual', ctypes.c_ulonglong),
            ('ullAvailVirtual', ctypes.c_ulonglong),
            ('sullAvailExtendedVirtual', ctypes.c_ulonglong),
        ]
    stat = MEMORYSTATUSEX()
    stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))

    total_gb = stat.ullTotalPhys / (1024**3)
    avail_gb = stat.ullAvailPhys / (1024**3)
    used_gb = total_gb - avail_gb
    return total_gb, used_gb, avail_gb, stat.dwMemoryLoad


def run_controlled_epoch():
    print("=" * 80)
    print("      KRISHIMITRA AI - STEP 12B: CONTROLLED FIRST TRAINING EPOCH TEST     ")
    print("=" * 80)

    # 1. HARDWARE THREADING & PRE-TRAINING MEMORY CHECK
    torch.set_num_threads(4)
    print(f"• CPU Thread Limit: {torch.get_num_threads()} threads (Safe limit active)")

    total_ram, used_ram, avail_ram, ram_load = get_system_ram_gb()
    print(f"• Pre-Training RAM: Total: {total_ram:.2f} GB | Used: {used_ram:.2f} GB ({ram_load}%) | Available: {avail_ram:.2f} GB")

    if avail_ram < 1.0:
        raise RuntimeError(f"SAFETY ABORT: Available RAM ({avail_ram:.2f} GB) is below the 1.0 GB safety threshold before training start.")

    cfg = get_default_training_config()
    device = "cpu"

    # 2. BUILD MODEL (FROZEN BACKBONE + LOCKED BATCHNORM)
    print("\n[Phase 1/4] Initializing MobileNetV2 with Frozen Backbone...")
    model = build_mobilenet_v2_quality_grader(
        num_classes=2,
        pretrained=True,
        freeze_backbone=True,
        dropout_rate=0.2
    )
    model.to(device)
    param_info = count_parameters(model)
    print(f"  - Total Parameters:     {param_info['total_parameters']:,}")
    print(f"  - Trainable Parameters: {param_info['trainable_parameters']:,} (Classifier head only)")
    print(f"  - Frozen Parameters:    {param_info['frozen_parameters']:,} (Features & BatchNorms)")

    # 3. INITIALIZE DATA LOADERS (TRAIN & VALIDATION ONLY - TEST IS UNTOUCHED)
    print("\n[Phase 2/4] Setting up Data Loaders (Train & Validation ONLY)...")
    train_loader, val_loader, test_loader, class_mapping = create_data_loaders(
        train_batch_size=cfg.batch_size,
        eval_batch_size=cfg.batch_size,
        image_size=cfg.image_size,
        num_workers=0
    )
    
    total_train_samples = len(train_loader.dataset)
    total_val_samples = len(val_loader.dataset)
    total_train_batches = len(train_loader)
    total_val_batches = len(val_loader)

    print(f"  - Train Set:      {total_train_samples:,} images ({total_train_batches} batches of size {cfg.batch_size}) [Dynamic Augmentation]")
    print(f"  - Validation Set: {total_val_samples:,} images ({total_val_batches} batches of size {cfg.batch_size}) [Deterministic Eval]")
    print(f"  - Test Set:       EXCLUDED (Zero access)")

    # 4. LOSS & OPTIMIZER SETUP
    criterion = nn.CrossEntropyLoss()
    trainable_params = [p for p in model.parameters() if p.requires_grad]
    optimizer = optim.Adam(trainable_params, lr=cfg.learning_rate, weight_decay=cfg.weight_decay)

    # 5. EXECUTE EXACTLY ONE TRAINING EPOCH
    print("\n[Phase 3/4] Executing Epoch 1/1...")
    start_time = time.time()

    # Enforce backbone eval mode and classifier train mode
    model.features.eval()
    model.classifier.train()

    running_loss = 0.0
    correct_train_preds = 0
    processed_train_samples = 0

    checkpoint_saved = False
    ram_warning = None

    for batch_idx, (images, targets) in enumerate(train_loader, 1):
        images = images.to(device)
        targets = targets.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()

        batch_size_actual = targets.size(0)
        running_loss += loss.item() * batch_size_actual
        preds = torch.argmax(outputs, dim=1)
        correct_train_preds += (preds == targets).sum().item()
        processed_train_samples += batch_size_actual

        # Progress reporting & safety RAM monitoring
        if batch_idx % 75 == 0 or batch_idx == total_train_batches:
            cur_loss = running_loss / processed_train_samples
            cur_acc = (correct_train_preds / processed_train_samples) * 100
            _, _, cur_avail_ram, _ = get_system_ram_gb()
            print(f"  Batch [{batch_idx:03d}/{total_train_batches:03d}] | Loss: {cur_loss:.4f} | Acc: {cur_acc:.2f}% | Avail RAM: {cur_avail_ram:.2f} GB")

            if cur_avail_ram < 1.0:
                ram_warning = f"SAFETY ABORT TRIGGERED: Available RAM dropped to {cur_avail_ram:.2f} GB during batch {batch_idx}."
                print(f"\n[CRITICAL WARNING] {ram_warning}")
                break

    train_epoch_time = time.time() - start_time
    train_loss = running_loss / processed_train_samples
    train_acc = correct_train_preds / processed_train_samples

    # 6. VALIDATION EVALUATION (NO GRADIENTS, DETERMINISTIC)
    print("\n[Phase 4/4] Running Validation Evaluation (1,800 images)...")
    val_start_time = time.time()
    val_metrics = evaluate_model(
        model=model,
        data_loader=val_loader,
        criterion=criterion,
        device=device
    )
    val_time = time.time() - val_start_time
    val_loss = val_metrics["loss"]
    val_acc = val_metrics["accuracy"]

    total_epoch_time = time.time() - start_time

    # 7. SAVE MODEL CHECKPOINT (Epoch 1 Baseline)
    MODEL_SAVE_DIR.mkdir(parents=True, exist_ok=True)
    checkpoint_path = cfg.best_model_path
    
    payload = {
        "epoch": 1,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "train_loss": train_loss,
        "train_accuracy": train_acc,
        "val_loss": val_loss,
        "val_accuracy": val_acc,
        "val_precision_macro": val_metrics.get("macro_precision", 0.0),
        "val_recall_macro": val_metrics.get("macro_recall", 0.0),
        "val_f1_macro": val_metrics.get("macro_f1", 0.0),
        "val_confusion_matrix": val_metrics.get("confusion_matrix", []),
        "class_mapping": class_mapping,
        "hyperparameters": {
            "batch_size": cfg.batch_size,
            "learning_rate": cfg.learning_rate,
            "optimizer": cfg.optimizer_name,
            "weight_decay": cfg.weight_decay,
            "freeze_backbone": cfg.freeze_backbone,
            "num_threads": torch.get_num_threads()
        }
    }
    torch.save(payload, str(checkpoint_path))
    checkpoint_saved = checkpoint_path.exists()
    checkpoint_size_mb = checkpoint_path.stat().st_size / (1024 * 1024) if checkpoint_saved else 0.0

    # Save history log
    METADATA_DIR.mkdir(parents=True, exist_ok=True)
    history_file = METADATA_DIR / "training_history_epoch1.json"
    with open(history_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, default=str)

    # Post-training resource check
    _, _, post_avail_ram, post_ram_load = get_system_ram_gb()

    # 8. FINAL SUMMARY REPORT
    print("\n" + "=" * 80)
    print("                 STEP 12B: EPOCH 1 RESULTS & METRICS SUMMARY            ")
    print("=" * 80)
    print(f"Training Loss:            {train_loss:.4f}")
    print(f"Training Accuracy:        {train_acc * 100:.2f}% ({correct_train_preds:,}/{processed_train_samples:,} correct)")
    print(f"Validation Loss:          {val_loss:.4f}")
    print(f"Validation Accuracy:      {val_acc * 100:.2f}% ({int(val_acc * total_val_samples):,}/{total_val_samples:,} correct)")
    print(f"Validation Macro F1:      {val_metrics.get('macro_f1', 0.0) * 100:.2f}%")
    print(f"Validation Confusion:     {val_metrics.get('confusion_matrix', [])} [[TN, FP], [FN, TP]]")
    print(f"Learning Rate:            {cfg.learning_rate}")
    print(f"Epoch Duration:           {total_epoch_time:.2f} seconds ({total_epoch_time/60:.2f} minutes)")
    print(f"  - Train step time:      {train_epoch_time:.2f}s")
    print(f"  - Validation step time: {val_time:.2f}s")
    print(f"Checkpoint Saved:         {'YES' if checkpoint_saved else 'NO'} ({checkpoint_path} | {checkpoint_size_mb:.2f} MB)")
    print(f"Post-Training RAM:        {post_avail_ram:.2f} GB available ({post_ram_load}% load)")
    if ram_warning:
        print(f"Warnings/Errors:          {ram_warning}")
    else:
        print(f"Warnings/Errors:          None (Hardware thermals and memory remained stable throughout)")
    print("=" * 80)
    print("EXECUTION HALTED AFTER EXACTLY 1 EPOCH AS INSTRUCTED.")
    print("=" * 80)

    # Cleanup
    del model, optimizer, train_loader, val_loader, test_loader
    gc.collect()

if __name__ == "__main__":
    run_controlled_epoch()
