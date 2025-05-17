import axios from 'axios';

// 定义情感类型
export type EmotionType = 'happy' | 'sad' | 'angry' | 'anxious' | 'neutral';

// API响应接口
export interface ApiResponse {
  reply: string;
  detectedEmotion?: EmotionType;
}

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 分析用户情绪并生成AI回复
 * @param userMessage 用户输入的消息
 * @returns AI回复和检测到的情绪
 */
export const analyzeAndChat = async (userMessage: string): Promise<ApiResponse> => {
  try {
    const response = await api.post('/analyze-and-chat', { userMessage });
    return response.data;
  } catch (error) {
    console.error('API调用失败:', error);
    throw new Error('与AI助手通信时发生错误，请稍后再试。');
  }
};

/**
 * 仅分析用户情绪
 * @param text 需要分析的文本
 * @returns 检测到的情绪类型
 */
export const analyzeEmotion = async (text: string): Promise<EmotionType> => {
  try {
    const response = await api.post('/analyze-emotion', { text });
    return response.data.emotion;
  } catch (error) {
    console.error('情感分析API调用失败:', error);
    return 'neutral'; // 默认返回中性情绪
  }
};

export default {
  analyzeAndChat,
  analyzeEmotion
}; 