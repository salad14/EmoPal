// Serverless function for emotion analysis only
import axios from 'axios';

// 从环境变量获取API密钥
const EMOTION_API_KEY = process.env.EMOTION_API_KEY;

/**
 * 分析文本情感
 * @param {string} text 需要分析的文本
 * @returns {Promise<string>} 情感类型
 */
async function analyzeEmotion(text) {
  // 如果没有配置API密钥，使用简单规则判断情感
  if (!EMOTION_API_KEY) {
    return simpleEmotionDetection(text);
  }

  try {
    // 替换为实际的情感分析API
    const response = await axios.post('https://api.emotion-analysis.com/analyze', 
      { text },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EMOTION_API_KEY}`
        } 
      }
    );
    
    return response.data.emotion;
  } catch (error) {
    console.error('情感分析API调用失败:', error);
    // 如果API调用失败，回退到简单规则
    return simpleEmotionDetection(text);
  }
}

/**
 * 使用简单规则判断情感（作为API不可用时的备选方案）
 * @param {string} text 
 * @returns {string} 情感类型
 */
function simpleEmotionDetection(text) {
  text = text.toLowerCase();
  
  // 简单的关键词匹配
  const happyKeywords = ['开心', '快乐', '高兴', '好', '棒', '喜欢', '爱', '感谢', '谢谢', '好的', '不错'];
  const sadKeywords = ['难过', '伤心', '悲伤', '痛苦', '失望', '遗憾', '哭', '泪', '不开心'];
  const angryKeywords = ['生气', '愤怒', '烦', '讨厌', '恨', '恼火', '滚', '恶心', '混蛋'];
  const anxiousKeywords = ['担心', '焦虑', '紧张', '害怕', '恐惧', '怕', '不安', '忧虑', '慌'];
  
  // 计算各情感关键词出现次数
  let happyCount = 0, sadCount = 0, angryCount = 0, anxiousCount = 0;
  
  happyKeywords.forEach(keyword => {
    if (text.includes(keyword)) happyCount++;
  });
  
  sadKeywords.forEach(keyword => {
    if (text.includes(keyword)) sadCount++;
  });
  
  angryKeywords.forEach(keyword => {
    if (text.includes(keyword)) angryCount++;
  });
  
  anxiousKeywords.forEach(keyword => {
    if (text.includes(keyword)) anxiousCount++;
  });
  
  // 确定主要情感
  const maxCount = Math.max(happyCount, sadCount, angryCount, anxiousCount);
  
  if (maxCount === 0) return 'neutral';
  if (maxCount === happyCount) return 'happy';
  if (maxCount === sadCount) return 'sad';
  if (maxCount === angryCount) return 'angry';
  if (maxCount === anxiousCount) return 'anxious';
  
  return 'neutral';
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
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '文本不能为空' });
    }

    // 分析情感
    const emotion = await analyzeEmotion(text);
    
    // 返回结果
    return res.status(200).json({ emotion });
  } catch (error) {
    console.error('处理请求时出错:', error);
    return res.status(500).json({ error: error.message || '服务器内部错误' });
  }
} 