// Vercel Edge Config (推荐用于提高性能和降低延迟)
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // 可以根据你的主要用户群体选择区域
};

const API_KEY = process.env.WEATHERAPI_KEY;

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: '仅支持GET请求' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (!API_KEY) {
    console.error('错误：未配置WeatherAPI Key');
    return new Response(JSON.stringify({ error: '天气服务配置错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const lang = 'zh_cn'; // 固定为中文

  if (!lat || !lon) {
    return new Response(JSON.stringify({ error: '需要提供经纬度参数 (lat, lon)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // WeatherAPI.com的API端点
  const apiUrl = `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${lat},${lon}&lang=${lang}&aqi=yes`;

  try {
    const weatherResponse = await fetch(apiUrl);
    if (!weatherResponse.ok) {
      const errorData = await weatherResponse.json();
      console.error('WeatherAPI.com 错误:', weatherResponse.status, errorData);
      return new Response(JSON.stringify({ error: `获取天气数据失败: ${errorData.error?.message || weatherResponse.statusText}` }), {
        status: weatherResponse.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await weatherResponse.json();
    
    // 提取需要的信息 (WeatherAPI.com的数据结构不同)
    const result = {
      description: data.current?.condition?.text || '未知',
      temp: Math.round(data.current?.temp_c), // 四舍五入温度
      icon: data.current?.condition?.icon, // 天气图标URL
      city: data.location?.name || '', // 城市名
      region: data.location?.region || '', // 地区
      humidity: data.current?.humidity || 0, // 湿度
      feelslike: Math.round(data.current?.feelslike_c) || 0, // 体感温度
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