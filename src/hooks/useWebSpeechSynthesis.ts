import { useState, useCallback, useEffect, useRef } from 'react';

interface SpeechSynthesisOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
  onBoundary?: (event: SpeechSynthesisEvent) => void;
  onEnd?: () => void;
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
    }

    const utterance = new SpeechSynthesisUtterance(text);
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
    
    // 短暂延迟后播放，给浏览器一点时间处理 cancel
    setTimeout(() => {
      console.log("TTS: 尝试播放语音 - ", text.substring(0,20));
      window.speechSynthesis.speak(utterance);
    }, 100); // 增加延迟时间到100ms
  }, []);

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