from pathlib import Path

# PATHS

REPO_ROOT = Path(__file__).parents[3]

# data paths

DATA_DIR = REPO_ROOT / Path("data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

RAW_DATA_DIR = DATA_DIR / Path("raw/")
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

PROCESSED_DATA_DIR = DATA_DIR / Path("processed")
PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_DATA_DIR = DATA_DIR / Path("outputs")
OUTPUT_DATA_DIR.mkdir(parents=True, exist_ok=True)

# model paths

MODELS_DIR = REPO_ROOT / Path("models")
MODELS_DIR.mkdir(parents=True, exist_ok=True)


# ATC5 SELECTION
SELECTED_ATC5 = ["M04AC01", "C01AA05", "S01EB01", "A04AD01", "S01FA01",]
EXPANSION = ["P01BF01", "L01CA04", "L01CB01"]
SELECTED_ATC5_EXPANDED = SELECTED_ATC5 + EXPANSION