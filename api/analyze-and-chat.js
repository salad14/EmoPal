// 添加Vercel Edge配置
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // 美国东部区域，可以根据需要修改
};

// Serverless function for emotion analysis and DeepSeek API calling
import axios from 'axios';

// 环境变量中获取API密钥
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// 情感类型映射表，用于从英文映射到中文
const emotionTypeMap = {
  positive: '积极',
  negative: '消极',
  neutral: '平静'
};

// 情绪细分类型映射表
const emotionDetailMap = {
  happy: '愉快',
  like: '喜爱',
  thankful: '感谢',
  angry: '愤怒',
  disgusting: '厌恶',
  fearful: '恐惧',
  sad: '悲伤',
  neutral: '平静'
};

/**
 * 分析文本情感
 * @param {string} text 需要分析的文本
 * @param {Request} originalRequest 原始请求对象，用于获取URL信息
 * @returns {Promise<Object>} 情感分析结果
 */
async function analyzeEmotion(text, originalRequest) {
  try {
    console.log('调用情感分析API...');
    
    // 直接修改为同一Edge Function内部调用方式
    // 在Edge Function内部，我们可以直接导入和调用另一个API处理函数
    
    // 创建一个模拟请求来直接调用analyze-emotion API
    const mockRequest = new Request('https://example.com/api/analyze-emotion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    
    // 导入analyze-emotion处理函数
    const { default: analyzeEmotionHandler } = await import('./analyze-emotion.js');
    
    // 直接调用处理函数
    console.log('直接调用analyze-emotion处理函数...');
    const response = await analyzeEmotionHandler(mockRequest);
    
    if (!response.ok) {
      console.error('情感分析API返回错误状态码:', response.status);
      throw new Error(`情感分析API返回错误状态码: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 检查是否有错误响应
    if (data.error) {
      console.error('情感分析API返回错误:', data.error);
      throw new Error(data.error || '情感分析服务暂时不可用');
    }
    
    console.log('情感分析成功:', data);
    return data;
  } catch (error) {
    console.error('情感分析失败:', error);
    throw new Error('情感分析服务暂时不可用: ' + error.message);
  }
}

/**
 * 构建DeepSeek提示模板
 * @param {string} userMessage 用户消息
 * @param {Object} emotionResult 情感分析结果
 * @returns {string} 完整的提示
 */
function buildPrompt(userMessage, emotionResult) {
  const {
    emotion = 'neutral',
    emotionDetail = 'neutral',
    confidence = 0.5,
    suggestedReplies = []
  } = emotionResult;
  
  // 获取中文情感描述
  const emotionText = emotionTypeMap[emotion] || '平静';
  const emotionDetailText = emotionDetailMap[emotionDetail] || '平静';
  
  // 构建提示，包含情感分析结果和可能的回复建议
  let prompt = `
你是一位名为"心灵伙伴"的AI助手，专注于提供情感支持和陪伴。你应该始终以友好、理解和支持的方式回应用户。

根据情感分析，用户目前的情绪状态为：
- 主要情感倾向：${emotionText}（置信度：${(confidence * 100).toFixed(0)}%）
- 具体情绪类型：${emotionDetailText}

用户消息："${userMessage}"
`;

  // 如果有建议回复，添加到提示中
  if (suggestedReplies && suggestedReplies.length > 0) {
    prompt += `
以下是针对这种情绪的一些可能回复参考（你可以借鉴但不必完全采用）：
${suggestedReplies.map(reply => `- "${reply}"`).join('\n')}
`;
  }

  // 添加回复指导
  prompt += `
请根据用户的情绪状态，提供一个适合的回应。你的回答应该：
1. 首先，简短地承认和理解用户的情绪（1-2句）
2. 然后，根据情况给予适当的支持、安慰、建议或鼓励（2-3句）
3. 如果合适，询问一个后续问题，鼓励用户继续对话

你的回答应该简洁、温暖，不要说教或过于复杂。避免使用过于专业的心理学术语。
总共不超过5句话，务必保持亲和力和同理心。
`;

  return prompt;
}

/**
 * 调用DeepSeek API
 * @param {string} prompt 完整的提示
 * @returns {Promise<string>} AI回复
 */
async function callDeepSeekAPI(prompt) {
  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', 
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "你是一位名为'心灵伙伴'的AI助手，专注于提供情感支持和陪伴。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API调用失败:', error);
    throw new Error('AI助手暂时无法回应，请稍后再试。');
  }
}

/**
 * 主处理函数 - 修改为适配Edge Runtime
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
    const { userMessage } = requestData;
    
    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: '消息不能为空' }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    try {
      // 分析情感
      console.log('开始分析用户消息情感:', userMessage);
      const emotionResult = await analyzeEmotion(userMessage, request);
      
      console.log('情感分析结果:', emotionResult);
      
      // 构建提示并调用DeepSeek
      const prompt = buildPrompt(userMessage, emotionResult);
      const reply = await callDeepSeekAPI(prompt);

      // 返回结果，包含情感分析和AI回复
      return new Response(
        JSON.stringify({
          reply,
          detectedEmotion: emotionResult.emotion,
          detectedEmotionDetail: emotionResult.emotionDetail,
          confidence: emotionResult.confidence,
          suggestedReplies: emotionResult.suggestedReplies
        }),
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
    } catch (emotionError) {
      console.error('情感分析出错:', emotionError);
      
      // 即使情感分析失败，也尝试生成回复
      const defaultEmotionResult = {
        emotion: 'neutral',
        emotionDetail: 'neutral',
        confidence: 0.5
      };
      
      // 添加错误信息到提示中
      const errorPrompt = `
你是一位名为"心灵伙伴"的AI助手，专注于提供情感支持和陪伴。你应该始终以友好、理解和支持的方式回应用户。

注意：情感分析系统暂时不可用，无法确定用户的情绪状态。

用户消息："${userMessage}"

请根据用户的消息内容，提供一个适合的回应。你的回答应该：
1. 简短地回应用户的消息内容
2. 根据情况给予适当的支持、建议或鼓励
3. 如果合适，询问一个后续问题，鼓励用户继续对话

你的回答应该简洁、温暖，不要说教或过于复杂。避免使用过于专业的心理学术语。
总共不超过5句话，务必保持亲和力和同理心。
`;
      
      try {
        const reply = await callDeepSeekAPI(errorPrompt);
        
        return new Response(
          JSON.stringify({
            reply,
            detectedEmotion: defaultEmotionResult.emotion,
            detectedEmotionDetail: defaultEmotionResult.emotionDetail,
            confidence: defaultEmotionResult.confidence,
            error: '情感分析服务暂时不可用，使用默认情感设置'
          }),
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
      } catch (deepseekError) {
        throw new Error('AI助手和情感分析服务均暂时不可用');
      }
    }
  } catch (error) {
    console.error('处理请求时出错:', error);
    return new Response(
      JSON.stringify({ error: error.message || '服务器内部错误' }),
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
} 