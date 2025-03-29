import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceOnlyMode, setIsVoiceOnlyMode] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
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

  // Setup audio element event listener
  useEffect(() => {
    const audioElement = audioRef.current;
    
    // When audio ends, check if we're in voice-only mode and should auto-start recording
    audioElement.onended = () => {
      if (isVoiceOnlyMode && autoPlay && !isRecording && !isProcessing) {
        // Short delay before starting next recording
        setTimeout(() => {
          startRecording();
        }, 500);
      }
    };
    
    return () => {
      audioElement.onended = null;
    };
  }, [isVoiceOnlyMode, autoPlay, isRecording, isProcessing]);
  
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

  // Toggle between voice-only and default mode
  const toggleMode = () => {
    setIsVoiceOnlyMode(!isVoiceOnlyMode);
  };
  
  return (
    <div className={`app-container ${isVoiceOnlyMode ? 'voice-only-mode' : ''}`}>
      <header>
        <h1>Voice Chat Bot</h1>
        <p>Talk to me or type your message!</p>
        <div className="mode-toggle">
          <label className="switch">
            <input 
              type="checkbox" 
              checked={isVoiceOnlyMode}
              onChange={toggleMode}
            />
            <span className="slider round"></span>
          </label>
          <span className="mode-label">
            {isVoiceOnlyMode ? 'Voice-Only Mode' : 'Text + Voice Mode'}
          </span>
        </div>
        {isVoiceOnlyMode && (
          <div className="auto-play-toggle">
            <label>
              <input 
                type="checkbox" 
                checked={autoPlay}
                onChange={() => setAutoPlay(!autoPlay)}
              />
              Auto-continue conversation
            </label>
          </div>
        )}
      </header>
      
      <div className="chat-container">
        {!isVoiceOnlyMode && (
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
        )}
        
        {isVoiceOnlyMode ? (
          <div className="voice-only-container">
            <div className="voice-status">
              {isRecording ? (
                <div className="recording-indicator">
                  <div className="pulse"></div>
                  <p>Listening...</p>
                </div>
              ) : isProcessing ? (
                <p>Processing...</p>
              ) : (
                <p>Press the button to talk</p>
              )}
            </div>
            
            <button
              className={`voice-only-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              {isRecording ? 'Stop' : isProcessing ? 'Processing...' : 'Start Talking'}
            </button>
            
            {messages.length > 0 && (
              <div className="last-message">
                <p>Last message: <span>{messages[messages.length - 1].content.substring(0, 50)}...</span></p>
              </div>
            )}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}

export default App
