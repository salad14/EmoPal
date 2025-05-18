// Vercel Edge Config (推荐用于提高性能和降低延迟)
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // 可以根据你的主要用户群体选择区域
};

const API_KEY = process.env.OPENWEATHERMAP_API_KEY;

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: '仅支持GET请求' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (!API_KEY) {
    console.error('错误：未配置OpenWeatherMap API Key');
    return new Response(JSON.stringify({ error: '天气服务配置错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const lang = 'zh_cn'; // 固定为中文
  const units = 'metric'; // 固定为摄氏度

  if (!lat || !lon) {
    return new Response(JSON.stringify({ error: '需要提供经纬度参数 (lat, lon)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&lang=${lang}&units=${units}`;

  try {
    const weatherResponse = await fetch(apiUrl);
    if (!weatherResponse.ok) {
      const errorData = await weatherResponse.json();
      console.error('OpenWeatherMap API 错误:', weatherResponse.status, errorData);
      return new Response(JSON.stringify({ error: `获取天气数据失败: ${errorData.message || weatherResponse.statusText}` }), {
        status: weatherResponse.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await weatherResponse.json();
    
    // 提取需要的信息
    const result = {
      description: data.weather[0]?.description || '未知',
      temp: Math.round(data.main?.temp), // 四舍五入温度
      icon: data.weather[0]?.icon, // 天气图标代码
      city: data.name || '', // 城市名
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // 在生产环境中应配置为你的域名
        'Cache-Control': 's-maxage=600, stale-while-revalidate=1200', // Vercel CDN 缓存10分钟
      },
    });
  } catch (error) {
    console.error('Serverless Function 内部错误:', error);
    return new Response(JSON.stringify({ error: '获取天气数据时发生服务器内部错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
} 