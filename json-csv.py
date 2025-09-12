import os
import json
import pandas as pd
from tkinter import Tk, filedialog

DECODINGS = ("utf-8-sig", "utf-8", "cp1252")

def _read_text_with_fallback(path):
    """
    Return (text, encoding_used). Tries several encodings and raises the last error if all fail.
    """
    last_err = None
    for enc in DECODINGS:
        try:
            with open(path, "r", encoding=enc, errors="strict") as f:
                return f.read(), enc
        except Exception as e:
            last_err = e
    raise last_err

def read_json_any(path, max_preview=200):
    """
    Reads either standard JSON or NDJSON (one JSON object per line).
    Returns list[dict]. Provides helpful diagnostics.
    """
    text, enc = _read_text_with_fallback(path)
    if not text or not text.strip():
        raise ValueError("File is empty or whitespace only.")

    # Quick HTML check (common when an export failed and saved a login page)
    if text.lstrip().startswith("<"):
        preview = text[:max_preview].replace("\n", " ")
        raise ValueError(f"File appears to be HTML (starts with '<'). Preview: {preview!r}")

    # Try strict JSON first
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            # Prefer the largest list-of-dicts if present
            candidates = [
                v for v in data.values()
                if isinstance(v, list) and all(isinstance(x, dict) for x in v)
            ]
            if candidates:
                candidates.sort(key=len, reverse=True)
                return candidates[0]
            return [data]
        else:
            return [{"value": data}]
    except json.JSONDecodeError:
        pass  # fall back to NDJSON

    # NDJSON mode: parse line-by-line; skip empty and non-JSON lines with logging
    records, bad_lines = [], 0
    for i, line in enumerate(text.splitlines(), start=1):
        s = line.strip()
        if not s:
            continue
        try:
            obj = json.loads(s)
            records.append(obj)
        except json.JSONDecodeError:
            bad_lines += 1
            # keep going; we'll report count at the end
            continue

    if not records:
        # Give a short preview to help diagnose
        preview = text[:max_preview].replace("\n", " ")
        raise ValueError(f"Could not parse as JSON or NDJSON. Preview: {preview!r} (encoding {enc})")

    if bad_lines:
        print(f"⚠️  NDJSON: skipped {bad_lines} malformed line(s) in {os.path.basename(path)}")

    return records

def normalize_and_explode(records, sep="."):
    """
    Flattens dicts and explodes lists into rows until none remain.
    """
    if not isinstance(records, list):
        records = [records]

    df = pd.json_normalize(records, sep=sep)

    while True:
        list_cols = [c for c in df.columns if df[c].apply(lambda x: isinstance(x, list)).any()]
        if not list_cols:
            break

        col = list_cols[0]
        df = df.explode(col, ignore_index=True)

        is_dict = df[col].apply(lambda x: isinstance(x, dict))
        if is_dict.any():
            sub = pd.json_normalize(df[col].where(is_dict, None), sep=sep).add_prefix(f"{col}{sep}")
            df = pd.concat([df.drop(columns=[col]), sub], axis=1)

    # Ensure CSV-safe scalars
    for c in df.columns:
        df[c] = df[c].apply(lambda v: v if not isinstance(v, (list, dict, set)) else json.dumps(v, ensure_ascii=False))
    return df

def folder_jsons_to_csv(folder_path, csv_path):
    json_files = [f for f in os.listdir(folder_path) if f.lower().endswith((".json", ".ndjson"))]
    if not json_files:
        print("⚠️ No .json or .ndjson files found in the selected folder.")
        return

    frames = []
    for fname in json_files:
        path = os.path.join(folder_path, fname)
        try:
            records = read_json_any(path)
            if not records:
                print(f"⚠️ No records found in {fname}")
                continue
            df = normalize_and_explode(records, sep=".")
            df.insert(0, "source_file", fname)
            frames.append(df)
            print(f"✅ Processed: {fname}  ({len(df)} rows)")
        except Exception as e:
            print(f"❌ Skipped {fname}: {e}")

    if not frames:
        print("⚠️ Nothing to write—no valid records parsed.")
        return

    combined = pd.concat(frames, ignore_index=True)
    cols = ["source_file"] + sorted([c for c in combined.columns if c != "source_file"])
    combined = combined.reindex(columns=cols)
    combined.to_csv(csv_path, index=False, encoding="utf-8")
    print(f"🎉 Wrote {len(combined)} total row(s) to: {csv_path}")

if __name__ == "__main__":
    # Minimal UI
    Tk().withdraw()
    folder = filedialog.askdirectory(title="Select folder containing JSON/NDJSON files")
    if not folder:
        print("❌ Folder selection cancelled.")
        raise SystemExit(1)

    default_csv_name = os.path.basename(folder.rstrip(os.sep)) + "_combined.csv"
    csv_path = filedialog.asksaveasfilename(
        title="Save combined CSV as...",
        initialfile=default_csv_name,
        defaultextension=".csv",
        filetypes=[("CSV files", "*.csv")]
    )
    if not csv_path:
        print("❌ Save cancelled.")
        raise SystemExit(1)

    folder_jsons_to_csv(folder, csv_path)
