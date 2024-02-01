import os
import pdfExtractor
from werkzeug.utils import secure_filename
from flask import Flask, render_template, request, jsonify
from supabase import create_client, Client

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads/'

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/view", methods=["POST"])
def view():
    uploaded_files = request.files.getlist("pdfFiles")
    pdf_paths = []
    for file in uploaded_files:
        if file:
            filename = secure_filename(file.filename)
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(save_path)
            pdf_paths.append(save_path)

    extracted_data = pdfExtractor.extract_qa_from_pdfs(pdf_paths)
    return render_template("pdf_viewer.html", data=extracted_data)

@app.route('/import-to-supabase', methods=['POST'])
def handle_import():
    data_to_import = request.json.get('data')
    quiz_name = request.json.get('quizName', '')
    exam_name = request.json.get('examName', '')
    if not data_to_import:
        return jsonify({'error': 'No data provided'}), 400

    try:
        import_to_supabase(data_to_import, quiz_name, exam_name)
        return jsonify({'message': 'Data imported successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def import_to_supabase(data_to_import, quiz_name, exam_name):
    url = "https://vajgjcypgtvjqbwduhmi.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhamdqY3lwZ3R2anFid2R1aG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTkzMDIxNjgsImV4cCI6MjAxNDg3ODE2OH0.anO9iJJjOnUoo4q6lrGc-69bEX5pN9SmIhfX_NMYC1w"
    supabase: Client = create_client(url, key)

    bulk_data = []
    for item in data_to_import:
        qtext = item.get('question', '')
        processed_qtext = qtext.split(") ")[1] if ") " in qtext else qtext
        new_record = {
            'qText': processed_qtext,
            'c1': item.get('choice a', ''),
            'c2': item.get('choice b', ''),
            'c3': item.get('choice c', ''),
            'c4': item.get('choice d', ''),
            'correctChoice': item.get('Answer', ''),
            'fullExplaination': '',
            're_Quiz': quiz_name,
            're_Exam': exam_name
        }
        bulk_data.append(new_record)

    try:
        supabase.table("questions").insert(bulk_data).execute()
    except Exception as e:
        print(f'Failed to insert questions: {e}')

if __name__ == "__main__":
    app.run(debug=True)
