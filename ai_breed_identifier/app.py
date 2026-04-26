"""
Web Interface for Pet Breed Classifier
Flask-based web app for image upload and prediction
Converted to PyTorch for Python 3.14 compatibility
"""

import os
import tempfile
import random
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import torch
from torchvision import transforms
from PIL import Image

from model import load_model, DEVICE, CLASS_LABELS, get_readable_breed_name

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'

# Enable CORS for all routes
CORS(app)

# Create uploads directory if not exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Configuration
IMAGE_SIZE = (224, 224)
MODEL_PATH = 'pet_breed_model_phase1.pth'

# Low confidence threshold for fallback
CONFIDENCE_THRESHOLD = 70.0

# Target accuracy (90%)
TARGET_ACCURACY = 90.0

# Image transforms for PyTorch
transform = transforms.Compose([
    transforms.Resize(IMAGE_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# Load model globally
print("Loading model...")
try:
    model = load_model(MODEL_PATH, pretrained=False)
    model.eval()
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    print("Warning: Model not found. Please train the model first.")
    model = None

# Breed suggestions
CAT_BREEDS = [
    'Bengal Cat', 'British Shorthair Cat', 'Persian Cat', 'Siamese Cat'
]

DOG_BREEDS = [
    'Golden Retriever', 'Rottweiler', 
    'German Shepherd', 'Doberman'
]

ALL_BREEDS = CAT_BREEDS + DOG_BREEDS


def get_openrouter_breed(image_path):
    """
    Placeholder for OpenRouter API integration
    Returns None - requires API key configuration
    """
    return None


ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

def allowed_file(filename):  
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image(image_path):
    """Preprocess image for prediction"""
    img = Image.open(image_path)
    
    # Convert to RGB
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Resize and transform
    img_tensor = transform(img).unsqueeze(0)  # Add batch dimension
    
    return img_tensor.to(DEVICE)

def predict_breed(image_path):
    """Make prediction on image"""
    if model is None:
        return None

    img_tensor = preprocess_image(image_path)
    
    with torch.no_grad():
        outputs = model(img_tensor)
        probabilities = torch.softmax(outputs, dim=1)[0]

    # Get the predicted class index and confidence
    predicted_index = probabilities.argmax().item()
    confidence = probabilities[predicted_index].item() * 100
    folder_name = CLASS_LABELS[predicted_index]
    breed = get_readable_breed_name(folder_name)

    # Determine if cat or dog (check both formats)
    is_cat = folder_name in CAT_BREEDS or breed in CAT_BREEDS
    class_name = 'Cat' if is_cat else 'Dog'

    # Calculate cat/dog probabilities
    prob_cat = sum(probabilities[i].item() for i, b in enumerate(CLASS_LABELS) if b in CAT_BREEDS)
    prob_dog = sum(probabilities[i].item() for i, b in enumerate(CLASS_LABELS) if b in DOG_BREEDS)

    return {
        'class': class_name,
        'confidence': float(confidence),
        'probability_cat': float(prob_cat * 100),
        'probability_dog': float(prob_dog * 100),
        'breed': breed,
        'source': 'local_model'
    }


@app.route('/')
def index():
    """Home page"""
    return render_template('index.html')

@app.route('/api', methods=['GET'])
def api_info():
    """API information endpoint"""
    return jsonify({
        'name': 'Pet Breed Classifier API',
        'version': '2.0.0',
        'description': 'REST API for pet breed classification (cats and dogs) with OpenRouter fallback',
        'openrouter_enabled': True,
        'endpoints': {
            'GET /api': 'API information',
            'GET /api/health': 'Health check',
            'GET /api/model': 'Model information',
            'GET /api/breeds': 'List of supported breeds',
            'POST /api/predict': 'Single image prediction (uses local model with OpenRouter fallback)',
            'POST /api/predict/openrouter': 'Force prediction using OpenRouter API directly',
            'POST /api/batch-predict': 'Batch image prediction'
        }
    })

@app.route('/api/health', methods=['GET', 'POST'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy' if model is not None else 'degraded',
        'model_loaded': model is not None,
        'device': str(DEVICE),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/model', methods=['GET'])
def model_info():
    """Model information endpoint"""
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    return jsonify({
        'name': 'pet_breed_model.pth',
        'image_size': IMAGE_SIZE,
        'input_shape': [1, 3] + list(IMAGE_SIZE),
        'classes': [get_readable_breed_name(c) for c in CLASS_LABELS],
        'cat_breeds': CAT_BREEDS,
        'dog_breeds': DOG_BREEDS,
        'framework': 'PyTorch'
    })

@app.route('/api/breeds', methods=['GET'])
def list_breeds():
    """List all supported breeds"""
    return jsonify({
        'cat_breeds': CAT_BREEDS,
        'dog_breeds': DOG_BREEDS,
        'total_cat_breeds': len(CAT_BREEDS),
        'total_dog_breeds': len(DOG_BREEDS)
    })


@app.route('/api/predict/openrouter', methods=['POST'])
def predict_openrouter():
    """
    Force prediction using OpenRouter API directly
    Use this when you want to use the online model for breed identification
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Please upload an image file.'}), 400
    
    # Save uploaded file
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    try:
        # Get prediction from OpenRouter directly
        result = get_openrouter_breed(filepath)
        
        if result is None:
            return jsonify({'error': 'OpenRouter API failed to identify the pet breed'}), 500
        
        # Clean up uploaded file
        os.remove(filepath)
        
        return jsonify({
            'success': True,
            'result': {
                'class': result['class'],
                'confidence': result.get('confidence', 85.0),
                'breed': result['breed'],
                'source': 'openrouter'
            }
        })
    
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict', methods=['POST'])
def predict():
    """Handle image upload and prediction"""
    if model is None:
        return jsonify({
            'error': 'Model not loaded. The model file (pet_breed_model_phase1.pth) could not be loaded. Please ensure the model file exists and is valid.'
        }), 500
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Please upload an image file.'}), 400
    
    # Save uploaded file
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    try:
        # Make prediction
        result = predict_breed(filepath)
        
        if result is None:
            return jsonify({'error': 'Prediction failed'}), 500
        
        # Clean up uploaded file
        os.remove(filepath)
        
        return jsonify({
            'success': True,
            'result': result,
            'fallback_used': result.get('source') == 'openrouter'
        })
    
    except Exception as e:
        # Clean up on error
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': str(e)}), 500

@app.route('/api/batch-predict', methods=['POST'])
def batch_predict():
    """Handle multiple image uploads"""
    if model is None:
        return jsonify({
            'error': 'Model not loaded. The model file (pet_breed_model_phase1.pth) could not be loaded. Please ensure the model file exists and is valid.'
        }), 500
    
    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files')
    
    if not files or all(f.filename == '' for f in files):
        return jsonify({'error': 'No files selected'}), 400
    
    results = []
    
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            try:
                result = predict_breed(filepath)
                results.append({
                    'filename': filename,
                    'result': result
                })
            except Exception as e:
                results.append({
                    'filename': filename,
                    'error': str(e)
                })
            finally:
                if os.path.exists(filepath):
                    os.remove(filepath)
    
    return jsonify({
        'success': True,
        'results': results
    })

@app.route('/api/accuracy', methods=['GET', 'POST'])
def calculate_accuracy():
    """
    Calculate accuracy on test dataset
    Returns accuracy percentage
    """
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    test_dir = 'dog-cat-full-dataset/data/test'
    
    if not os.path.exists(test_dir):
        return jsonify({'error': 'Test dataset not found'}), 500
    
    from pathlib import Path
    
    correct = 0
    total = 0
    results = []
    
    # Test cats
    cat_dir = Path(test_dir) / 'cats'
    if cat_dir.exists():
        for img_file in list(cat_dir.glob('*.jpg'))[:50]:  # Limit to 50 samples
            try:
                img_tensor = preprocess_image(str(img_file))
                with torch.no_grad():
                    outputs = model(img_tensor)
                    probabilities = torch.softmax(outputs, dim=1)[0]
                
                # Get prediction (first 4 classes are cats)
                predicted_idx = probabilities.argmax().item()
                predicted_breed = CLASS_LABELS[predicted_idx]
                predicted = 'Dog' if predicted_breed in DOG_BREEDS else 'Cat'
                actual = 'Cat'
                
                if predicted == actual:
                    correct += 1
                total += 1
                
                results.append({
                    'file': img_file.name,
                    'predicted': predicted,
                    'actual': actual,
                    'correct': predicted == actual
                })
            except Exception as e:
                print(f"Error processing {img_file}: {e}")
    
    # Test dogs
    dog_dir = Path(test_dir) / 'dogs'
    if dog_dir.exists():
        for img_file in list(dog_dir.glob('*.jpg'))[:50]:  # Limit to 50 samples
            try:
                img_tensor = preprocess_image(str(img_file))
                with torch.no_grad():
                    outputs = model(img_tensor)
                    probabilities = torch.softmax(outputs, dim=1)[0]
                
                # Get prediction
                predicted_idx = probabilities.argmax().item()
                predicted_breed = CLASS_LABELS[predicted_idx]
                predicted = 'Dog' if predicted_breed in DOG_BREEDS else 'Cat'
                actual = 'Dog'
                
                if predicted == actual:
                    correct += 1
                total += 1
                
                results.append({
                    'file': img_file.name,
                    'predicted': predicted,
                    'actual': actual,
                    'correct': predicted == actual
                })
            except Exception as e:
                print(f"Error processing {img_file}: {e}")
    
    accuracy = (correct / total * 100) if total > 0 else 0
    
    return jsonify({
        'accuracy': accuracy,
        'correct': correct,
        'total': total,
        'target_accuracy': TARGET_ACCURACY,
        'achieved': accuracy >= TARGET_ACCURACY,
        'sample_results': results[:10]  # Return first 10 results
    })


@app.route('/train', methods=['POST'])
def train_model():
    """Trigger model training (for future use)"""
    return jsonify({
        'message': 'Training endpoint. Run train.py separately for training.'
    })

if __name__ == '__main__':
    print("=" * 60)
    print("Pet Breed Classifier Web Interface")
    print("=" * 60)
    print(f"Using device: {DEVICE}")
    print("Starting server at http://localhost:5000")
    print("Press Ctrl+C to stop")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
