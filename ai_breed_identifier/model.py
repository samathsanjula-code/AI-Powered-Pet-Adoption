"""
Pet Breed Classifier Model
Uses MobileNetV2 transfer learning - optimized for low-end GPU (GT710)
Converted to PyTorch for Python 3.14 compatibility
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import models
from torchvision.models import MobileNet_V2_Weights

# Model Configuration
IMAGE_SIZE = (224, 224)
NUM_CLASSES = 8  # 8 breeds
LEARNING_RATE = 0.0001  # Low learning rate for transfer learning
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Class labels - will be updated from dataset
CLASS_LABELS = [
    'Bengal Cat', 'British Shorthair Cat', 'Persian Cat', 'Siamese Cat',
    'Golden Retriever', 'Rottweiler', 
    'German Shepherd', 'Doberman'
]


class PetBreedModel(nn.Module):
    """
    MobileNetV2-based model for pet classification
    Optimized for GT710 (2GB VRAM) - lightweight architecture
    """
    def __init__(self, num_classes=NUM_CLASSES, pretrained=True):
        super(PetBreedModel, self).__init__()
        
        # Load MobileNetV2 without top layers
        if pretrained:
            self.base_model = models.mobilenet_v2(weights=MobileNet_V2_Weights.IMAGENET1K_V1)
        else:
            self.base_model = models.mobilenet_v2(weights=None)
        
        # Freeze base model layers (don't train the pretrained layers)
        for param in self.base_model.parameters():
            param.requires_grad = False
        
        # Replace the classifier
        # MobileNetV2 has a classifier with 1280 features
        self.base_model.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(1280, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(128, num_classes)
        )
        
    def forward(self, x):
        return self.base_model(x)
    
    def freeze_base(self):
        """Freeze base model layers"""
        for param in self.base_model.parameters():
            param.requires_grad = False
        # Unfreeze classifier
        for param in self.base_model.classifier.parameters():
            param.requires_grad = True
    
    def unfreeze_last_layers(self, num_layers=30):
        """Unfreeze the last few layers for fine-tuning"""
        # First unfreeze all
        for param in self.base_model.parameters():
            param.requires_grad = True
        
        # Get all layers in the features
        layers = list(self.base_model.features.children())
        
        # Freeze all except last num_layers
        for i, layer in enumerate(layers[:-num_layers]):
            for param in layer.parameters():
                param.requires_grad = False


def create_model(pretrained=True):
    """
    Creates a MobileNetV2-based model for pet classification
    Optimized for GT710 (2GB VRAM) - lightweight architecture
    """
    model = PetBreedModel(num_classes=NUM_CLASSES, pretrained=pretrained)
    model = model.to(DEVICE)
    
    # Freeze base model initially
    model.freeze_base()
    
    return model


def get_model_with_fine_tuning():
    """
    Creates a model with partial fine-tuning for better accuracy
    Unfreezes the last few layers of MobileNetV2
    """
    model = create_model(pretrained=True)
    
    # Unfreeze last 30 layers for fine-tuning
    model.unfreeze_last_layers(num_layers=30)
    
    return model


def get_optimizer(model, learning_rate=LEARNING_RATE):
    """
    Returns optimizer for training
    Only optimize parameters that require gradients
    """
    params = [p for p in model.parameters() if p.requires_grad]
    return optim.Adam(params, lr=learning_rate)


def get_optimizer_for_fine_tuning(model, learning_rate=0.00001):
    """
    Returns optimizer with lower learning rate for fine-tuning
    """
    params = [p for p in model.parameters() if p.requires_grad]
    return optim.Adam(params, lr=learning_rate)


def get_criterion():
    """
    Returns loss function for multi-class classification
    """
    return nn.CrossEntropyLoss()


def save_model(model, filepath='pet_breed_model.pth'):
    """
    Saves the trained model
    """
    torch.save({
        'model_state_dict': model.state_dict(),
        'class_labels': CLASS_LABELS,
        'num_classes': NUM_CLASSES
    }, filepath)
    print(f"Model saved to {filepath}")


def load_model(filepath='pet_breed_model.pth', pretrained=True):
    """
    Loads a saved model
    """
    checkpoint = torch.load(filepath, map_location=DEVICE, weights_only=False)
    model = PetBreedModel(num_classes=checkpoint.get('num_classes', NUM_CLASSES), pretrained=False)
    model.load_state_dict(checkpoint['model_state_dict'])
    model = model.to(DEVICE)
    model.eval()
    return model


def get_readable_breed_name(folder_name):
    """
    Convert folder name to readable breed name
    """
    mapping = {
        'Bengal Cat': 'Bengal Cat',
        'British_Shorthair Cat': 'British Shorthair Cat',
        'Persian Cat': 'Persian Cat',
        'Siamese Cat': 'Siamese Cat',
        'n02099601-golden_retriever': 'Golden Retriever',
        'n02106550-Rottweiler': 'Rottweiler',
        'n02106662-German_shepherd': 'German Shepherd',
        'n02107142-Doberman': 'Doberman'
    }
    return mapping.get(folder_name, folder_name)


def print_model_summary(model):
    """
    Prints model architecture summary
    """
    print("\n" + "=" * 50)
    print("Model Architecture Summary")
    print("=" * 50)
    
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    
    print(f"Total parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")
    print(f"Device: {DEVICE}")


if __name__ == "__main__":
    # Test model creation
    print("Creating model...")
    model = create_model(pretrained=True)
    print_model_summary(model)
    print("\nModel created successfully!")
    
    # Test forward pass
    test_input = torch.randn(1, 3, 224, 224).to(DEVICE)
    output = model(test_input)
    print(f"Output shape: {output.shape}")
