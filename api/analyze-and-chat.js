// Serverless function for emotion analysis and DeepSeek API calling
import axios from 'axios';

// 环境变量中获取API密钥
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const EMOTION_API_KEY = process.env.EMOTION_API_KEY; // 情感分析API的密钥

// 情感类型映射
const emotionTypes = {
  happy: '开心',
  sad: '悲伤',
  angry: '愤怒',
  anxious: '焦虑',
  neutral: '平静'
};

/**
 * 分析文本情感
 * @param {string} text 需要分析的文本
 * @returns {Promise<string>} 情感类型
 */
async function analyzeEmotion(text) {
  try {
    // 这里使用情感分析API，下面是示例
    // 实际实现时请替换为您选择的情感分析API调用
    const response = await axios.post('https://api.emotion-analysis.com/analyze', 
      { text },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EMOTION_API_KEY}`
        } 
      }
    );
    
    return response.data.emotion; // 假设API返回情感标签
  } catch (error) {
    console.error('情感分析失败:', error);
    return 'neutral'; // 默认返回中性情感
  }
}

/**
 * 构建DeepSeek提示模板
 * @param {string} userMessage 用户消息
 * @param {string} emotion 检测到的情感
 * @returns {string} 完整的提示
 */
function buildPrompt(userMessage, emotion) {
  const emotionText = emotionTypes[emotion] || '平静';
  
  return `
你是一位名为"心灵伙伴"的AI助手，专注于提供情感支持和陪伴。你应该始终以友好、理解和支持的方式回应用户。

用户似乎感到${emotionText}。请根据这一情绪状态，提供适当的回应，给予安慰、鼓励或陪伴。

用户说: "${userMessage}"

请按照以下格式回复:
1. 首先，简短地承认用户的情绪和处境（1-2句）
2. 然后，根据情况给予安慰、建议或鼓励（2-3句）
3. 如果合适，询问一个后续问题，鼓励用户继续对话

你的回答应该简洁、温暖，不要说教或过于复杂。避免使用过于专业的心理学术语。不需要介绍自己，直接回应用户。
回答不应超过5句话，务必保持简洁明了。
`;
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
 * 主处理函数
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
export default async function handler(req, res) {
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
    const detectedEmotion = await analyzeEmotion(userMessage);
    
    // 构建提示并调用DeepSeek
    const prompt = buildPrompt(userMessage, detectedEmotion);
    const reply = await callDeepSeekAPI(prompt);

    // 返回结果
    return res.status(200).json({
      reply,
      detectedEmotion
    });
  } catch (error) {
    console.error('处理请求时出错:', error);
    return res.status(500).json({ error: error.message || '服务器内部错误' });
  }
} 