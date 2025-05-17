import { useState, useEffect, useCallback } from 'react';

// 声明Web Speech API类型
/* 
interface Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}
*/

interface WebSpeechRecognitionHook {
  listening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  isSpeechRecognitionSupported: boolean;
}

// 获取SpeechRecognition构造函数
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognition: any = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false; // true 会持续识别，false 识别一句后停止
  recognition.lang = 'zh-CN';     // 设置语言为中文
  recognition.interimResults = false; // true 会返回中间结果，false 只返回最终结果
  recognition.maxAlternatives = 1;
} else {
  console.warn("浏览器不支持 Web Speech API");
}

const useWebSpeechRecognition = (): WebSpeechRecognitionHook => {
  const [listening, setListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const startListening = useCallback(() => {
    if (!recognition) {
      setError("浏览器不支持语音识别功能。");
      return;
    }
    if (listening) return;

    setTranscript('');
    setError(null);
    setListening(true);
    try {
      recognition.start();
    } catch (err) {
      console.error("语音识别启动失败:", err);
      setError("语音识别启动失败，请检查麦克风权限。");
      setListening(false);
    }
  }, [listening]);

  const stopListening = useCallback(() => {
    if (!recognition || !listening) return;
    recognition.stop();
    setListening(false);
  }, [listening]);

  useEffect(() => {
    if (!recognition) return;

    const handleResult = (event: any) => {
      const currentTranscript = event.results[0][0].transcript;
      setTranscript(currentTranscript);
      setListening(false); // 识别到结果后自动停止聆听
    };

    const handleError = (event: any) => {
      console.error('语音识别错误:', event.error);
      let errorMessage = '语音识别发生错误。';
      if (event.error === 'no-speech') {
        errorMessage = '没有检测到语音，请重试。';
      } else if (event.error === 'audio-capture') {
        errorMessage = '无法捕获麦克风音频，请检查权限。';
      } else if (event.error === 'not-allowed') {
        errorMessage = '麦克风使用权限被拒绝。';
      }
      setError(errorMessage);
      setListening(false);
    };

    const handleEnd = () => {
      // 确保在结束后 listening 状态为 false
      if (listening) {
         setListening(false);
      }
    };

    recognition.addEventListener('result', handleResult);
    recognition.addEventListener('error', handleError);
    recognition.addEventListener('end', handleEnd); // 处理正常结束或意外中断

    return () => { // 清理函数，在组件卸载时移除事件监听
      recognition.removeEventListener('result', handleResult);
      recognition.removeEventListener('error', handleError);
      recognition.removeEventListener('end', handleEnd);
      if (listening) { // 如果组件卸载时仍在监听，则停止
        recognition.stop();
      }
    };
  }, [listening]); // 依赖 listening 状态，确保只在必要时执行

  return {
    listening,
    transcript,
    error,
    startListening,
    stopListening,
    isSpeechRecognitionSupported: !!recognition
  };
};

export default useWebSpeechRecognition; 