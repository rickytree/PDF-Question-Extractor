import re
import os
import fitz  # PyMuPDF
import string

def extract_qa_from_pdfs(pdf_paths):
    all_extracted_data = []

    for pdf_path in pdf_paths:
        with fitz.open(pdf_path) as document:
            full_text = "".join([page.get_text() for page in document])
            pattern = r'\d+\s?[-.)]\s?.*?(?:\n[a-zA-Z][).]\s?.*?)+(?:Answer\.?)*(?=\n\d+[-.:)]|$)'
            questions = re.findall(pattern, full_text, re.DOTALL)
        
        filename = os.path.basename(pdf_path)
        filename_without_ext = os.path.splitext(filename)[0]
        
        structured_questions = []
        for question_number, q in enumerate(questions, start=1):
            parts = re.split(r'\n[a-zA-z]\.', q)
            question_text = parts[0]
            options = parts[1:]

            if options:
                answer_key_pattern = r'(?:Answer|Key)[:\s]*([A-D])'
                last_choice = options[-1]
                match = re.search(answer_key_pattern, last_choice, re.IGNORECASE)
                answer_key = match.group(1) if match else ""
                question_text = re.sub(r"^\d+\s?[-.)]", f"Q{question_number}) ", question_text)
                question_dict = {
                    "question": question_text.replace("\n", " ").replace("  ", " ").strip()
                }

                for index, option in enumerate(options):
                    option_text = option.replace("\n", " ").replace("  ", " ").strip()
                    if index == len(options) - 1:
                        option_text = re.sub(answer_key_pattern, '', option_text).strip()
                    letter = string.ascii_lowercase[index]
                    question_dict[f'choice {letter}'] = option_text

                question_dict['Answer'] = answer_key
                question_dict['Filename'] = filename_without_ext
                structured_questions.append(question_dict)
        
        all_extracted_data.append(structured_questions)

    return all_extracted_data