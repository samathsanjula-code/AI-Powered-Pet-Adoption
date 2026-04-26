"""
Loads the KNN pipeline and training dataframe, runs the same logic as
recommend_pets(user_input, df, knn_model) from the notebook.
"""
from __future__ import annotations

import os
import pickle
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from pymongo import MongoClient
from pymongo.database import Database

FEATURE_COLUMNS = [
    "PetType",
    "Breed",
    "activity_level",
    "noise_level",
    "grooming_needs",
    "space_required",
    "temperament",
    "good_with_children",
    "good_with_other_pets",
]

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH = BASE_DIR / "static" / "ml" / "best_knn_model.pkl"
DEFAULT_DATA_PATH = BASE_DIR / "updated_pet_dataset.csv"

_pipeline = None  # type: ignore
_df: Optional[pd.DataFrame] = None


def resolve_paths() -> Tuple[Path, Path]:
    model = Path(os.environ.get("PET_REC_MODEL_PATH", str(DEFAULT_MODEL_PATH)))
    data = Path(os.environ.get("PET_REC_DATA_PATH", str(DEFAULT_DATA_PATH)))
    return model, data


def load_bundle() -> Tuple[Any, pd.DataFrame]:
    global _pipeline, _df
    if _pipeline is None or _df is None:
        import sklearn.compose._column_transformer
        if not hasattr(sklearn.compose._column_transformer, "_RemainderColsList"):
            class _RemainderColsList(list):
                pass
            sklearn.compose._column_transformer._RemainderColsList = _RemainderColsList

        model_path, data_path = resolve_paths()
        with open(model_path, "rb") as f:
            _pipeline = pickle.load(f)
        _df = pd.read_csv(data_path)
    return _pipeline, _df


def model_rows_from_df(rec_df: pd.DataFrame) -> List[Dict[str, Any]]:
    rows = []
    for _, row in rec_df.iterrows():
        r = row.drop(labels=["_distance"], errors="ignore").to_dict()
        clean = {}
        for k, v in r.items():
            if pd.isna(v):
                clean[k] = None
            elif hasattr(v, "item"):
                try:
                    clean[k] = v.item()
                except Exception:
                    clean[k] = v
            else:
                clean[k] = v
        rows.append(clean)
    return rows


def recommend_pets(user_input: Dict[str, str], df: pd.DataFrame, pipeline) -> pd.DataFrame:
    row = {k: user_input[k] for k in FEATURE_COLUMNS}
    user_df = pd.DataFrame([row])
    prep = pipeline.named_steps["prep"]
    knn = pipeline.named_steps["knn"]
    X_user = prep.transform(user_df)
    distances, indices = knn.kneighbors(X_user, n_neighbors=3)
    out = df.iloc[indices[0]].copy()
    out["_distance"] = distances[0]
    return out


def _mongo_db() -> Optional[Database]:
    uri = os.environ.get("MONGODB_URI", "").strip()
    if not uri:
        return None
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=8000)
        client.admin.command("ping")
        db = client.get_default_database()
        if db is not None:
            return db
        return client["Pet-Adoption"]
    except Exception:
        return None


def pet_doc_to_listing(doc: Dict[str, Any]) -> Dict[str, Any]:
    imgs = doc.get("imagePaths")
    if isinstance(imgs, str) and imgs.strip():
        imgs = [s.strip() for s in imgs.split(",") if s.strip()]
    return {
        "PetID": doc.get("PetID"),
        "petType": doc.get("PetType") or doc.get("category"),
        "breed": doc.get("Breed"),
        "ageMonths": doc.get("AgeMonths"),
        "color": doc.get("Color"),
        "size": doc.get("Size"),
        "weightKg": doc.get("WeightKg"),
        "vaccinated": doc.get("Vaccinated"),
        "adoptionFee": doc.get("AdoptionFee"),
        "contactName": doc.get("contactName"),
        "phoneNumber": doc.get("phoneNumber"),
        "imagePaths": imgs if isinstance(imgs, list) else imgs,
        "source": "database",
    }


def row_to_listing(row: pd.Series) -> Dict[str, Any]:
    d = row.to_dict()
    if row.name is not None and "PetID" not in d:
        d["PetID"] = int(row.name)
    d["source"] = "dataset"
    return {k: (None if (isinstance(v, float) and pd.isna(v)) else v) for k, v in d.items()}


def listings_by_pet_ids(pet_ids: List[int], df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Resolve each PetID in order: MongoDB by exact PetID if MONGODB_URI is set,
    otherwise (or if missing) use the training CSV row for that PetID.
    """
    warnings: List[str] = []
    db = _mongo_db()
    by_id_df = df.set_index("PetID")
    out: List[Dict[str, Any]] = []

    for pid in pet_ids:
        doc = None
        if db is not None:
            try:
                doc = db["pets"].find_one({"PetID": int(pid)})
            except Exception as ex:
                warnings.append(f"Database lookup failed for PetID {pid}: {ex}")
                doc = None
        if doc is not None:
            out.append(pet_doc_to_listing(doc))
            continue
        if pid in by_id_df.index:
            out.append(row_to_listing(by_id_df.loc[pid]))
            if db is not None:
                warnings.append(f"PetID {pid} not in database; showing dataset row.")
            continue
        warnings.append(f"PetID {pid} not found in database or dataset.")
        out.append({"PetID": pid, "source": "missing", "error": "Not found"})

    return out, warnings
