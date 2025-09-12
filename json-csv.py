import os
import json
import csv
from tkinter import Tk, filedialog

# Columns we expect in the output CSV (order preserved)
CSV_COLUMNS = [
    "source_file",
    "jobType",
    "dimensions.width",
    "dimensions.height",
    "dimensions.unit",
    "quantity",
    "colorMode",
    "bleed.top",
    "bleed.bottom",
    "bleed.left",
    "bleed.right",
    "bleed.unit",
    "resolution",
    "fileFormat",
    "specialRequirements",  # joined with " | "
    "deadline",
]

DECODINGS = ("utf-8-sig", "utf-8", "cp1252")

def read_json_with_fallback(path):
    """
    Try a few common Windows-friendly decodings.
    Returns a Python object (dict / list / primitive).
    """
    last_err = None
    for enc in DECODINGS:
        try:
            with open(path, "r", encoding=enc, errors="strict") as f:
                return json.load(f)
        except Exception as e:
            last_err = e
    if last_err is not None:
        raise last_err
    else:
        raise Exception("Failed to read JSON file with any known encoding.")

def coerce_to_dict(obj):
    """
    Your files should look like a single dict (per your example).
    If a file is something else, wrap minimally so we still emit a row.
    """
    if isinstance(obj, dict):
        return obj
    return {"value": obj}

def get_nested(d, *path, default=""):
    """
    Safe getter for nested dict paths.
    Example: get_nested(d, "dimensions", "width")
    """
    cur = d
    for p in path:
        if isinstance(cur, dict) and p in cur:
            cur = cur[p]
        else:
            return default
    return cur if cur is not None else default

def to_row(source_file, data):
    """
    Build one flat row matching CSV_COLUMNS from the JSON dict.
    Joins specialRequirements list with " | "
    """
    # specialRequirements may be list[str]; normalize to " | " joined string
    special = get_nested(data, "specialRequirements", default="")
    if isinstance(special, list):
        special_str = " | ".join(str(x) for x in special)
    elif special == "":
        special_str = ""
    else:
        # if it's not a list, just coerce to string
        special_str = str(special)

    row = {
        "source_file": source_file,
        "jobType": get_nested(data, "jobType"),
        "dimensions.width": get_nested(data, "dimensions", "width"),
        "dimensions.height": get_nested(data, "dimensions", "height"),
        "dimensions.unit": get_nested(data, "dimensions", "unit"),
        "quantity": get_nested(data, "quantity"),
        "colorMode": get_nested(data, "colorMode"),
        "bleed.top": get_nested(data, "bleed", "top"),
        "bleed.bottom": get_nested(data, "bleed", "bottom"),
        "bleed.left": get_nested(data, "bleed", "left"),
        "bleed.right": get_nested(data, "bleed", "right"),
        "bleed.unit": get_nested(data, "bleed", "unit"),
        "resolution": get_nested(data, "resolution"),
        "fileFormat": get_nested(data, "fileFormat"),
        "specialRequirements": special_str,
        "deadline": get_nested(data, "deadline"),
    }
    # Ensure everything is a string or number (CSV-safe)
    for k, v in row.items():
        if isinstance(v, (list, dict, set)):
            row[k] = json.dumps(v, ensure_ascii=False)
    return row

def folder_jsons_to_csv(folder_path, csv_path):
    files = [f for f in os.listdir(folder_path) if f.lower().endswith(".json")]
    if not files:
        print("⚠️ No .json files found in the selected folder.")
        return

    written = 0
    with open(csv_path, "w", newline="", encoding="utf-8") as out_f:
        writer = csv.DictWriter(out_f, fieldnames=CSV_COLUMNS)
        writer.writeheader()

        for fname in files:
            path = os.path.join(folder_path, fname)
            try:
                data = read_json_with_fallback(path)
                data = coerce_to_dict(data)
                row = to_row(fname, data)
                writer.writerow(row)
                written += 1
                print(f"✅ Processed: {fname}")
            except Exception as e:
                print(f"❌ Skipped {fname}: {e}")

    if written == 0:
        print("⚠️ Nothing written—no valid JSON objects parsed.")
    else:
        print(f"🎉 Wrote {written} row(s) to {csv_path}")

if __name__ == "__main__":
    Tk().withdraw()

    src_folder = filedialog.askdirectory(title="Select folder containing JSON files")
    if not src_folder:
        print("❌ Folder selection cancelled.")
        raise SystemExit(1)

    default_csv = os.path.basename(src_folder.rstrip(os.sep)) + "_jobs.csv"
    dst_csv = filedialog.asksaveasfilename(
        title="Save combined CSV as...",
        initialfile=default_csv,
        defaultextension=".csv",
        filetypes=[("CSV files", "*.csv")]
    )
    if not dst_csv:
        print("❌ Save cancelled.")
        raise SystemExit(1)

    folder_jsons_to_csv(src_folder, dst_csv)
