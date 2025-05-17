import { useState, useCallback } from 'react';

const useWebSpeechSynthesis = () => {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState(null);

  const speak = useCallback((text, options = {}) => {
    if (!window.speechSynthesis) {
      setError("浏览器不支持语音合成功能。");
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || 'zh-CN';
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;

    // 如果提供了voice（语音），使用指定的语音
    if (options.voice) {
      utterance.voice = options.voice;
    }

    utterance.onstart = () => {
      setSpeaking(true);
    };

    utterance.onend = () => {
      setSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('语音合成错误:', event);
      setError('语音合成过程中发生错误。');
      setSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
    return utterance;
  }, [speaking]);

  const stop = useCallback(() => {
    if (window.speechSynthesis && speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [speaking]);

  const getVoices = useCallback(() => {
    if (!window.speechSynthesis) {
      return [];
    }
    return window.speechSynthesis.getVoices();
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