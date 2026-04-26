"""
evaluate.py  —  Pet Breed Model Evaluation
==========================================
Run this from your project folder:
    python evaluate.py

It will:
  1. Load your trained model (pet_breed_model_phase1.pth)
  2. Run predictions on every image in your test folder
  3. Print Accuracy, Per-class Accuracy, and F1 Score in the terminal
  4. Save confusion_matrix.png and metrics_report.png to your folder

HOW TO SET UP YOUR TEST FOLDER
-------------------------------
Create a folder called  test_images/  inside your project folder.
Inside it, create ONE sub-folder per breed and put photos inside:

    test_images/
    ├── Bengal Cat/
    ├── British_Shorthair Cat/
    ├── Persian Cat/
    ├── Siamese Cat/
    ├── Golden Retriever/
    ├── Rottweiler/
    ├── German Shepherd/
    └── Doberman/

Even 5-10 images per breed is enough to show the lecturer.
"""

import os
import sys
import numpy as np
import matplotlib
matplotlib.use('Agg')          # no display needed — saves to file
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from PIL import Image

import torch
from torchvision import transforms

# ── Import from your existing files ──────────────────────────────────────────
# Make sure this script is in the same folder as model.py
from model import load_model, DEVICE, CLASS_LABELS, get_readable_breed_name

# ── Configuration ─────────────────────────────────────────────────────────────
MODEL_PATH   = 'pet_breed_model_phase1.pth'
TEST_DIR     = 'test_images'          # folder with sub-folders per breed
IMAGE_SIZE   = (224, 224)
OUT_CM       = 'confusion_matrix.png'
OUT_METRICS  = 'metrics_report.png'

# Readable short labels for chart axes
SHORT_LABELS = [
    'Bengal', 'Brit.Short', 'Persian', 'Siamese',
    'Golden', 'Rottweiler', 'Ger.Shep', 'Doberman'
]

# Map from folder name → CLASS_LABELS index
FOLDER_TO_IDX = {
    'Bengal Cat':                   0,
    'British_Shorthair Cat':        1,
    'British Shorthair Cat':        1,   # alternate spelling
    'Persian Cat':                  2,
    'Siamese Cat':                  3,
    'n02099601-golden_retriever':   4,
    'Golden Retriever':             4,
    'n02106550-Rottweiler':         5,
    'Rottweiler':                   5,
    'n02106662-German_shepherd':    6,
    'German Shepherd':              6,
    'n02107142-Doberman':           7,
    'Doberman':                     7,
}

