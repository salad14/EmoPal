import axios from 'axios';

// 定义情感类型，匹配百度AI的情感分析结果
// 情感倾向：negative(消极)、neutral(中性)、positive(积极)
// 情绪细分：angry(愤怒)、disgusting(厌恶)、fearful(恐惧)、sad(悲伤)、happy(愉快)、like(喜爱)、thankful(感谢)
export type EmotionType = 'positive' | 'negative' | 'neutral';
export type EmotionDetailType = 'angry' | 'disgusting' | 'fearful' | 'sad' | 'happy' | 'like' | 'thankful' | 'neutral';

// API响应接口
export interface ApiResponse {
  reply: string;
  detectedEmotion?: EmotionType;
  detectedEmotionDetail?: EmotionDetailType;
  suggestedReplies?: string[];
  confidence?: number;
  error?: string;
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
    console.log('调用API: /analyze-and-chat');
    const response = await api.post('/analyze-and-chat', { userMessage });
    console.log('API响应状态:', response.status);
    
    // 检查是否有错误信息
    if (response.data.error) {
      console.warn('API返回错误信息:', response.data.error);
    }
    
    return response.data;
  } catch (error) {
    console.error('API调用失败:', error);
    
    // 从错误响应中提取详细信息
    let errorMessage = '与AI助手通信时发生错误，请稍后再试。';
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // 返回带有错误信息的响应
    return {
      reply: '抱歉，我暂时无法回应，请稍后再试。',
      detectedEmotion: 'neutral',
      error: errorMessage
    };
  }
};

/**
 * 仅分析用户情绪
 * @param text 需要分析的文本
 * @returns 检测到的情绪类型和详细信息
 */
export const analyzeEmotion = async (text: string): Promise<{
  emotion: EmotionType;
  emotionDetail?: EmotionDetailType;
  confidence?: number;
  suggestedReplies?: string[];
}> => {
  try {
    const response = await api.post('/analyze-emotion', { text });
    return response.data;
  } catch (error) {
    console.error('情感分析API调用失败:', error);
    return { emotion: 'neutral' }; // 默认返回中性情绪
  }
};

export default {
  analyzeAndChat,
  analyzeEmotion
}; 