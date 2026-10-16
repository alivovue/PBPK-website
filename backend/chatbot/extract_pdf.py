import json
import re
from pathlib import Path
import pdfplumber

source = Path(r'C:\Users\Mahatma\Downloads\1787666730466_IF3140-2026-W01_2-Performance-Tuning (1).pdf')
output = Path(__file__).parent / 'data' / 'materials.json'
chunks = []
with pdfplumber.open(source) as pdf:
    for page_number, page in enumerate(pdf.pages, start=1):
        text = page.extract_text() or ''
        # Keep paragraphs compact enough for focused retrieval.
        paragraphs = [re.sub(r'\s+', ' ', p).strip() for p in re.split(r'\n\s*\n|\n(?=•)', text)]
        if len(paragraphs) <= 1:
            paragraphs = [re.sub(r'\s+', ' ', line).strip() for line in text.splitlines() if line.strip()]
        buffer = ''
        for paragraph in paragraphs:
            if len(buffer) + len(paragraph) > 650 and buffer:
                chunks.append({'page': page_number, 'text': buffer})
                buffer = paragraph
            else:
                buffer = f'{buffer} {paragraph}'.strip()
        if buffer:
            chunks.append({'page': page_number, 'text': buffer})
output.write_text(json.dumps(chunks, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Extracted {len(chunks)} chunks from {page_number} pages to {output}')
