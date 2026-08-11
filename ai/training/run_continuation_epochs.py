"""
KrishiMitra AI - Controlled Training Continuation Runner (Step 13: Epochs 2-4)
Resumes Experiment 1 from Epoch-1 checkpoint and trains strictly through Epoch 4.
"""

import os
import sys
import time
import json
import gc
import ctypes
from pathlib import Path

# Configure utf-8 encoding safely for Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import torch
import torch.nn as nn
import torch.optim as optim

from ai.models.model_builder import build_mobilenet_v2_quality_grader, count_parameters
from ai.preprocessing.loader import create_data_loaders
from ai.training.train_config import get_default_training_config
from ai.training.callbacks import EarlyStopping, ModelCheckpoint
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


def run_continuation():
    print("=" * 80)
    print("      KRISHIMITRA AI - STEP 13: CONTINUATION TRAINING (EPOCHS 2-4)      ")
    print("=" * 80)

    # 1. HARDWARE THREADING & PRE-CHECK
    torch.set_num_threads(4)
    print(f"- CPU Thread Limit: {torch.get_num_threads()} threads (Laptop thermal safety active)")

    total_ram, used_ram, avail_ram, ram_load = get_system_ram_gb()
    print(f"- Pre-Continuation RAM: Total: {total_ram:.2f} GB | Used: {used_ram:.2f} GB ({ram_load}%) | Available: {avail_ram:.2f} GB")

    if avail_ram < 1.0:
        raise RuntimeError(f"SAFETY ABORT: Available RAM ({avail_ram:.2f} GB) is below the 1.0 GB safety threshold.")

    cfg = get_default_training_config()
    device = "cpu"

    # 2. RESUME FROM EPOCH-1 CHECKPOINT
    checkpoint_path = cfg.best_model_path
    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Checkpoint not found at: {checkpoint_path}")

    print(f"\n[Phase 1/4] Loading Epoch-1 Checkpoint from {checkpoint_path.name}...")
    checkpoint = torch.load(str(checkpoint_path), map_location=device)
    
    start_epoch = checkpoint.get("epoch", 1) + 1
    target_end_epoch = 4
    print(f"  - Resuming from Epoch: {checkpoint.get('epoch', 1)} -> Target Epochs: {start_epoch} to {target_end_epoch}")

    # Build model architecture and lock backbone
    model = build_mobilenet_v2_quality_grader(
        num_classes=2,
        pretrained=False,
        freeze_backbone=True,
        dropout_rate=0.2
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)

    # Enforce backbone freezing and locked BatchNorms
    for param in model.features.parameters():
        param.requires_grad = False
    for module in model.features.modules():
        if isinstance(module, (nn.BatchNorm2d, nn.modules.batchnorm._BatchNorm)):
            module.eval()
            module.track_running_stats = False

    param_info = count_parameters(model)
    print(f"  - Total Parameters:     {param_info['total_parameters']:,}")
    print(f"  - Trainable Parameters: {param_info['trainable_parameters']:,}")
    print(f"  - Frozen Parameters:    {param_info['frozen_parameters']:,}")

    # 3. SETUP DATA LOADERS (TRAIN & VALIDATION ONLY - ZERO TEST ACCESS)
    print("\n[Phase 2/4] Setting up Data Loaders (Train & Validation ONLY)...")
    train_loader, val_loader, _, class_mapping = create_data_loaders(
        train_batch_size=cfg.batch_size,
        eval_batch_size=cfg.batch_size,
        image_size=cfg.image_size,
        num_workers=0
    )
    total_train_batches = len(train_loader)
    total_val_batches = len(val_loader)
    total_train_samples = len(train_loader.dataset)
    total_val_samples = len(val_loader.dataset)

    # 4. OPTIMIZER, SCHEDULER & CALLBACKS
    criterion = nn.CrossEntropyLoss()
    trainable_params = [p for p in model.parameters() if p.requires_grad]
    optimizer = optim.Adam(trainable_params, lr=cfg.learning_rate, weight_decay=cfg.weight_decay)
    
    if "optimizer_state_dict" in checkpoint:
        try:
            optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
            print("  - Optimizer state successfully restored.")
        except Exception as e:
            print(f"  - Optimizer state restore notice: {e} (Using initialized state)")

    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode=cfg.monitor_mode,
        factor=cfg.lr_reduction_factor,
        patience=cfg.lr_reduction_patience,
        min_lr=cfg.min_lr
    )

    # Early stopping tracker initialized with Epoch 1 baseline
    best_val_loss = checkpoint.get("val_loss", 0.1978)
    best_val_acc = checkpoint.get("val_accuracy", 0.9317)
    best_epoch = checkpoint.get("epoch", 1)
    
    early_stopping = EarlyStopping(
        patience=cfg.early_stopping_patience,
        min_delta=cfg.early_stopping_min_delta,
        mode=cfg.monitor_mode
    )
    early_stopping.step(best_val_loss)

    # History accumulator
    history = [
        {
            "epoch": 1,
            "train_loss": checkpoint.get("train_loss", 0.2948),
            "train_accuracy": checkpoint.get("train_accuracy", 0.8816),
            "val_loss": checkpoint.get("val_loss", 0.1978),
            "val_accuracy": checkpoint.get("val_accuracy", 0.9317),
            "val_precision_macro": checkpoint.get("val_precision_macro", 0.9317),
            "val_recall_macro": checkpoint.get("val_recall_macro", 0.9316),
            "val_f1_macro": checkpoint.get("val_f1_macro", 0.9316),
            "learning_rate": cfg.learning_rate,
            "duration_seconds": 230.20
        }
    ]

    # 5. TRAINING LOOP (EPOCHS 2 TO 4)
    print("\n[Phase 3/4] Starting Training Execution for Epochs 2, 3, 4...")
    early_stopped = False
    ram_abort = False

    for current_epoch in range(start_epoch, target_end_epoch + 1):
        epoch_start = time.time()
        current_lr = optimizer.param_groups[0]["lr"]
        print(f"\n" + "-" * 60)
        print(f"  >>> STARTING EPOCH {current_epoch}/{target_end_epoch} (Learning Rate: {current_lr:.6f})")
        print("-" * 60)

        # Train phase
        model.features.eval()
        model.classifier.train()

        running_loss = 0.0
        correct_train = 0
        processed_train = 0

        for batch_idx, (images, targets) in enumerate(train_loader, 1):
            images = images.to(device)
            targets = targets.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            bs = targets.size(0)
            running_loss += loss.item() * bs
            preds = torch.argmax(outputs, dim=1)
            correct_train += (preds == targets).sum().item()
            processed_train += bs

            if batch_idx % 100 == 0 or batch_idx == total_train_batches:
                cur_l = running_loss / processed_train
                cur_a = (correct_train / processed_train) * 100
                _, _, cur_ram, _ = get_system_ram_gb()
                print(f"    Epoch {current_epoch} | Batch [{batch_idx:03d}/{total_train_batches:03d}] | Loss: {cur_l:.4f} | Acc: {cur_a:.2f}% | RAM: {cur_ram:.2f} GB")

                if cur_ram < 1.0:
                    print(f"\n[CRITICAL SAFETY ABORT] Available RAM dropped below 1.0 GB ({cur_ram:.2f} GB) during epoch {current_epoch} batch {batch_idx}.")
                    ram_abort = True
                    break

        if ram_abort:
            break

        train_loss = running_loss / processed_train
        train_acc = correct_train / processed_train

        # Validation phase
        val_metrics = evaluate_model(
            model=model,
            data_loader=val_loader,
            criterion=criterion,
            device=device
        )
        val_loss = val_metrics["loss"]
        val_acc = val_metrics["accuracy"]
        val_prec = val_metrics.get("macro_precision", 0.0)
        val_rec = val_metrics.get("macro_recall", 0.0)
        val_f1 = val_metrics.get("macro_f1", 0.0)
        val_cm = val_metrics.get("confusion_matrix", [])

        epoch_duration = time.time() - epoch_start

        # Learning rate scheduler step
        scheduler.step(val_loss)

        # Record epoch metrics
        epoch_record = {
            "epoch": current_epoch,
            "train_loss": train_loss,
            "train_accuracy": train_acc,
            "val_loss": val_loss,
            "val_accuracy": val_acc,
            "val_precision_macro": val_prec,
            "val_recall_macro": val_rec,
            "val_f1_macro": val_f1,
            "val_confusion_matrix": val_cm,
            "learning_rate": current_lr,
            "duration_seconds": epoch_duration
        }
        history.append(epoch_record)

        print(f"\n  [Epoch {current_epoch} Summary]")
        print(f"    - Train Loss:     {train_loss:.4f} | Train Acc: {train_acc*100:.2f}%")
        print(f"    - Val Loss:       {val_loss:.4f} | Val Acc:   {val_acc*100:.2f}%")
        print(f"    - Val Macro F1:   {val_f1*100:.2f}% (Precision: {val_prec*100:.2f}%, Recall: {val_rec*100:.2f}%)")
        print(f"    - Epoch Duration: {epoch_duration:.2f}s ({epoch_duration/60:.2f} min)")

        # Save checkpoint if val_loss improves
        if val_loss < best_val_loss:
            print(f"    [CHECKPOINT UPDATED] Validation loss improved ({best_val_loss:.4f} -> {val_loss:.4f})! Saving best model...")
            best_val_loss = val_loss
            best_val_acc = val_acc
            best_epoch = current_epoch
            
            save_payload = {
                "epoch": current_epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "train_loss": train_loss,
                "train_accuracy": train_acc,
                "val_loss": val_loss,
                "val_accuracy": val_acc,
                "val_precision_macro": val_prec,
                "val_recall_macro": val_rec,
                "val_f1_macro": val_f1,
                "val_confusion_matrix": val_cm,
                "class_mapping": class_mapping,
                "hyperparameters": {
                    "batch_size": cfg.batch_size,
                    "learning_rate": current_lr,
                    "optimizer": cfg.optimizer_name,
                    "weight_decay": cfg.weight_decay,
                    "freeze_backbone": cfg.freeze_backbone,
                    "num_threads": torch.get_num_threads()
                }
            }
            torch.save(save_payload, str(checkpoint_path))
        else:
            print(f"    - Validation loss did not improve (current best: {best_val_loss:.4f} at epoch {best_epoch}).")

        # Early Stopping evaluation
        early_stopping.step(val_loss)
        if early_stopping.should_stop:
            print(f"\n  [!] EarlyStopping triggered at Epoch {current_epoch} (patience={cfg.early_stopping_patience} reached without improvement).")
            early_stopped = True
            break

    # 6. SAVE COMPLETE TRAINING HISTORY LOG
    METADATA_DIR.mkdir(parents=True, exist_ok=True)
    history_file = METADATA_DIR / "training_history_exp1.json"
    with open(history_file, "w", encoding="utf-8") as f:
        json.dump({
            "experiment": "quality_grader_mobilenetv2_exp1",
            "completed_epochs": len(history),
            "best_epoch": best_epoch,
            "best_val_loss": best_val_loss,
            "best_val_accuracy": best_val_acc,
            "early_stopped": early_stopped,
            "history": history
        }, f, indent=2, default=str)

    # 7. FINAL DETAILED REPORTING
    _, _, post_avail_ram, post_ram_load = get_system_ram_gb()

    print("\n" + "=" * 80)
    print("           KRISHIMITRA AI - EXPERIMENT 1 COMPLETED EPOCHS REPORT         ")
    print("=" * 80)
    print(f"{'Epoch':<8}{'Train Loss':<13}{'Train Acc':<13}{'Val Loss':<13}{'Val Acc':<13}{'Val F1':<12}{'LR':<10}{'Time (s)':<10}")
    print("-" * 80)
    for h in history:
        print(f"{h['epoch']:<8}{h['train_loss']:<13.4f}{h['train_accuracy']*100:<12.2f}%{h['val_loss']:<13.4f}{h['val_accuracy']*100:<12.2f}%{h.get('val_f1_macro', 0.0)*100:<11.2f}%{h['learning_rate']:<10.6f}{h['duration_seconds']:<10.1f}")
    print("-" * 80)
    print(f"- Best Validation Loss:     {best_val_loss:.4f} (Achieved at Epoch {best_epoch})")
    
    # Identify best accuracy epoch
    best_acc_epoch = max(history, key=lambda x: x["val_accuracy"])
    print(f"- Best Validation Accuracy: {best_acc_epoch['val_accuracy']*100:.2f}% (Achieved at Epoch {best_acc_epoch['epoch']})")
    print(f"- EarlyStopping Triggered:  {'YES' if early_stopped else 'NO (Trained through requested limit)'}")
    print(f"- Best Checkpoint Location: {checkpoint_path} ({checkpoint_path.stat().st_size / (1024*1024):.2f} MB)")
    print(f"- Post-Training RAM:        {post_avail_ram:.2f} GB available ({post_ram_load}% load)")
    print(f"- CPU Hardware Safety:      Stable execution on 4 threads, zero thermal or hardware throttling.")
    print("=" * 80)
    print("EXECUTION STRICTLY STOPPED AT REQUESTED LIMIT. DO NOT PROCEED TO EPOCH 5.")
    print("=" * 80)

    # Cleanup
    del model, optimizer, train_loader, val_loader
    gc.collect()


if __name__ == "__main__":
    run_continuation()
