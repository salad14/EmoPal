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
 * @returns {Promise<Object>} 情感分析结果
 */
async function analyzeEmotionInternal(text) {
  try {
    // 调用内部情感分析API
    const response = await axios.post('/api/analyze-emotion', { text });
    return response.data;
  } catch (error) {
    console.error('情感分析失败:', error);
    // 默认返回中性情绪
    return {
      emotion: 'neutral',
      emotionDetail: 'neutral',
      confidence: 0.5
    };
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
 * 分析和聊天处理函数
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
export async function analyzeChat(req, res) {
  // 仅接受POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持POST请求' });
  }

  try {
    const { userMessage } = req.body;
    
    if (!userMessage) {
      return res.status(400).json({ error: '消息不能为空' });
    }

    // 分析情感
    const emotionResult = await analyzeEmotionInternal(userMessage);
    
    console.log('情感分析结果:', emotionResult);
    
    // 构建提示并调用DeepSeek
    const prompt = buildPrompt(userMessage, emotionResult);
    const reply = await callDeepSeekAPI(prompt);

    // 返回结果，包含情感分析和AI回复
    return res.status(200).json({
      reply,
      detectedEmotion: emotionResult.emotion,
      detectedEmotionDetail: emotionResult.emotionDetail,
      confidence: emotionResult.confidence,
      suggestedReplies: emotionResult.suggestedReplies
    });
  } catch (error) {
    console.error('处理请求时出错:', error);
    return res.status(500).json({ error: error.message || '服务器内部错误' });
  }
}

// 为了向后兼容，保留默认导出
export default analyzeChat; 