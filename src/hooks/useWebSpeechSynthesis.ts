import { useState, useCallback, useEffect, useRef } from 'react';

// 增强版语音合成选项
interface SpeechSynthesisOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
  onBoundary?: (event: SpeechSynthesisEvent) => void;
  onEnd?: () => void;
  // 新增参数
  addNaturalPauses?: boolean; // 是否自动添加自然停顿
  expressiveness?: number;    // 表达力，影响音调和语速的波动
  voiceType?: 'normal' | 'spongebob' | 'cartoon' | 'robot'; // 音色类型
}

interface WebSpeechSynthesisHook {
  speak: (text: string, options?: SpeechSynthesisOptions) => void;
  stop: () => void;
  speaking: boolean;
  error: string | null;
  getVoices: () => SpeechSynthesisVoice[];
}

// 使用单例模式防止多个组件同时操作语音合成
const isSpeakingGlobal = {
  value: false,
  lastText: '',
  lastTime: 0
};

// 将文本分成自然段落，增加语音的自然感
function processTextForNaturalSpeech(text: string, expressiveness: number = 1.0): string {
  // 替换特殊标点符号为语音合成API更容易理解的形式
  let processed = text
    // 在中文句号、问号、感叹号后添加适当停顿
    .replace(/([。！？])\s*/g, '$1，，')
    // 在逗号、分号后添加短停顿
    .replace(/([，；])\s*/g, '$1，')
    // 规范省略号
    .replace(/\.{3,}|…+/g, '，，')
    // 处理中英文混合
    .replace(/([a-zA-Z])([，。！？；])/g, '$1，$2')
    // 处理括号
    .replace(/[【\[（\(]/g, '，')
    .replace(/[】\]）\)]/g, '，');
  
  // 根据表达力参数调整停顿的强度
  if (expressiveness > 1.0) {
    // 表达力强时，增加停顿强度
    processed = processed.replace(/，，/g, '，，，');
  } else if (expressiveness < 1.0) {
    // 表达力弱时，减少停顿强度
    processed = processed.replace(/，，/g, '，');
  }
  
  return processed;
}

// 应用卡通音色效果
function applyVoiceEffect(utterance: SpeechSynthesisUtterance, voiceType?: string): void {
  console.log(`应用音色效果: ${voiceType || '默认'}, 原始文本长度: ${utterance.text.length}`);
  
  switch(voiceType) {
    case 'spongebob': // 海绵宝宝音色
      utterance.pitch = 1.5;     // 更高的音调
      utterance.rate = 1.1;      // 略快的语速
      // 在文本中添加特殊符号，利用语音引擎对特殊符号的处理方式产生断句效果
      const originalText = utterance.text;
      utterance.text = utterance.text
        .replace(/([，。！？；])/g, '$1~') // 在标点后添加波浪号，产生特殊断句效果
        .replace(/(.{3,5})/g, '$1~'); // 每3-5个字符后添加波浪号，模拟海绵宝宝说话的断句特点
      console.log(`海绵宝宝音色应用完成，文本从 ${originalText.length} 字符变为 ${utterance.text.length} 字符`);
      console.log(`音调: ${utterance.pitch}, 语速: ${utterance.rate}`);
      break;
    
    case 'cartoon': // 一般卡通音色
      utterance.pitch = 1.3;    // 高音调
      utterance.rate = 1.05;    // 略快的语速
      console.log(`卡通音色应用完成，音调: ${utterance.pitch}, 语速: ${utterance.rate}`);
      break;
      
    case 'robot': // 机器人音色
      utterance.pitch = 0.7;    // 低音调
      utterance.rate = 0.9;     // 略慢的语速
      // 添加特殊符号模拟机器人断句效果
      const robotOriginalText = utterance.text;
      utterance.text = utterance.text
        .replace(/([，。！？；])/g, '$1-') // 在标点后添加短横，模拟机械感
        .replace(/(.{5,8})/g, '$1-'); // 每5-8个字符后添加短横
      console.log(`机器人音色应用完成，文本从 ${robotOriginalText.length} 字符变为 ${utterance.text.length} 字符`);
      console.log(`音调: ${utterance.pitch}, 语速: ${utterance.rate}`);
      break;
      
    // 默认不做处理，使用原始设置
    default:
      console.log("使用默认音色，不做特殊处理");
      break;
  }
}

