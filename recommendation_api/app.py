from __future__ import annotations

import os
import traceback

from flask import Flask, jsonify, request
from flask_cors import CORS

from recommend_service import (
    FEATURE_COLUMNS,
    load_bundle,
    listings_by_pet_ids,
    recommend_pets,
    model_rows_from_df,
)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "service": "pet-recommendation"})


@app.post("/api/recommend")
def recommend():
    """
    Body JSON: fields matching user_input / FEATURE_COLUMNS.
    Returns petIds from the model and full listings resolved by PetID (MongoDB or CSV).
    """
    data = request.get_json(silent=True) or {}
    missing = [k for k in FEATURE_COLUMNS if not str(data.get(k, "")).strip()]
    if missing:
        return jsonify({"ok": False, "error": "Missing fields", "missing": missing}), 400

    user_input = {k: str(data[k]).strip() for k in FEATURE_COLUMNS}

    try:
        pipeline, df = load_bundle()
        rec_df = recommend_pets(user_input, df, pipeline)
        pet_ids = [int(x) for x in rec_df["PetID"].tolist()]
        distances = [float(x) for x in rec_df["_distance"].tolist()]
        listings, warnings = listings_by_pet_ids(pet_ids, df)
        model_rows = model_rows_from_df(rec_df)

        return jsonify(
            {
                "ok": True,
                "petIds": pet_ids,
                "distances": distances,
                "modelMatches": model_rows,
                "listings": listings,
                "warnings": warnings,
            }
        )
    except Exception as ex:
        return jsonify(
            {
                "ok": False,
                "error": str(ex),
                "trace": traceback.format_exc(),
            }
        ), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
