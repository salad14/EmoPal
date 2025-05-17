import { useState, useEffect, useRef } from 'react';
import useWebSpeechRecognition from '../../hooks/useWebSpeechRecognition.ts';
import { analyzeAndChat } from '../../services/apiClient.ts';
import type { EmotionType } from '../../services/apiClient.ts';
import './ChatInterface.css';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  emotion?: EmotionType;
}

interface ChatInterfaceProps {
  onAISpeak: (text: string, options?: { 
    lang?: string;
    voiceType?: 'normal' | 'spongebob' | 'cartoon' | 'robot';
  }) => void;
  onEmotionChange?: (emotion: EmotionType) => void;
  voiceReady?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onAISpeak, onEmotionChange, voiceReady }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const [userScrolling, setUserScrolling] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const initialGreetingRef = useRef(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType | undefined>(undefined);
  
  const {
    listening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    isSpeechRecognitionSupported
  } = useWebSpeechRecognition();

  // 初始化时让AI打招呼，使用ref确保只执行一次，并且等待语音准备好
  useEffect(() => {
    // 如果已经播放过或语音尚未准备好，则不执行
    if (initialGreetingRef.current || !voiceReady) return;
    
    // 设置初始欢迎语已经执行的标志
    initialGreetingRef.current = true;
    console.log("语音已准备好，准备播放AI初始欢迎语");
    
    // 创建并添加AI欢迎消息
    const welcomeMessage: Message = {
      id: Date.now(),
      text: '你好，我是海绵宝宝接线员，有什么可以帮你的吗？',
      sender: 'ai',
    };
    
    setMessages([welcomeMessage]);
    
    // 增加短暂延迟，确保一切就绪
    const timer = setTimeout(() => {
      console.log("播放AI初始欢迎语:", welcomeMessage.text);
      // 播放欢迎语
      onAISpeak(welcomeMessage.text, { 
        lang: 'zh-CN',
        voiceType: 'spongebob' // 使用海绵宝宝音色
      });
    }, 500); // 短暂延迟即可，因为我们已经确认语音准备好了
    
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceReady]); // 依赖于voiceReady，当语音准备好时触发

  // 当语音识别结果更新时，更新输入框
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  // 修改自动滚动逻辑
  useEffect(() => {
    const messagesArea = messagesAreaRef.current;
    if (!messagesArea) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesArea;
    // 计算是否应该显示"滚动到底部"按钮，使用更大的阈值
    const showButton = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollToBottom(showButton);

    // 只有当用户没有主动滚动，或者是用户自己发送的消息时才自动滚动
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const isUserMessage = lastMessage && lastMessage.sender === 'user';
    const shouldAutoScroll = !userScrolling || isUserMessage;

    if (shouldAutoScroll && messagesEndRef.current) {
      // 如果是用户发送的消息，立即滚动，AI消息则平滑滚动
      const behavior = isUserMessage ? 'auto' : 'smooth';
      
      // 使用requestAnimationFrame确保DOM更新后再滚动
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior, 
          block: 'end' 
        });
      });
    }
  }, [messages, userScrolling]);

  // 优化处理滚动事件的逻辑
  const handleScroll = () => {
    const messagesArea = messagesAreaRef.current;
    if (!messagesArea) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesArea;
    // 计算到底部的距离，使用更小的阈值判断是否在底部
    const scrollBottomDistance = scrollHeight - scrollTop - clientHeight;
    const atBottom = scrollBottomDistance < 20;

    // 只有当距离底部超过100px且用户未标记为正在滚动时，才将状态更新为用户滚动
    if (scrollBottomDistance > 100 && !userScrolling) {
      setUserScrolling(true);
    }

    // 如果滚动到底部且用户标记为正在滚动，则重置状态
    if (atBottom && userScrolling) {
      setUserScrolling(false);
    }

    // 根据是否在底部决定是否显示滚动按钮
    setShowScrollToBottom(!atBottom);
  };

  // 优化滚动到底部的函数
  const scrollToBottom = () => {
    if (!messagesEndRef.current) return;
    
    messagesEndRef.current.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
    
    // 短暂延迟后重置用户滚动状态，确保动画完成
    setTimeout(() => {
      setUserScrolling(false);
      setShowScrollToBottom(false);
    }, 800);  // 增加延迟时间，确保滚动完成
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  // 发送消息并获取AI回复
  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;
    
    const userMessageText = inputValue.trim();
    const newUserMessage: Message = {
      id: Date.now(),
      text: userMessageText,
      sender: 'user',
    };
    
    // 更新消息列表，添加用户消息 (注意这是异步的)
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setInputValue('');
    setIsLoading(true);
    
    // 发送消息时重置滚动状态，确保显示新消息
    setUserScrolling(false);
    setShowScrollToBottom(false);
    
    // 添加临时消息表示AI正在思考
    const thinkingMessageId = Date.now() + 1;
    const thinkingMessage: Message = {
      id: thinkingMessageId,
      text: '正在思考...',
      sender: 'ai',
    };
    
    // 收集当前所有消息，包括历史消息、用户新消息和思考消息
    // 重要：不能依赖异步的setMessages的回调中的赋值
    const allMessages = [
      ...messages, // 获取当前状态中的所有历史消息
      newUserMessage, // 添加用户刚刚发送的消息
      thinkingMessage // 添加思考消息
    ];
    
    // 更新UI显示
    setMessages(allMessages);
    
    try {
      // 构建要发送给API的聊天历史，过滤掉"正在思考"消息
      const chatHistory = allMessages
        .filter(msg => msg.id !== thinkingMessageId) // 过滤掉"正在思考"消息
        .map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          emotion: msg.emotion
        }));
      
      // 调用情感分析和AI回复API
      console.log('发送用户消息到API:', userMessageText);
      console.log('发送聊天历史:', chatHistory.length, '条消息');
      console.log('聊天历史内容:', JSON.stringify(chatHistory));
      
      // 发送完整的聊天历史给API
      const response = await analyzeAndChat(userMessageText, chatHistory);
      console.log('API响应:', response);
      
      // 检查是否有错误信息
      if (response.error) {
        console.warn('API返回错误信息:', response.error);
      }
      
      // 更新情感状态
      if (response.detectedEmotion && onEmotionChange) {
        console.log('更新情感状态:', response.detectedEmotion);
        onEmotionChange(response.detectedEmotion);
        setCurrentEmotion(response.detectedEmotion);
      }
      
      // 替换思考中消息为实际回复
      const aiReply: Message = {
        id: thinkingMessageId,
        text: response.reply,
        sender: 'ai',
        emotion: response.detectedEmotion
      };
      
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === thinkingMessageId ? aiReply : msg
        )
      );
      
      // 使用TTS朗读AI回复
      if (onAISpeak) {
        onAISpeak(response.reply, { 
          lang: 'zh-CN',
          voiceType: 'spongebob' // 使用海绵宝宝音色
        });
      }
    } catch (error) {
      console.error('获取AI回复失败:', error);
      
      // 替换思考中消息为错误消息
      const errorMessage: Message = {
        id: thinkingMessageId,
        text: '抱歉，我暂时无法回应，请稍后再试。' + 
              (error instanceof Error ? `\n\n错误信息: ${error.message}` : ''),
        sender: 'ai',
      };
      
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === thinkingMessageId ? errorMessage : msg
        )
      );
      
      // 错误提示也需要TTS朗读
      if (onAISpeak) {
        onAISpeak('抱歉，我暂时无法回应，请稍后再试。', { 
          lang: 'zh-CN',
          voiceType: 'spongebob' // 使用海绵宝宝音色
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListen = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className={`chat-window emotion-${currentEmotion}`}>
      <div 
        className="messages-area" 
        ref={messagesAreaRef}
        onScroll={handleScroll}
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender} ${msg.emotion ? `emotion-${msg.emotion}` : ''}`}>
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 滚动到底部按钮 */}
      {showScrollToBottom && (
        <button className="scroll-to-bottom" onClick={scrollToBottom}>
          ↓
        </button>
      )}
      
      {speechError && <p className="error-message">错误: {speechError}</p>}
      
      <div className="input-area">
        <input
          id="chat-input"
          name="chat-input"
          type="text"
          placeholder={listening ? "正在聆听..." : isLoading ? "AI正在回应..." : "输入消息..."}
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={(event: React.KeyboardEvent) => {
            if (event.key === 'Enter') {
              handleSendMessage();
            }
          }}
          disabled={listening || isLoading}
        />
        <button 
          className="send-button"
          onClick={handleSendMessage} 
          disabled={listening || isLoading || inputValue.trim() === ''}
        >
          {isLoading ? '...' : '发送'}
        </button>
        {isSpeechRecognitionSupported && (
          <button 
            className={`mic-button ${listening ? 'listening' : ''}`}
            onClick={toggleListen}
            disabled={isLoading}
          >
            {listening ? '🛑' : '🎤'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatInterface; 