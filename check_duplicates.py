import fitz
import re
import unicodedata

doc = fitz.open("250-cau-hoi-thi-ly-thuyet-lai-xe-moto-tt.pdf")
q_pattern = re.compile(r"^câu\s+(?:hỏi\s+)?(\d+)\s*:", re.IGNORECASE)

id_counts = {}

for page_num in range(len(doc)):
    page = doc[page_num]
    text_dict = page.get_text("dict")
    spans = []
    for block in text_dict["blocks"]:
        if block["type"] == 0:
            for line in block["lines"]:
                for span in line["spans"]:
                    spans.append(unicodedata.normalize("NFC", span["text"]))
                    
    # Combine spans to find lines
    text = "".join(spans)
    # Search for all matches of q_pattern in the text of the page
    # Let's search using re.finditer on lines
    lines = page.get_text().split("\n")
    for line in lines:
        line_clean = unicodedata.normalize("NFC", line).strip()
        match = q_pattern.match(line_clean)
        if match:
            q_num = int(match.group(1))
            id_counts[q_num] = id_counts.get(q_num, []) + [page_num + 1]

for q_id, pages in id_counts.items():
    if len(pages) > 1:
        print(f"ID {q_id} appears on pages: {pages}")
