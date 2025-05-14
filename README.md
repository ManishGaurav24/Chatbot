# Groot - AI Chatbot with Gemini and Azure Integration

A versatile chatbot application that leverages both Google's Gemini and Azure's AI capabilities. The application features a modern, responsive UI with theme switching, file upload capabilities, voice input/output, and the ability to switch between different AI models.

## Features

- 🤖 Dual AI Model Support (Gemini and Azure)
- 🌓 Dark/Light Theme Toggle
- 🎤 Voice Input Support
- 🔊 Text-to-Speech Output
- 📁 File Upload Support (PDF, Images)
- 📱 Responsive Design
- 💬 Chat History Management
- 🍔 Collapsible Sidebar

## Project Structure

```
gemini_chatbot/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── .env                  # Environment variables (create this)
├── .gitignore           # Git ignore rules
├── static/              # Static files
│   ├── script.js        # Frontend JavaScript
│   ├── style.css        # CSS styles
│   └── images/          # Image assets
├── templates/           # HTML templates
│   └── index.html      # Main application page
└── uploads/            # File upload directory
```

## Setup Instructions

### 1. Clone the Repository

```powershell
git clone <repository-url>
cd gemini_chatbot
```

### 2. Create and Activate Virtual Environment

```powershell
python -m venv venv
.\venv\Scripts\Activate
```

### 3. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 4. Create Environment Variables

Create a `.env` file in the root directory with the following content:

```env
GEMINI_API_KEY=your_gemini_api_key
MODEL_NAME=gemini-1.5-flash
AZURE_ENDPOINT=your_azure_endpoint
AZURE_API_KEY=your_azure_api_key
```

Replace the placeholder values with your actual API keys and endpoints.

### 5. Run the Application

```powershell
python app.py
```

The application will be accessible at `http://localhost:5000`

## Environment Variables

- `GEMINI_API_KEY`: Your Google Gemini API key
- `MODEL_NAME`: Gemini model name (default: gemini-1.5-flash)
- `AZURE_ENDPOINT`: Your Azure endpoint URL
- `AZURE_API_KEY`: Your Azure API key

## Features in Detail

### AI Model Switching
- Toggle between Gemini and Azure models using the switch in the navigation bar
- Each model maintains its own chat history

### File Upload Support
- Supports PDF documents and images (PNG, JPG, JPEG)
- Files are processed and can be referenced in the conversation

### Voice Interactions
- Voice input support with speech-to-text conversion
- Text-to-speech output for bot responses
- Toggle speech output on/off

### Theme Switching
- Switch between light and dark themes
- Theme preference is persisted across sessions

## Development Notes

### Required Python Packages
- Flask
- google-generativeai
- python-dotenv
- Pillow
- PyPDF2
- Flask-CORS

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Microphone access for voice features

## Troubleshooting

1. If you encounter CORS issues:
   - Ensure Flask-CORS is properly installed
   - Check your Azure endpoint configuration

2. If voice features don't work:
   - Grant microphone permissions in your browser
   - Check browser compatibility

3. If file uploads fail:
   - Check upload directory permissions
   - Verify file size limits

## Security Notes

- API keys are stored in `.env` file (not committed to repository)
- File uploads are sanitized and validated
- CORS settings are configured for security

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
