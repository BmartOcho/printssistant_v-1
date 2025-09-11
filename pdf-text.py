import os
import PyPDF2
from tkinter import Tk, filedialog

def pdf_to_text(pdf_path, output_folder):
    # Read PDF
    with open(pdf_path, "rb") as pdf_file:
        reader = PyPDF2.PdfReader(pdf_file)
        text = ""

        for page_num, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text()
            if page_text:
                text += f"\n--- Page {page_num} ---\n"
                text += page_text + "\n"

    # Build output path
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    txt_path = os.path.join(output_folder, base_name + "_converted.txt")

    # Write to file
    with open(txt_path, "w", encoding="utf-8") as txt_file:
        txt_file.write(text)

    print(f"✅ Saved: {txt_path}")


if __name__ == "__main__":
    Tk().withdraw()

    # Prompt for source and destination folders
    source_folder = filedialog.askdirectory(title="Select folder with PDF files")
    dest_folder = filedialog.askdirectory(title="Select folder to save text files")

    if not source_folder or not dest_folder:
        print("❌ Folder selection cancelled.")
    else:
        # Process all PDFs in source folder
        pdf_files = [f for f in os.listdir(source_folder) if f.lower().endswith(".pdf")]

        if not pdf_files:
            print("⚠️ No PDF files found in the selected folder.")
        else:
            print(f"📂 Found {len(pdf_files)} PDF(s). Converting...")
            for pdf_file in pdf_files:
                pdf_path = os.path.join(source_folder, pdf_file)
                pdf_to_text(pdf_path, dest_folder)
            print("🎉 Batch processing complete!")
