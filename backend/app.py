import os
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv
import base64
import io

# Load environment variables
load_dotenv()

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set")

# Create a client with the older API style to avoid compatibility issues
client = OpenAI(api_key=api_key)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    """
    Endpoint to transcribe audio to text using OpenAI's Whisper API
    """
    try:
        # Get audio data from request
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        # Save audio file temporarily
        temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        audio_file.save(temp_audio.name)
        
        # Transcribe audio using OpenAI
        with open(temp_audio.name, "rb") as file:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=file
            )
        
        # Get transcribed text
        transcribed_text = transcription.text
        
        # Clean up temp file
        os.unlink(temp_audio.name)
        
        return jsonify({'text': transcribed_text})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat_completion():
    """
    Endpoint to get AI response using OpenAI's chat completion API
    """
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400
        
        # Get response from OpenAI
        user_message = data['message']
        messages = [{"role": "user", "content": user_message}]
        
        # Include conversation history if provided
        if 'history' in data and data['history']:
            messages = data['history'] + [{"role": "user", "content": user_message}]
        
        # Get response from OpenAI
        response = client.chat.completions.create(
            model="gpt-4o",  # Using GPT-4o for better voice interaction
            messages=messages,
            max_tokens=150
        )
        
        ai_response_text = response.choices[0].message.content
        
        return jsonify({
            'text': ai_response_text,
            'role': 'assistant'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    """
    Endpoint to convert text to speech using OpenAI's TTS API
    """
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text']
        voice = data.get('voice', 'nova')
        
        # Convert text to speech
        response = client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text
        )
        
        # Convert to base64 for easy transmission
        # Create a temporary file to save the audio data
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
        temp_file_path = temp_file.name
        temp_file.close()
        
        # Save the audio to the temporary file
        response.stream_to_file(temp_file_path)
        
        # Read the file and convert to base64
        with open(temp_file_path, 'rb') as audio_file:
            audio_base64 = base64.b64encode(audio_file.read()).decode('utf-8')
        
        # Clean up the temporary file
        os.unlink(temp_file_path)
        
        return jsonify({
            'audio': audio_base64,
            'format': 'mp3'
        })
    
    except Exception as e:
        import traceback
        print("Text-to-speech error:", str(e))
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True) 