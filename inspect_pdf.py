import fitz  # PyMuPDF
import sys

doc = fitz.open("250-cau-hoi-thi-ly-thuyet-lai-xe-moto-tt.pdf")

with open("pdf_inspect_output.txt", "w", encoding="utf-8") as f:
    f.write(f"Total pages: {len(doc)}\n\n")
    for page_num in range(min(15, len(doc))):
        page = doc[page_num]
        f.write(f"--- PAGE {page_num + 1} ---\n")
        f.write(page.get_text())
        f.write("\n\n")
        
        images = page.get_images()
        f.write(f"Images count on page {page_num + 1}: {len(images)}\n")
        for img_idx, img in enumerate(images):
            f.write(f"  Image {img_idx}: xref={img[0]}, width={img[2]}, height={img[3]}\n")
        f.write("\n" + "="*50 + "\n\n")

print("Inspection completed. Saved to pdf_inspect_output.txt")