const useWebSpeechSynthesis = (): WebSpeechSynthesisHook => {
  const [speaking, setSpeaking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, options: SpeechSynthesisOptions = {}) => {
    if (!window.speechSynthesis) {
      setError("浏览器不支持语音合成功能。");
      console.error("TTS: 浏览器不支持语音合成功能。");
      return;
    }

    // 防止短时间内重复播放相同内容
    const now = Date.now();
    if (isSpeakingGlobal.value && 
        isSpeakingGlobal.lastText === text && 
        now - isSpeakingGlobal.lastTime < 2000) {
      console.log("TTS: 防止重复播放相同内容:", text.substring(0,20));
      return;
    }

    // 更新全局状态
    isSpeakingGlobal.value = true;
    isSpeakingGlobal.lastText = text;
    isSpeakingGlobal.lastTime = now;

    // 如果当前有正在播放的或待处理的语音，先取消它
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      console.log("TTS: 取消之前的语音。");
      window.speechSynthesis.cancel();
      
      // 添加短暂延迟确保取消完成
      setTimeout(() => {
        performSpeech(text, options);
      }, 150);
    } else {
      performSpeech(text, options);
    }
    
  }, []);
  
  // 执行语音合成
  const performSpeech = (text: string, options: SpeechSynthesisOptions) => {
    // 处理文本，增加自然感
    const expressiveness = options.expressiveness || 1.0;
    const processedText = options.addNaturalPauses !== false 
      ? processTextForNaturalSpeech(text, expressiveness)
      : text;
    
    const utterance = new SpeechSynthesisUtterance(processedText);
    currentUtteranceRef.current = utterance;

    utterance.lang = options.lang || 'zh-CN';
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;

    if (options.voice) {
      utterance.voice = options.voice;
    } else {
      // 尝试自动选择一个中文声音
      const voices = window.speechSynthesis.getVoices();
      const chineseVoice = voices.find(v => v.lang.startsWith('zh'));
      if (chineseVoice) utterance.voice = chineseVoice;
    }

    // 应用特殊音色效果（在设置基本参数后应用，以便覆盖之前的设置）
    if (options.voiceType) {
      applyVoiceEffect(utterance, options.voiceType);
    }

    utterance.onstart = () => {
      console.log("TTS: 开始播放语音 - ", text.substring(0,20));
      setSpeaking(true);
      setError(null);
    };

    utterance.onend = () => {
      console.log("TTS: 语音播放结束 - ", text.substring(0,20));
      if (currentUtteranceRef.current === utterance) {
        setSpeaking(false);
        currentUtteranceRef.current = null;
        isSpeakingGlobal.value = false;
      }
      if (options.onEnd) {
        options.onEnd();
      }
    };

    utterance.onerror = (event) => {
      console.error('TTS: 语音合成错误:', event.error, "for -", text.substring(0,20));
      setError(`语音合成错误: ${event.error || '未知错误'}`);
      if (currentUtteranceRef.current === utterance) {
        setSpeaking(false);
        currentUtteranceRef.current = null;
        isSpeakingGlobal.value = false;
      }
    };

    if (options.onBoundary) {
      utterance.onboundary = options.onBoundary;
    }
    
    console.log("TTS: 尝试播放语音 - ", text.substring(0,20));
    window.speechSynthesis.speak(utterance);
  };

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      console.log("TTS: 停止语音播放。");
      window.speechSynthesis.cancel();
      isSpeakingGlobal.value = false;
    }
  }, []);

  const getVoices = useCallback((): SpeechSynthesisVoice[] => {
    if (!window.speechSynthesis) {
      return [];
    }
    return window.speechSynthesis.getVoices();
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        console.log("TTS: 清理语音合成资源。");
        window.speechSynthesis.cancel();
        isSpeakingGlobal.value = false;
      }
    };
  }, []);

  return {
    speak,
    stop,
    speaking,
    error,
    getVoices
  };
};

export default useWebSpeechSynthesis; 