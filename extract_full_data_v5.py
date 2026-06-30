import fitz  # PyMuPDF
import re
import os
import json
import unicodedata

# Create images directory
os.makedirs("public/images", exist_ok=True)

doc = fitz.open("250-cau-hoi-thi-ly-thuyet-lai-xe-moto-tt.pdf")
print("Opened PDF. Pages:", len(doc))

# Detect common logo/background images
xref_counts = {}
for page in doc:
    for img in page.get_images():
        xref = img[0]
        xref_counts[xref] = xref_counts.get(xref, 0) + 1
logo_xrefs = {xref for xref, count in xref_counts.items() if count > 5}

# Pattern for question header
q_pattern = re.compile(r"^câu\s+(?:hỏi\s+)?(\d+)\s*:", re.IGNORECASE)

global_lines = []
global_images = []

skip_keywords = [
    "tài liệu 250 câu hỏi",
    "trường dạy lái xe tân sơn",
    "hoclaixemoto.com"
]

def should_skip_line(text, page_num):
    text_clean = text.lower().strip()
    if not text_clean:
        return True
    if text_clean.isdigit():
        val = int(text_clean)
        if abs(val - page_num) <= 2:
            return True
    for kw in skip_keywords:
        if kw in text_clean:
            return True
    return False

for page_num in range(len(doc)):
    page = doc[page_num]
    text_dict = page.get_text("dict")
    
    spans = []
    for block in text_dict["blocks"]:
        if block["type"] == 0:  # text
            for line in block["lines"]:
                for span in line["spans"]:
                    span_copy = span.copy()
                    span_copy["text"] = unicodedata.normalize("NFC", span["text"])
                    spans.append(span_copy)
                    
    images = page.get_images()
    for img in images:
        xref = img[0]
        if xref not in logo_xrefs:
            rects = page.get_image_rects(xref)
            if rects:
                bbox = rects[0]
                global_images.append({
                    "xref": xref,
                    "bbox": [bbox.x0, bbox.y0, bbox.x1, bbox.y1],
                    "y": bbox.y0,
                    "page": page_num + 1
                })
            
    page_lines = []
    current_line = []
    current_y = None
    for span in spans:
        y = span["bbox"][1]
        if current_y is None or abs(y - current_y) < 4:
            current_line.append(span)
            if current_y is None:
                current_y = y
        else:
            page_lines.append(current_line)
            current_line = [span]
            current_y = y
    if current_line:
        page_lines.append(current_line)
        
    for line in page_lines:
        line_text = "".join(span["text"] for span in line).strip()
        line_y = line[0]["bbox"][1]
        
        if should_skip_line(line_text, page_num + 1):
            continue
            
        global_lines.append({
            "text": line_text,
            "y": line_y,
            "page": page_num + 1,
            "spans": line
        })

q_indices = []
for idx, line in enumerate(global_lines):
    if q_pattern.match(line["text"]):
        q_indices.append(idx)

raw_questions = []

for i, line_idx in enumerate(q_indices):
    header_line = global_lines[line_idx]
    header_text = header_line["text"]
    match = q_pattern.match(header_text)
    q_num = int(match.group(1))
    
    next_line_idx = q_indices[i + 1] if i + 1 < len(q_indices) else len(global_lines)
    q_lines = global_lines[line_idx:next_line_idx]
    
    question_text_parts = []
    options_data = []
    
    current_option = None
    current_option_red = False
    
    first_line = True
    for line in q_lines:
        line_text = line["text"]
        opt_match = re.match(r"^([1-4])\s*\.\s*(.*)", line_text)
        
        if opt_match:
            if current_option is not None:
                options_data.append((current_option, current_option_red))
            opt_text = opt_match.group(2)
            
            is_red = False
            for span in line["spans"]:
                color = span["color"]
                r = (color >> 16) & 255
                g = (color >> 8) & 255
                b = color & 255
                if r > 180 and g < 120 and b < 120:
                    is_red = True
                    break
            current_option = opt_text
            current_option_red = is_red
        else:
            if current_option is not None:
                current_option += " " + line_text
                for span in line["spans"]:
                    color = span["color"]
                    r = (color >> 16) & 255
                    g = (color >> 8) & 255
                    b = color & 255
                    if r > 180 and g < 120 and b < 120:
                        current_option_red = True
                        break
            else:
                if first_line:
                    q_text = header_text[match.end():].strip()
                    if q_text:
                        question_text_parts.append(q_text)
                    first_line = False
                else:
                    question_text_parts.append(line_text)
                    
    if current_option is not None:
        options_data.append((current_option, current_option_red))
        
    raw_q_text = " ".join(question_text_parts).strip()
    
    # Detect isCrucial BEFORE cleaning the text
    is_crucial = "liệt" in raw_q_text.lower() or "liệt" in header_text.lower()
    
    # Clean the text
    full_question_text = re.sub(r"\s+", " ", raw_q_text)
    full_question_text = re.sub(r"câu điểm liệt", "", full_question_text, flags=re.IGNORECASE)
    full_question_text = re.sub(r"câu liệt", "", full_question_text, flags=re.IGNORECASE).strip()
    
    correct_idx = -1
    cleaned_options = []
    for idx, (opt_text, is_red) in enumerate(options_data):
        cleaned_opt = opt_text.strip()
        cleaned_opt = re.sub(r"\s+", " ", cleaned_opt)
        cleaned_options.append(cleaned_opt)
        if is_red:
            correct_idx = idx
            
    raw_questions.append({
        "id": q_num,
        "questionText": full_question_text,
        "options": cleaned_options,
        "correctAnswer": correct_idx,
        "isCrucial": is_crucial,
        "page": header_line["page"],
        "y": header_line["y"]
    })

seen_ids = {}
final_questions = []

raw_questions.sort(key=lambda x: (x["page"], x["y"]))

for q in raw_questions:
    q_id = q["id"]
    if q_id == 155:
        if 155 in seen_ids:
            q_id = 156
            q["id"] = 156
    seen_ids[q_id] = seen_ids.get(q_id, 0) + 1
    
    page_imgs = [img for img in global_images if img["page"] == q["page"]]
    img_url = None
    if page_imgs:
        if len(page_imgs) == 1:
            img_url = f"/images/img_{page_imgs[0]['xref']}.png"
            xref = page_imgs[0]["xref"]
        else:
            closest_img = min(page_imgs, key=lambda x: abs(x["y"] - q["y"]))
            img_url = f"/images/img_{closest_img['xref']}.png"
            xref = closest_img["xref"]
            
        try:
            img_path = f"public/images/img_{xref}.png"
            if not os.path.exists(img_path):
                pix = fitz.Pixmap(doc, xref)
                if pix.n - pix.alpha > 3:
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                pix.save(img_path)
        except Exception as e:
            print(f"Failed to extract image xref {xref}: {e}")
            
    q["imageUrl"] = img_url
    del q["y"]
    final_questions.append(q)

print(f"Processed {len(final_questions)} final questions.")
print("Crucial questions found:", len([q for q in final_questions if q["isCrucial"]]))

with open("src/data/questions.js", "w", encoding="utf-8") as f:
    f.write("export const questionBank = ")
    json.dump(final_questions, f, ensure_ascii=False, indent=2)
    f.write(";\n")

print("Saved to src/data/questions.js")
doc.close()
