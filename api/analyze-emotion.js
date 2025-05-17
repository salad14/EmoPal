// 添加Vercel Edge配置
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // 美国东部区域，可以根据需要修改
};

// Serverless function for emotion analysis using Baidu AI
import axios from 'axios';

// 从环境变量获取API密钥
const BAIDU_API_KEY = process.env.BAIDU_API_KEY;
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY;

// 百度AI情感分析相关常量
const SENTIMENT_URL = 'https://aip.baidubce.com/rpc/2.0/nlp/v1/sentiment_classify';
const EMOTION_URL = 'https://aip.baidubce.com/rpc/2.0/nlp/v1/emotion';

// 用于存储访问令牌及其过期时间
let accessToken = null;
let tokenExpiry = 0;

/**
 * 获取百度AI接口的访问令牌
 * @returns {Promise<string>} 访问令牌
 */
async function getAccessToken() {
  // 如果令牌未过期，直接返回
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await axios.get(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`
    );

    // 令牌有效期通常为30天，这里提前1天过期以确保安全
    const expiresIn = response.data.expires_in - 86400;
    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + expiresIn * 1000;

    return accessToken;
  } catch (error) {
    console.error('获取百度AI访问令牌失败:', error);
    throw new Error('无法获取百度AI访问令牌');
  }
}

/**
 * 调用百度AI情感倾向分析接口
 * @param {string} text 需要分析的文本
 * @returns {Promise<Object>} 情感分析结果
 */
async function analyzeSentiment(text) {
  try {
    const token = await getAccessToken();
    const response = await axios.post(
      `${SENTIMENT_URL}?charset=UTF-8&access_token=${token}`,
      { text },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('百度情感倾向分析API调用失败:', error);
    throw new Error('情感分析服务暂时不可用');
  }
}

/**
 * 调用百度AI对话情绪识别接口
 * @param {string} text 需要分析的文本
 * @returns {Promise<Object>} 情绪识别结果
 */
async function analyzeEmotion(text) {
  try {
    const token = await getAccessToken();
    const response = await axios.post(
      `${EMOTION_URL}?charset=UTF-8&access_token=${token}`,
      {
        text,
        scene: 'talk' // 使用闲聊对话场景
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('百度对话情绪识别API调用失败:', error);
    throw new Error('情绪识别服务暂时不可用');
  }
}

/**
 * 简单情感分析备用方案（当API不可用时）
 * @param {string} text 需要分析的文本
 * @returns {Object} 情感分析结果
 */
function simpleEmotionDetection(text) {
  text = text.toLowerCase();
  
  // 简单的关键词匹配
  const positiveKeywords = ['开心', '快乐', '高兴', '好', '棒', '喜欢', '爱', '感谢', '谢谢', '好的', '不错'];
  const negativeKeywords = [
    '难过', '伤心', '悲伤', '痛苦', '失望', '遗憾', '哭', '泪', '不开心',
    '生气', '愤怒', '烦', '讨厌', '恨', '恼火', '滚', '恶心', '混蛋',
    '担心', '焦虑', '紧张', '害怕', '恐惧', '怕', '不安', '忧虑', '慌'
  ];
  
  // 计算积极和消极关键词出现次数
  let positiveCount = 0, negativeCount = 0;
  
  positiveKeywords.forEach(keyword => {
    if (text.includes(keyword)) positiveCount++;
  });
  
  negativeKeywords.forEach(keyword => {
    if (text.includes(keyword)) negativeCount++;
  });
  
  // 确定主要情感
  if (positiveCount > negativeCount) {
    return {
      emotion: 'positive',
      emotionDetail: 'happy',
      confidence: 0.8
    };
  } else if (negativeCount > positiveCount) {
    return {
      emotion: 'negative',
      emotionDetail: 'sad', // 默认为悲伤，实际上可能是多种负面情绪
      confidence: 0.8
    };
  }
  
  return {
    emotion: 'neutral',
    emotionDetail: 'neutral',
    confidence: 0.8
  };
}

/**
 * 将百度AI的情感分析结果转换为应用所需格式
 * @param {Object} sentimentResult 情感倾向分析结果
 * @param {Object} emotionResult 对话情绪识别结果
 * @returns {Object} 统一格式的情感分析结果
 */
function formatEmotionResult(sentimentResult, emotionResult) {
  // 默认结果，以防API返回异常
  const defaultResult = {
    emotion: 'neutral',
    emotionDetail: 'neutral',
    confidence: 0.5
  };
  
  try {
    console.log('格式化情感分析结果...');
    
    // 检查API返回是否包含错误
    if (sentimentResult.error_code) {
      console.error('百度情感倾向分析API返回错误:', 
                   sentimentResult.error_code, sentimentResult.error_msg);
      throw new Error(`百度情感API错误: ${sentimentResult.error_msg}`);
    }
    
    if (emotionResult.error_code) {
      console.error('百度对话情绪识别API返回错误:', 
                   emotionResult.error_code, emotionResult.error_msg);
      throw new Error(`百度情绪API错误: ${emotionResult.error_msg}`);
    }
    
    // 从情感倾向分析获取基本情感
    let emotion;
    let confidence = 0;
    
    if (sentimentResult?.items && sentimentResult.items.length > 0) {
      const sentiment = sentimentResult.items[0].sentiment;
      confidence = sentimentResult.items[0].confidence;
      
      console.log('情感倾向分析结果:', sentiment, '置信度:', confidence);
      
      // 百度情感分类：0-负向，1-中性，2-正向
      switch (sentiment) {
        case 0:
          emotion = 'negative';
          break;
        case 1:
          emotion = 'neutral';
          break;
        case 2:
          emotion = 'positive';
          break;
        default:
          emotion = 'neutral';
      }
    } else {
      console.warn('情感倾向分析结果为空或格式不正确');
      emotion = 'neutral';
    }
    
    // 从对话情绪识别获取详细情绪和建议回复
    let emotionDetail = 'neutral';
    let suggestedReplies = [];
    
    if (emotionResult?.items && emotionResult.items.length > 0) {
      const item = emotionResult.items[0];
      
      // 获取情绪二级分类标签
      if (item.subitems && item.subitems.length > 0) {
        // 取最高概率的二级情绪
        const subitem = item.subitems.reduce((prev, current) => 
          (prev.prob > current.prob) ? prev : current
        );
        
        emotionDetail = subitem.label;
        console.log('情绪细分类型:', emotionDetail, '概率:', subitem.prob);
        
        // 获取参考回复
        if (subitem.replies && subitem.replies.length > 0) {
          suggestedReplies = subitem.replies;
          console.log('建议回复数量:', suggestedReplies.length);
        }
      } else {
        console.warn('情绪二级分类结果为空');
      }
    } else {
      console.warn('对话情绪识别结果为空或格式不正确');
    }
    
    const result = {
      emotion,
      emotionDetail,
      confidence,
      suggestedReplies
    };
    
    console.log('最终情感分析结果:', result);
    return result;
  } catch (error) {
    console.error('格式化情感分析结果时出错:', error);
    return defaultResult;
  }
}

/**
 * 主处理函数 - 已适配Edge Runtime
 */
export default async function handler(request) {
  // 仅接受POST请求
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: '仅支持POST请求' }), 
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // 解析请求体
    const requestData = await request.json();
    const { text } = requestData;
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: '文本不能为空' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 检查是否配置了百度API密钥
    if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
      console.error('未配置百度API密钥，无法进行情感分析');
      return new Response(
        JSON.stringify({ 
          error: '未配置百度API密钥，请联系管理员配置百度AI API密钥',
          missingKeys: true 
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      );
    }

    try {
      // 并行调用两个API以提高性能
      console.log('开始调用百度AI API分析情感...');
      const [sentimentResult, emotionResult] = await Promise.all([
        analyzeSentiment(text),
        analyzeEmotion(text)
      ]);
      
      console.log('百度情感分析结果:', JSON.stringify(sentimentResult));
      console.log('百度情绪识别结果:', JSON.stringify(emotionResult));
      
      // 格式化并合并两个API的结果
      const result = formatEmotionResult(sentimentResult, emotionResult);
      console.log('最终情感分析结果:', JSON.stringify(result));
      
      // 返回结果
      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      );
    } catch (apiError) {
      console.error('百度API调用失败:', apiError);
      return new Response(
        JSON.stringify({ 
          error: '百度情感分析API调用失败，请稍后再试',
          apiError: apiError.message 
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      );
    }
  } catch (error) {
    console.error('处理请求时出错:', error);
    return new Response(
      JSON.stringify({ error: error.message || '服务器内部错误' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 