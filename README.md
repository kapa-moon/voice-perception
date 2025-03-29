# Voice Chat Bot

A simple and cute voice chat application that lets you talk with an AI using your microphone or text input.

## Features

- **Voice Input**: Record your voice and have it automatically transcribed
- **Text Input**: Type messages if you prefer
- **Voice Output**: Hear AI responses in a natural-sounding voice
- **Voice-Only Mode**: Switch to a pure voice interface with auto-continuation
- **Cute Design**: Pleasant UI with a friendly aesthetic

## Tech Stack

- **Frontend**: React with Vite, modern CSS
- **Backend**: Flask, OpenAI API
- **APIs Used**:
  - OpenAI Whisper for speech-to-text
  - OpenAI GPT-4o for AI responses
  - OpenAI TTS for text-to-speech

## Setup

### Prerequisites

- Node.js and npm
- Python 3.8+
- OpenAI API key

### Backend Setup

1. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   - Ensure the `.env` file in the root directory has your OpenAI API key:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```

4. Start the Flask server:
   ```bash
   python app.py
   ```
   The server will run on http://localhost:5000

### Frontend Setup

1. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will run on http://localhost:5173

3. Open your browser and navigate to http://localhost:5173

## Usage

1. **Switch Between Modes**:
   - Toggle the switch at the top to change between "Text + Voice Mode" and "Voice-Only Mode"
   - In Voice-Only Mode, the conversation history is still maintained but the interface focuses on voice interaction

2. **Voice-Only Mode**:
   - Click the large circular button to start talking
   - After the AI responds, it can automatically start listening again (toggle "Auto-continue conversation")
   - The last message is displayed at the bottom for context
   - Switch back to Text+Voice mode anytime to see your full conversation history

3. **Voice Chat**:
   - Click the microphone button to start recording
   - Speak your message
   - Click the stop button when you're done
   - Wait for the AI response (both text and audio)

4. **Text Chat**:
   - Type your message in the input field
   - Press Enter or click the Send button
   - Wait for the AI response

## Note

This application requires microphone permissions in your browser. When prompted, please allow access to your microphone for voice recording functionality. 