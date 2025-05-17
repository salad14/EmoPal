import { useState, useEffect, useRef } from 'react';
import useWebSpeechRecognition from '../../hooks/useWebSpeechRecognition';
import './ChatInterface.css';

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: '你好！', sender: 'user' },
    { id: 2, text: '你好，有什么可以帮你的吗？', sender: 'ai' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  
  const {
    listening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    isSpeechRecognitionSupported
  } = useWebSpeechRecognition();

  // 当语音识别结果更新时，更新输入框
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleSendMessage = () => {
    if (inputValue.trim() === '') return;
    
    const newUserMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
    };
    
    setMessages([...messages, newUserMessage]);
    setInputValue('');
    
    // 模拟AI回复（后续会替换为实际API调用）
    setTimeout(() => {
      const aiReply = {
        id: messages.length + 2,
        text: `我收到了你的消息："${newUserMessage.text}"，正在思考回复...`,
        sender: 'ai',
      };
      setMessages(prevMessages => [...prevMessages, aiReply]);
    }, 1000);
  };

  const toggleListen = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="chat-window">
      <div className="messages-area">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {speechError && <p className="error-message">错误: {speechError}</p>}
      
      <div className="input-area">
        <input
          type="text"
          placeholder={listening ? "正在聆听..." : "输入消息..."}
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={(event) => {
            if (event.key === 'Enter') {
              handleSendMessage();
            }
          }}
          disabled={listening}
        />
        <button 
          className="send-button"
          onClick={handleSendMessage} 
          disabled={listening || inputValue.trim() === ''}
        >
          发送
        </button>
        {isSpeechRecognitionSupported && (
          <button 
            className={`mic-button ${listening ? 'listening' : ''}`}
            onClick={toggleListen}
          >
            {listening ? '🛑' : '🎤'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatInterface; 