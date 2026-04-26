@echo off
setlocal

echo Checking dependencies for Breed Identifier...
cd ai_breed_identifier
python -c "import torch, torchvision, flask, flask_cors, PIL" 2>nul
if %errorlevel% neq 0 (
    echo Missing dependencies for Breed Identifier. Installing...
    pip install -r requirements.txt
)
cd ..

echo Checking dependencies for Recommendation API...
cd recommendation_api
python -c "import flask, flask_cors, pandas, sklearn" 2>nul
if %errorlevel% neq 0 (
    echo Missing dependencies for Recommendation API. Installing...
    pip install -r requirements.txt
)
cd ..

echo Starting AI Breed Identifier Backend on port 5000...
start "AI Breed Identifier (Port 5000)" cmd /k "cd ai_breed_identifier && python app.py"

echo Starting AI Recommendation API on port 5001...
start "AI Recommendation (Port 5001)" cmd /k "cd recommendation_api && python app.py"

echo Both AI services are starting in separate windows.
pause
