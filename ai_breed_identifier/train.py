
import os
import time
import torch
import torch.nn as nn
from tqdm import tqdm

from model import (
    create_model, get_model_with_fine_tuning, get_optimizer, get_optimizer_for_fine_tuning,
    get_criterion, save_model, print_model_summary, DEVICE, CLASS_LABELS
)
from data_preprocessing import get_data_loaders, get_class_labels

# Training Configuration
EPOCHS = 30
INITIAL_EPOCHS = 15  # Phase 1: Train only custom layers
FINE_TUNE_EPOCHS = 15  # Phase 2: Fine-tune last layers


def train_epoch(model, train_loader, criterion, optimizer, device):
    """
    Train for one epoch
    """
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    pbar = tqdm(train_loader, desc='Training')
    for images, labels in pbar:
        images = images.to(device)
        labels = labels.to(device)
        
        # Zero gradients
        optimizer.zero_grad()
        
        # Forward pass
        outputs = model(images)
        loss = criterion(outputs, labels)
        
        # Backward pass
        loss.backward()
        optimizer.step()
        
        # Statistics
        running_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        
        pbar.set_postfix({
            'loss': running_loss / (pbar.n + 1),
            'acc': 100. * correct / total
        })
    
    return running_loss / len(train_loader), 100. * correct / total


def validate(model, val_loader, criterion, device):
    """
    Validate the model
    """
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for images, labels in tqdm(val_loader, desc='Validation'):
            images = images.to(device)
            labels = labels.to(device)
            
            # Forward pass
            outputs = model(images)
            loss = criterion(outputs, labels)
            
            # Statistics
            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
    
    return running_loss / len(val_loader), 100. * correct / total


def train_phase_1():
    """
    Phase 1: Train only the custom classification layers
    Base model weights remain frozen
    """
    print("\n" + "=" * 60)
    print("PHASE 1: Training Classification Layers (Frozen Base)")
    print("=" * 60)
    
    # Create model
    model = create_model(pretrained=True)
    print_model_summary(model)
    
    # Get data loaders
    train_loader, val_loader, classes = get_data_loaders()
    print(f"Classes: {classes}")
    
    # Get optimizer and loss
    optimizer = get_optimizer(model)
    criterion = get_criterion()
    
    best_val_acc = 0.0
    history = {'train_loss': [], 'train_acc': [], 'val_loss': [], 'val_acc': []}
    
    # Train
    print("\nStarting Phase 1 Training...")
    start_time = time.time()
    
    for epoch in range(INITIAL_EPOCHS):
        print(f"\nEpoch {epoch+1}/{INITIAL_EPOCHS}")
        
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, DEVICE)
        val_loss, val_acc = validate(model, val_loader, criterion, DEVICE)
        
        history['train_loss'].append(train_loss)
        history['train_acc'].append(train_acc)
        history['val_loss'].append(val_loss)
        history['val_acc'].append(val_acc)
        
        print(f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%")
        print(f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%")
        
        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            save_model(model, 'pet_breed_model_phase1.pth')
            print(f"Best model saved with val acc: {val_acc:.2f}%")
    
    phase1_time = time.time() - start_time
    print(f"\nPhase 1 completed in {phase1_time/60:.2f} minutes")
    print(f"Best validation accuracy: {best_val_acc:.2f}%")
    
    return model, history


def train_phase_2(model):
    """
    Phase 2: Fine-tune the last few layers of MobileNetV2
    """
    print("\n" + "=" * 60)
    print("PHASE 2: Fine-tuning Last Layers of MobileNetV2")
    print("=" * 60)
    
    # Unfreeze last layers
    model.unfreeze_last_layers(num_layers=30)
    
    # Recompile with lower learning rate
    optimizer = get_optimizer_for_fine_tuning(model, learning_rate=0.00001)
    criterion = get_criterion()
    
    print_model_summary(model)
    
    # Get data loaders
    train_loader, val_loader, classes = get_data_loaders()
    
    best_val_acc = 0.0
    history = {'train_loss': [], 'train_acc': [], 'val_loss': [], 'val_acc': []}
    
    # Continue training
    print("\nStarting Phase 2 Fine-tuning...")
    start_time = time.time()
    
    for epoch in range(FINE_TUNE_EPOCHS):
        print(f"\nEpoch {epoch+1}/{FINE_TUNE_EPOCHS}")
        
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, DEVICE)
        val_loss, val_acc = validate(model, val_loader, criterion, DEVICE)
        
        history['train_loss'].append(train_loss)
        history['train_acc'].append(train_acc)
        history['val_loss'].append(val_loss)
        history['val_acc'].append(val_acc)
        
        print(f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%")
        print(f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%")
        
        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            save_model(model, 'pet_breed_model.pth')
            print(f"Best model saved with val acc: {val_acc:.2f}%")
    
    phase2_time = time.time() - start_time
    print(f"\nPhase 2 completed in {phase2_time/60:.2f} minutes")
    print(f"Final validation accuracy: {best_val_acc:.2f}%")
    
    return model, history


def train_full():
    """
    Full training pipeline: Phase 1 + Phase 2
    """
    print("\n" + "=" * 60)
    print("PET BREED CLASSIFIER TRAINING")
    print("Hardware: Ryzen 5 4000 + GT710 (2GB VRAM)")
    print("=" * 60)
    
    total_start = time.time()
    
    # Phase 1
    model, history1 = train_phase_1()
    
    # Phase 2
    model, history2 = train_phase_2(model)
    
    # Save final model
    save_model(model, 'pet_breed_model.pth')
    
    total_time = time.time() - total_start
    print("\n" + "=" * 60)
    print(f"Training Complete!")
    print(f"Total time: {total_time/60:.2f} minutes")
    print("=" * 60)
    
    return model


def train_phase1_only():
    """
    Train only Phase 1 (faster, uses less GPU memory)
    """
    print("\n" + "=" * 60)
    print("PHASE 1 ONLY: Training Classification Layers")
    print("=" * 60)
    
    model, history = train_phase_1()
    
    print("\n" + "=" * 60)
    print("Phase 1 Training Complete!")
    print("=" * 60)
    
    return model


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Train Pet Breed Classifier')
    parser.add_argument('--phase1-only', action='store_true', 
                       help='Train only Phase 1 (faster)')
    parser.add_argument('--full', action='store_true', 
                       help='Train full pipeline (Phase 1 + 2)')
    
    args = parser.parse_args()
    
    if args.phase1_only:
        model = train_phase1_only()
    elif args.full:
        model = train_full()
    else:
        # Default: Run full training for maximum accuracy
        print("Running FULL training (Phase 1 + 2) for maximum accuracy...")
        model = train_full()
