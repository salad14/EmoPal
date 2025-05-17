// API路由中间件 - 处理CORS和错误
export default function middleware(request) {
  // 对于OPTIONS预检请求，返回CORS头
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  // 继续处理正常请求
  return;
} 