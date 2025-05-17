import './App.css';
import ChatInterface from './components/ChatInterface/ChatInterface.tsx';
import VirtualAgent from './components/VirtualAgent/VirtualAgent.tsx';
import useWebSpeechSynthesis from './hooks/useWebSpeechSynthesis.ts';
import { useState, useEffect, useRef } from 'react';
import type { EmotionType } from './services/apiClient.ts';

function App() {
  const { speak, speaking, /* stop, */ getVoices } = useWebSpeechSynthesis();
  const [targetViseme, setTargetViseme] = useState('neutral');
  // const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | undefined>(undefined);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('neutral');
  const isInitializedRef = useRef(false);

  // 获取并设置可用声音列表
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    const loadVoices = () => {
      const voices = getVoices();
      if (voices.length > 0) {
        // setAvailableVoices(voices);
        // 尝试找到一个中文声音并设置为默认
        const chineseVoice = voices.find(voice => voice.lang.startsWith('zh'));
        if (chineseVoice) {
          setSelectedVoice(chineseVoice);
          console.log("已选择中文语音:", chineseVoice.name);
        } else {
          console.log("未找到中文语音，使用浏览器默认语音。");
        }
        isInitializedRef.current = true;
      } else {
        // 有些浏览器需要 voiceschanged 事件来加载声音
        if (window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = () => {
            const updatedVoices = getVoices();
            // setAvailableVoices(updatedVoices);
            const chineseVoice = updatedVoices.find(voice => voice.lang.startsWith('zh'));
            if (chineseVoice) {
              setSelectedVoice(chineseVoice);
              console.log("已选择中文语音 (voiceschanged后):", chineseVoice.name);
            } else {
              console.log("未找到中文语音 (voiceschanged后)，使用浏览器默认语音。");
            }
            isInitializedRef.current = true;
          };
        }
      }
    };

    loadVoices();
    // 清理 onvoiceschanged
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [getVoices]);

  const handleSpeechBoundary = (event: SpeechSynthesisEvent) => {
    const text = event.utterance.text;
    const charIndex = event.charIndex;
    let currentSegment = "";
    
    let spaceIndex = text.indexOf(' ', charIndex);
    if (spaceIndex === -1) spaceIndex = text.length;
    // 确保 charIndex 不会超出文本长度
    if (charIndex < text.length) {
      currentSegment = text.substring(charIndex, spaceIndex).toLowerCase();
    }

    // 更细致的中文口型判断
    if (currentSegment.match(/[啊腌]/) || currentSegment.startsWith('a')) setTargetViseme('A');
    else if (currentSegment.match(/[诶欸衣医]/) || currentSegment.startsWith('i') || currentSegment.startsWith('e') || currentSegment.startsWith('y')) setTargetViseme('E');
    else if (currentSegment.match(/[喔哦噢]/) || currentSegment.startsWith('o') || currentSegment.startsWith('u')|| currentSegment.startsWith('w')) setTargetViseme('O');
    else if (currentSegment.match(/[不吗吧]/) || currentSegment.startsWith('m') || currentSegment.startsWith('b') || currentSegment.startsWith('p')) setTargetViseme('MBP');
    else setTargetViseme('neutral');
  };
  
  const handleSpeechEnd = () => {
    setTargetViseme('neutral');
  };

  const handleAISpeak = (text: string, options?: any) => {
    const speakOptions = {
      ...options,
      onBoundary: handleSpeechBoundary,
      onEnd: handleSpeechEnd,
      voice: selectedVoice,
    };
    speak(text, speakOptions);
  };
  
  // 处理情感变化
  const handleEmotionChange = (emotion: EmotionType) => {
    console.log(`情感状态变化: ${currentEmotion} -> ${emotion}`);
    setCurrentEmotion(emotion);
    
    // 这里可以根据情感变化调整虚拟形象的表现
    // 如果需要，可以添加额外的动画或视觉反馈
  };

  return (
    <div className={`app-container emotion-${currentEmotion}`}>
      <header className="app-header">
        <h1>EmoPal - 心灵伙伴</h1>
      </header>
      
      <main className="app-main">
        <div className="left-sidebar">
          {/* 左侧预留空间，未来可能添加功能 */}
        </div>
        
        <div className="virtual-agent-section">
          <VirtualAgent 
            isSpeaking={speaking} 
            targetVisemeKey={targetViseme} 
          />
        </div>
        
        <div className="chat-section">
          <ChatInterface 
            onAISpeak={handleAISpeak} 
            onEmotionChange={handleEmotionChange} 
          />
        </div>
      </main>
      
      {/* 显示当前情感状态的调试信息 */}
      <div className="emotion-debug">
        当前情感: {currentEmotion}
      </div>
    </div>
  );
}

export default App;
