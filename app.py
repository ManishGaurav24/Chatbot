from flask import Flask, render_template, request, jsonify
from flask_cors import CORS  # Add this import
import google.generativeai as genai
from datetime import datetime
from dotenv import load_dotenv
import os
import PyPDF2
from PIL import Image
import io
import base64
from werkzeug.utils import secure_filename
import pathlib
import json
import os.path
import requests  # Add this at the top with other imports

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='static')
CORS(app)  # Enable CORS

# Configure Gemini API using environment variable
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-1.5-flash')

# Azure endpoint configuration
AZURE_ENDPOINT = os.getenv('AZURE_ENDPOINT')
AZURE_API_KEY = os.getenv('AZURE_API_KEY')

CHAT_STORAGE_FILE = 'chat_storage.json'

def load_stored_chats():
    try:
        if os.path.exists(CHAT_STORAGE_FILE) and os.path.getsize(CHAT_STORAGE_FILE) > 0:
            with open(CHAT_STORAGE_FILE, 'r') as f:
                stored_data = json.load(f)
                return stored_data.get('chat_messages', {})
        return {}
    except json.JSONDecodeError as e:
        print(f"Error reading chat storage: {e}")
        if os.path.exists(CHAT_STORAGE_FILE):
            backup_file = f"{CHAT_STORAGE_FILE}.backup"
            os.rename(CHAT_STORAGE_FILE, backup_file)
            print(f"Corrupted file backed up to {backup_file}")
        return {}
    except Exception as e:
        print(f"Unexpected error loading chats: {e}")
        return {}

def save_chats():
    try:
        with open(CHAT_STORAGE_FILE, 'w') as f:
            json.dump({'chat_messages': chat_messages}, f, indent=2)
    except Exception as e:
        print(f"Error saving chats: {e}")

# Load stored chats at startup
chat_messages = load_stored_chats()
chat_sessions = {}  # Store chat sessions separately

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
pathlib.Path(UPLOAD_FOLDER).mkdir(exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    return render_template('index.html')


@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message')
    chat_id = data.get('chatId')
    model_type = data.get('model', 'gemini')  # Default to gemini if not specified

    if chat_id not in chat_messages:
        chat_messages[chat_id] = []

    # Store user message
    chat_messages[chat_id].append({
        'text': message,
        'isUser': True,
        'timestamp': datetime.now().strftime('%H:%M')
    })

    try:
        if model_type == 'azure':
            # Call Azure endpoint
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {AZURE_API_KEY}'
            }
            payload = {
                'chat_input': message
            }
            
            response = requests.post(AZURE_ENDPOINT, json=payload, headers=headers)
            response.raise_for_status()  # Raise an exception for bad status codes
            azure_response = response.json()
            print(f"Azure response structure: {azure_response}")
            if 'chat_output' in azure_response:
                bot_response = azure_response['chat_output']
            elif 'response' in azure_response:
                bot_response = azure_response['response']
            elif 'result' in azure_response:
                bot_response = azure_response['result']
            elif 'choices' in azure_response and len(azure_response['choices']) > 0:
                bot_response = azure_response['choices'][0].get('message', {}).get('content', '')
            else:
                print(f"Unexpected response structure: {azure_response}")
                bot_response = str(azure_response)
            # bot_response = azure_response.get('response') or azure_response.get('result', 'No response from Azure')
        else:
            # Gemini logic
            if chat_id not in chat_sessions:
                chat_sessions[chat_id] = model.start_chat()
            response = chat_sessions[chat_id].send_message(message)
            bot_response = response.text

        # Store bot message
        chat_messages[chat_id].append({
            'text': bot_response,
            'isUser': False,
            'timestamp': datetime.now().strftime('%H:%M')
        })
        
        # Save chats after each message
        save_chats()

        return jsonify({
            'response': bot_response,
            'timestamp': datetime.now().strftime('%H:%M'),
            'chatId': chat_id
        })

    except Exception as e:
        print(f"Error in chat: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    chat_id = request.form.get('chatId')
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        file_content = ""
        file_type = ""
        
        if filename.lower().endswith('.pdf'):
            with open(filepath, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                for page in pdf_reader.pages:
                    file_content += page.extract_text()
            file_type = "pdf"
        else:
            image = Image.open(filepath)
            # Convert image to base64 for Gemini
            with open(filepath, "rb") as img_file:
                file_content = base64.b64encode(img_file.read()).decode('utf-8')
            file_type = "image"
            
        # Store file info in chat history
        if chat_id not in chat_messages:
            chat_messages[chat_id] = []
        
        chat_messages[chat_id].append({
            'text': f"Uploaded {filename}",
            'isUser': True,
            'timestamp': datetime.now().strftime('%H:%M'),
            'file': {
                'type': file_type,
                'content': file_content,
                'name': filename
            }
        })
        
        # Save chats after file upload
        save_chats()
        
        return jsonify({
            'message': 'File uploaded successfully',
            'filename': filename,
            'type': file_type
        })
    
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/get_chat_history')
def get_chat_history():
    return jsonify(chat_messages)

@app.route('/new_chat', methods=['POST'])
def new_chat():
    chat_id = datetime.now().strftime('%Y%m%d%H%M%S')
    chat_messages[chat_id] = []  # Initialize empty chat
    save_chats()  # Save new chat
    return jsonify({'chatId': chat_id})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
