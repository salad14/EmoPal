import './App.css';
import ChatInterface from './components/ChatInterface/ChatInterface.tsx';
import VirtualAgent from './components/VirtualAgent/VirtualAgent.tsx';
import MoodDiary from './components/MoodDiary/MoodDiary.tsx';
import useWebSpeechSynthesis from './hooks/useWebSpeechSynthesis.ts';
import { useState, useEffect, useRef } from 'react';
import type { EmotionType } from './services/apiClient.ts';

function App() {
  const { speak, speaking, /* stop, */ getVoices } = useWebSpeechSynthesis();
  const [targetViseme, setTargetViseme] = useState('neutral');
  // const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | undefined>(undefined);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('neutral');
  const [speechRate, setSpeechRate] = useState<number>(0.9); // 语速，默认稍慢一点更自然
  const [speechPitch, setSpeechPitch] = useState<number>(1.0); // 音调
  // 固定使用海绵宝宝音色，不再提供切换选项
  const voiceType = 'spongebob';
  const isInitializedRef = useRef(false);
  const [voiceReady, setVoiceReady] = useState(false); // 跟踪语音是否准备好

  // 预加载语音引擎
  useEffect(() => {
    // 启动语音引擎预热
    if (window.speechSynthesis) {
      const initUtterance = new SpeechSynthesisUtterance('');
      initUtterance.volume = 0; // 静音
      window.speechSynthesis.speak(initUtterance);
      console.log("语音引擎预热完成");
    }
  }, []);

  // 获取并设置可用声音列表
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    const loadVoices = () => {
      const voices = getVoices();
      if (voices.length > 0) {
        // setAvailableVoices(voices);
        
        // 优先使用Yunxia，其次是Xiaoyi
        const yunxiaVoice = voices.find(voice => voice.name.includes('Yunxia')); // 微软云夏 (第一优先)
        const xiaoyiVoice = voices.find(voice => voice.name.includes('Xiaoyi')); // 微软晓伊 (第二优先)
        
        // 按优先级选择
        const preferredVoice = yunxiaVoice || xiaoyiVoice;
        
        // 如果找不到首选声音，回退到任何中文声音
        const chineseVoice = preferredVoice || voices.find(voice => voice.lang.startsWith('zh'));
        
        if (chineseVoice) {
          setSelectedVoice(chineseVoice);
          setVoiceReady(true); // 标记语音已准备好
          console.log("已选择中文语音:", chineseVoice.name);
          
          // 记录语音选择详情
          if (yunxiaVoice) {
            console.log("找到Yunxia语音，优先使用");
          } else if (xiaoyiVoice) {
            console.log("未找到Yunxia语音，使用Xiaoyi语音");
          } else {
            console.log("未找到指定语音，使用其他中文语音:", chineseVoice.name);
          }
        } else {
          console.log("未找到中文语音，使用浏览器默认语音。");
          setVoiceReady(true); // 即使没有找到特定语音，也标记为准备好
        }
        
        isInitializedRef.current = true;
      } else {
        // 有些浏览器需要 voiceschanged 事件来加载声音
        if (window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = () => {
            const updatedVoices = getVoices();
            // setAvailableVoices(updatedVoices);
            
            // 优先使用Yunxia，其次是Xiaoyi，按照明确的顺序
            const yunxiaVoice = updatedVoices.find(voice => voice.name.includes('Yunxia')); // 微软云夏 (第一优先)
            const xiaoyiVoice = updatedVoices.find(voice => voice.name.includes('Xiaoyi')); // 微软晓伊 (第二优先)
            
            // 按优先级选择
            const preferredVoice = yunxiaVoice || xiaoyiVoice;
            
            const chineseVoice = preferredVoice || updatedVoices.find(voice => voice.lang.startsWith('zh'));
            
            if (chineseVoice) {
              setSelectedVoice(chineseVoice);
              setVoiceReady(true); // 标记语音已准备好
              console.log("已选择中文语音 (voiceschanged后):", chineseVoice.name);
              
              // 记录语音选择详情
              if (yunxiaVoice) {
                console.log("找到Yunxia语音，优先使用 (voiceschanged后)");
              } else if (xiaoyiVoice) {
                console.log("未找到Yunxia语音，使用Xiaoyi语音 (voiceschanged后)");
              } else {
                console.log("未找到指定语音，使用其他中文语音 (voiceschanged后):", chineseVoice.name);
              }
            } else {
              console.log("未找到中文语音 (voiceschanged后)，使用浏览器默认语音。");
              setVoiceReady(true); // 即使没有找到特定语音，也标记为准备好
            }
            
            isInitializedRef.current = true;
          };
        }
      }
    };

    // 尝试立即加载语音
    loadVoices();
    
    // 如果5秒后仍未初始化，强制标记为准备好
    const fallbackTimer = setTimeout(() => {
      if (!voiceReady) {
        console.log("语音初始化超时，使用默认设置");
        setVoiceReady(true);
      }
    }, 5000);
    
    // 清理 onvoiceschanged 和定时器
    return () => {
      clearTimeout(fallbackTimer);
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [getVoices, voiceReady]);

  // 根据当前情感调整语音参数
  useEffect(() => {
    switch(currentEmotion) {
      case 'positive':
        setSpeechRate(1.2); // 积极情绪语速稍快
        setSpeechPitch(1.2); // 音调略高
        break;
      case 'negative':
        setSpeechRate(0.75); // 消极情绪语速稍慢
        setSpeechPitch(0.6); // 音调略低
        break;
      case 'neutral':
      default:
        setSpeechRate(0.9); // 中性情绪适中语速
        setSpeechPitch(1.0); // 默认音调
        break;
    }
  }, [currentEmotion]);

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

  // 增强语音播放函数，添加自然停顿和变音
  const handleAISpeak = (text: string, options?: any) => {
    // 如果语音尚未准备好，添加一个短暂的延迟
    if (!voiceReady) {
      console.log("语音尚未准备好，延迟播放...");
      setTimeout(() => {
        console.log("延迟后再次尝试播放语音");
        handleAISpeak(text, options); // 递归调用自身，重试
      }, 1000);
      return;
    }
    
    // 根据情感设置表达力
    let expressiveness = 1.0;
    if (currentEmotion === 'positive') {
      expressiveness = 1.2; // 积极情绪表达力更强
    } else if (currentEmotion === 'negative') {
      expressiveness = 0.9; // 消极情绪表达力略弱
    }
    
    const speakOptions = {
      ...options,
      rate: speechRate,
      pitch: speechPitch,
      onBoundary: handleSpeechBoundary,
      onEnd: handleSpeechEnd,
      voice: selectedVoice,
      // 新增参数
      addNaturalPauses: true,
      expressiveness: expressiveness,
      voiceType: voiceType // 固定使用海绵宝宝音色
    };
    
    // 记录详细日志以便调试
    console.log("播放语音, 使用语音:", selectedVoice?.name || "默认语音", 
                "音色类型:", voiceType,
                "语速:", speechRate,
                "音调:", speechPitch);
    
    speak(text, speakOptions);
  };
  
  // 处理情感变化
  const handleEmotionChange = (emotion: EmotionType) => {
    console.log(`情感状态变化: ${currentEmotion} -> ${emotion}`);
    setCurrentEmotion(emotion);
    
    // 情感变化会触发语音参数调整 (通过上面的useEffect实现)
  };

  // 列出可用的语音选项（调试用）
  const listAvailableVoices = () => {
    const voices = getVoices();
    console.log("所有可用语音:", voices.map(v => `${v.name} (${v.lang})`));
  };

  return (
    <div className={`app-container emotion-${currentEmotion}`}>
      <header className="app-header">
        <h1>EmoPal - 心灵伙伴</h1>
      </header>
      
      <main className="app-main">
        <div className="left-sidebar">
          <MoodDiary />
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
            voiceReady={voiceReady}  // 传递语音准备状态
          />
        </div>
      </main>
    </div>
  );
}

export default App;
