"""
Data Preprocessing Script for Pet Breed Identifier
Loads and preprocesses cat and dog images from the dataset
Converted to PyTorch for Python 3.14 compatibility
"""

import os
import numpy as np
from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torchvision.datasets import ImageFolder

# Configuration
IMAGE_SIZE = (224, 224)  # MobileNetV2 optimal input size
BATCH_SIZE = 32  
DATA_DIR = "Breed_Identification DataSet"

# Mapping between readable labels and folder names
FOLDER_NAMES = {
    'Bengal': 'Bengal Cat',
    'British Shorthair': 'British_Shorthair Cat',
    'Persian': 'Persian Cat',
    'Siamese': 'Siamese Cat',
    'Golden Retriever': 'n02099601-golden_retriever',
    'Rottweiler': 'n02106550-Rottweiler',
    'German Shepherd': 'n02106662-German_shepherd',
    'Doberman': 'n02107142-Doberman'
}

# Reverse mapping (folder name -> readable name)
READABLE_NAMES = {v: k for k, v in FOLDER_NAMES.items()}

# Class labels
CLASS_LABELS = ['Bengal', 'British Shorthair', 'Golden Retriever', 'Rottweiler', 
                'German Shepherd', 'Doberman', 'Persian', 'Siamese']


def get_transforms():
    """
    Returns transforms for training and validation data
    """
    # Training data transforms with augmentation
    train_transform = transforms.Compose([
        transforms.Resize(IMAGE_SIZE),
        transforms.RandomRotation(20),
        transforms.RandomHorizontalFlip(),
        transforms.RandomAffine(degrees=0, translate=(0.2, 0.2), shear=0.2),
        transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Validation/test transforms (no augmentation)
    val_transform = transforms.Compose([
        transforms.Resize(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    return train_transform, val_transform


def get_data_loaders(batch_size=BATCH_SIZE, data_dir=DATA_DIR):
    """
    Creates training and validation data loaders with data augmentation
    """
    train_transform, val_transform = get_transforms()
    
    # Create datasets
    try:
        train_dataset = ImageFolder(os.path.join(data_dir), transform=train_transform)
        val_dataset = ImageFolder(os.path.join(data_dir), transform=val_transform)
    except Exception as e:
        print(f"Error loading dataset: {e}")
        print("Trying alternative data directory structure...")
        # The dataset might have subdirectories
        train_dataset = ImageFolder(data_dir, transform=train_transform)
        val_dataset = ImageFolder(data_dir, transform=val_transform)
    
    # Split into train/val (80/20)
    total_size = len(train_dataset)
    train_size = int(0.8 * total_size)
    val_size = total_size - train_size
    
    # Create random splits
    torch.manual_seed(42)
    train_subset, val_subset = torch.utils.data.random_split(
        train_dataset, [train_size, val_size]
    )
    
    # Create data loaders
    train_loader = DataLoader(
        train_subset, 
        batch_size=batch_size, 
        shuffle=True, 
        num_workers=0,
        pin_memory=True if torch.cuda.is_available() else False
    )
    
    val_loader = DataLoader(
        val_subset, 
        batch_size=batch_size, 
        shuffle=False, 
        num_workers=0,
        pin_memory=True if torch.cuda.is_available() else False
    )
    
    return train_loader, val_loader, train_dataset.classes


def get_class_labels():
    """
    Returns the class labels for breeds
    """
    return CLASS_LABELS


def get_readable_names():
    """
    Returns mapping from folder names to readable breed names
    """
    return READABLE_NAMES


def get_folder_names():
    """
    Returns mapping from readable labels to folder names
    """
    return FOLDER_NAMES


def get_class_indices():
    """
    Returns class to index mapping
    """
    return {label: idx for idx, label in enumerate(CLASS_LABELS)}


def count_images():
    """
    Count total images in the dataset
    """
    if os.path.exists(DATA_DIR):
        total = 0
        for root, dirs, files in os.walk(DATA_DIR):
            total += len([f for f in files if f.endswith(('.jpg', '.jpeg', '.png'))])
        print(f"Total images in dataset: {total}")
        return total
    return 0


def preprocess_single_image(image_path, device='cpu'):
    """
    Preprocess a single image for prediction
    """
    img = Image.open(image_path)
    
    # Convert to RGB if necessary
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Resize to model input size
    img = img.resize(IMAGE_SIZE)
    
    # Transform
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    img_tensor = transform(img).unsqueeze(0)  # Add batch dimension
    return img_tensor.to(device)


class PetDataset(Dataset):
    """
    Custom Dataset for Pet Images
    """
    def __init__(self, data_dir, transform=None):
        self.data_dir = data_dir
        self.transform = transform
        self.image_paths = []
        self.labels = []
        
        # Load all image paths and labels
        for label_idx, class_name in enumerate(CLASS_LABELS):
            folder_name = FOLDER_NAMES.get(class_name, class_name)
            class_dir = os.path.join(data_dir, folder_name)
            if os.path.exists(class_dir):
                for img_name in os.listdir(class_dir):
                    if img_name.lower().endswith(('.jpg', '.jpeg', '.png')):
                        self.image_paths.append(os.path.join(class_dir, img_name))
                        self.labels.append(label_idx)
    
    def __len__(self):
        return len(self.image_paths)
    
    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        image = Image.open(img_path)
        
        if self.transform:
            image = self.transform(image)
        
        label = self.labels[idx]
        return image, label


if __name__ == "__main__":
    print("=" * 50)
    print("Pet Breed Identifier - Data Preprocessing")
    print("=" * 50)
    
    # Count images
    count_images()
    
    # Get data loaders
    train_loader, val_loader, classes = get_data_loaders()
    
    print("\nData Loaders Created Successfully!")
    print(f"Training batches: {len(train_loader)}")
    print(f"Validation batches: {len(val_loader)}")
    print(f"Classes: {classes}")
