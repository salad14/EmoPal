// API路由中间件 - 处理CORS和错误
export default function middleware(req, res) {
  // 设置CORS头，允许从任何域访问API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  
  // 继续处理正常请求
  return;
} 