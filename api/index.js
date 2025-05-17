// API路由处理器
import { analyzeChat } from './analyze-and-chat.js';
import { analyzeEmotion } from './analyze-emotion.js';

// 主处理函数
export default async function handler(req, res) {
  // 处理CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 根据请求路径分发到不同的处理函数
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  try {
    if (pathname.includes('/analyze-and-chat')) {
      return await analyzeChat(req, res);
    } else if (pathname.includes('/analyze-emotion')) {
      return await analyzeEmotion(req, res);
    } else {
      return res.status(404).json({ error: '没有找到请求的API端点' });
    }
  } catch (error) {
    console.error('API处理出错:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
} 