# ── Image preprocessing (same as app.py) ──────────────────────────────────────
transform = transforms.Compose([
    transforms.Resize(IMAGE_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

def preprocess(image_path):
    img = Image.open(image_path).convert('RGB')
    return transform(img).unsqueeze(0).to(DEVICE)

# ── Load model ────────────────────────────────────────────────────────────────
print("\n" + "="*55)
print("  Pet Breed Model — Evaluation Script")
print("="*55)

if not os.path.exists(MODEL_PATH):
    print(f"\n❌  Model file not found: {MODEL_PATH}")
    print("    Make sure this script is in the same folder as the .pth file.")
    sys.exit(1)

print(f"\n📦  Loading model from  {MODEL_PATH} ...")
model = load_model(MODEL_PATH, pretrained=False)
model.eval()
print(f"✅  Model loaded on {DEVICE}\n")

# ── Collect test images ───────────────────────────────────────────────────────
if not os.path.exists(TEST_DIR):
    print(f"❌  Test folder not found: '{TEST_DIR}'")
    print("    Please create the folder and add breed sub-folders with images.")
    print("    See the instructions at the top of this file.")
    sys.exit(1)

y_true = []   # correct labels (integers 0-7)
y_pred = []   # predicted labels (integers 0-7)
image_count = 0

print(f"📂  Scanning  {TEST_DIR}/")
for folder_name in sorted(os.listdir(TEST_DIR)):
    folder_path = os.path.join(TEST_DIR, folder_name)
    if not os.path.isdir(folder_path):
        continue

    true_idx = FOLDER_TO_IDX.get(folder_name)
    if true_idx is None:
        print(f"   ⚠️  Skipping unknown folder: {folder_name}")
        continue

    images_in_folder = [
        f for f in os.listdir(folder_path)
        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.bmp'))
    ]

    if len(images_in_folder) == 0:
        print(f"   ⚠️  No images in: {folder_name}")
        continue

    print(f"   ✅  {folder_name}  ({len(images_in_folder)} images)")

    for img_file in images_in_folder:
        img_path = os.path.join(folder_path, img_file)
        try:
            tensor = preprocess(img_path)
            with torch.no_grad():
                outputs = model(tensor)
                probs   = torch.softmax(outputs, dim=1)[0]
            pred_idx = probs.argmax().item()
            y_true.append(true_idx)
            y_pred.append(pred_idx)
            image_count += 1
        except Exception as e:
            print(f"      ⚠️  Could not process {img_file}: {e}")

if image_count == 0:
    print("\n❌  No images were processed. Check your test_images folder.")
    sys.exit(1)

print(f"\n🔢  Total images evaluated: {image_count}\n")

# ── Compute metrics manually (no sklearn needed) ──────────────────────────────
n = 8
y_true = np.array(y_true)
y_pred = np.array(y_pred)

# --- Confusion matrix ----------------------------------------------------------
cm = np.zeros((n, n), dtype=int)
for t, p in zip(y_true, y_pred):
    cm[t][p] += 1

# --- Overall accuracy ---------------------------------------------------------
overall_acc = np.sum(y_true == y_pred) / len(y_true) * 100

# --- Per-class metrics --------------------------------------------------------
precision_list, recall_list, f1_list, acc_list = [], [], [], []

for i in range(n):
    TP = cm[i, i]
    FP = cm[:, i].sum() - TP
    FN = cm[i, :].sum() - TP
    TN = cm.sum() - TP - FP - FN

    precision = TP / (TP + FP) if (TP + FP) > 0 else 0.0
    recall    = TP / (TP + FN) if (TP + FN) > 0 else 0.0
    f1        = (2 * precision * recall / (precision + recall)
                 if (precision + recall) > 0 else 0.0)
    acc_i     = (TP + TN) / cm.sum() * 100

    precision_list.append(precision)
    recall_list.append(recall)
    f1_list.append(f1)
    acc_list.append(acc_i)

macro_f1        = np.mean(f1_list)
macro_precision = np.mean(precision_list)
macro_recall    = np.mean(recall_list)

# ── Print results in terminal ─────────────────────────────────────────────────
print("="*55)
print(f"  OVERALL ACCURACY  :  {overall_acc:.2f}%")
print(f"  MACRO F1 SCORE    :  {macro_f1:.4f}   ({macro_f1*100:.2f}%)")
print(f"  MACRO PRECISION   :  {macro_precision:.4f}")
print(f"  MACRO RECALL      :  {macro_recall:.4f}")
print("="*55)
print(f"\n{'Breed':<25} {'Precision':>10} {'Recall':>10} {'F1':>10}")
print("-"*55)
for i in range(n):
    breed = SHORT_LABELS[i]
    samples = int(cm[i, :].sum())
    if samples == 0:
        print(f"{breed:<25} {'—':>10} {'—':>10} {'—':>10}  (no test images)")
    else:
        print(f"{breed:<25} {precision_list[i]:>10.4f} "
              f"{recall_list[i]:>10.4f} {f1_list[i]:>10.4f}")
print("="*55 + "\n")

# ── Plot 1: Confusion Matrix ───────────────────────────────────────────────────
fig1, ax1 = plt.subplots(figsize=(9, 7))
fig1.patch.set_facecolor('#f8f9fa')
ax1.set_facecolor('#f8f9fa')

# Color: blue scale, white text on dark, dark text on light
im = ax1.imshow(cm, interpolation='nearest', cmap='Blues')
plt.colorbar(im, ax=ax1, shrink=0.8)

thresh = cm.max() / 2.0
for row in range(n):
    for col in range(n):
        val = cm[row, col]
        color = 'white' if val > thresh else '#1a1a2e'
        weight = 'bold' if row == col else 'normal'
        ax1.text(col, row, str(val),
                 ha='center', va='center',
                 color=color, fontsize=11, fontweight=weight)

ax1.set_xticks(range(n))
ax1.set_yticks(range(n))
ax1.set_xticklabels(SHORT_LABELS, rotation=40, ha='right', fontsize=10)
ax1.set_yticklabels(SHORT_LABELS, fontsize=10)
ax1.set_xlabel('Predicted Breed', fontsize=12, labelpad=10)
ax1.set_ylabel('Actual Breed', fontsize=12, labelpad=10)
ax1.set_title(f'Confusion Matrix  —  Overall Accuracy: {overall_acc:.1f}%',
              fontsize=13, fontweight='bold', pad=14)

# Highlight diagonal (correct predictions) with a green border
for i in range(n):
    rect = mpatches.FancyBboxPatch(
        (i - 0.48, i - 0.48), 0.96, 0.96,
        boxstyle='round,pad=0.02',
        linewidth=2, edgecolor='#2ecc71', facecolor='none'
    )
    ax1.add_patch(rect)

plt.tight_layout()
plt.savefig(OUT_CM, dpi=150, bbox_inches='tight')
plt.close()
print(f"✅  Saved: {OUT_CM}")

# ── Plot 2: Metrics Report ─────────────────────────────────────────────────────
# Only include breeds that had test images
valid = [i for i in range(n) if cm[i, :].sum() > 0]
v_labels     = [SHORT_LABELS[i]      for i in valid]
v_precision  = [precision_list[i]    for i in valid]
v_recall     = [recall_list[i]       for i in valid]
v_f1         = [f1_list[i]           for i in valid]

x   = np.arange(len(valid))
w   = 0.25

fig2, axes = plt.subplots(1, 2, figsize=(14, 5))
fig2.patch.set_facecolor('#f8f9fa')

# ---- Left: grouped bar chart ------------------------------------------------
ax2 = axes[0]
ax2.set_facecolor('#f8f9fa')
b1 = ax2.bar(x - w,     v_precision, w, label='Precision', color='#4a6cf7', alpha=0.85)
b2 = ax2.bar(x,          v_recall,   w, label='Recall',    color='#2ecc71', alpha=0.85)
b3 = ax2.bar(x + w,      v_f1,       w, label='F1 Score',  color='#e74c3c', alpha=0.85)

ax2.set_ylim(0, 1.15)
ax2.set_xticks(x)
ax2.set_xticklabels(v_labels, rotation=35, ha='right', fontsize=9)
ax2.set_ylabel('Score (0 to 1)', fontsize=11)
ax2.set_title('Per-Class Metrics', fontsize=12, fontweight='bold')
ax2.legend(fontsize=9)
ax2.axhline(y=macro_f1, color='#e74c3c', linestyle='--',
            linewidth=1.2, alpha=0.6, label=f'Avg F1={macro_f1:.2f}')
ax2.grid(axis='y', alpha=0.3)

# Value labels on bars
for bar_group in [b1, b2, b3]:
    for bar in bar_group:
        h = bar.get_height()
        if h > 0:
            ax2.text(bar.get_x() + bar.get_width()/2, h + 0.02,
                     f'{h:.2f}', ha='center', va='bottom', fontsize=7.5)

# ---- Right: summary card ------------------------------------------------
ax3 = axes[1]
ax3.set_facecolor('#f8f9fa')
ax3.axis('off')

summary = [
    ('Total images tested',    str(image_count)),
    ('Overall accuracy',       f'{overall_acc:.2f}%'),
    ('Macro F1 score',         f'{macro_f1:.4f}'),
    ('Macro precision',        f'{macro_precision:.4f}'),
    ('Macro recall',           f'{macro_recall:.4f}'),
    ('Model',                  'MobileNetV2'),
    ('Training',               'Transfer Learning'),
    ('Num classes',            '8 breeds'),
    ('Input size',             '224 × 224 px'),
    ('Framework',              'PyTorch'),
]

y_pos = 0.95
for label, value in summary:
    ax3.text(0.05, y_pos, label + ':', fontsize=11,
             color='#666', transform=ax3.transAxes)
    ax3.text(0.62, y_pos, value, fontsize=11, fontweight='bold',
             color='#1a1a2e', transform=ax3.transAxes)
    y_pos -= 0.088

ax3.set_title('Summary Report', fontsize=12, fontweight='bold', pad=10)

# Border around summary
border = mpatches.FancyBboxPatch(
    (0.01, 0.01), 0.97, 0.97,
    transform=ax3.transAxes,
    boxstyle='round,pad=0.01',
    linewidth=1.5, edgecolor='#cccccc', facecolor='white', zorder=0
)
ax3.add_patch(border)

fig2.suptitle('Pet Breed Classifier — Evaluation Metrics',
              fontsize=14, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig(OUT_METRICS, dpi=150, bbox_inches='tight')
plt.close()
print(f"✅  Saved: {OUT_METRICS}")

print("\n🎉  Evaluation complete!")
