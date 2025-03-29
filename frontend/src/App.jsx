import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(new Audio());
  const messagesEndRef = useRef(null);
  
  // Backend API URL
  const API_URL = 'http://localhost:5001';
  
  useEffect(() => {
    // Auto-scroll to the latest message
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        audioChunksRef.current = [];
        await transcribeAudio(audioBlob);
      };
      
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access your microphone. Please check your browser permissions.');
    }
  };
  
  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      
      // Stop all audio tracks to release the microphone
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };
  
  // Transcribe audio using OpenAI Whisper API
  const transcribeAudio = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      const response = await fetch(`${API_URL}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.text) {
        // Add user message to chat
        const userMessage = data.text;
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        
        // Get AI response
        getChatResponse(userMessage);
      } else {
        console.error('Transcription failed:', data.error);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setIsProcessing(false);
    }
  };
  
  // Send message and get response from OpenAI
  const getChatResponse = async (message, history = []) => {
    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          history,
        }),
      });
      
      const data = await response.json();
      
      if (data.text) {
        // Add AI response to chat
        setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
        
        // Convert AI response to speech
        getTextToSpeech(data.text);
      } else {
        console.error('Chat completion failed:', data.error);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error getting chat response:', error);
      setIsProcessing(false);
    }
  };
  
  // Convert text to speech using OpenAI API
  const getTextToSpeech = async (text) => {
    try {
      const response = await fetch(`${API_URL}/api/text-to-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: 'nova',  // Can be: alloy, echo, fable, onyx, nova, shimmer
        }),
      });
      
      const data = await response.json();
      
      if (data.audio) {
        // Play audio
        const audioSrc = `data:audio/${data.format};base64,${data.audio}`;
        audioRef.current.src = audioSrc;
        audioRef.current.play();
        setIsProcessing(false);
      } else {
        console.error('Text-to-speech failed:', data.error);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error getting text-to-speech:', error);
      setIsProcessing(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim() === '') return;
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: inputMessage }]);
    
    // Get AI response
    setIsProcessing(true);
    getChatResponse(inputMessage);
    
    // Clear input
    setInputMessage('');
  };
  
  return (
    <div className="app-container">
      <header>
        <h1>Voice Chat Bot</h1>
        <p>Talk to me or type your message!</p>
      </header>
      
      <div className="chat-container">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>Press the microphone button and start talking, or type a message below!</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div className="message-content">{message.content}</div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="input-container">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isProcessing}
            />
            <button 
              type="submit" 
              className="send-button"
              disabled={isProcessing || inputMessage.trim() === ''}
            >
              Send
            </button>
          </form>
          
          <button
            className={`mic-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            {isRecording ? 'Stop' : isProcessing ? 'Processing...' : 'Start Recording'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
