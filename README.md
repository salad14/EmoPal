# EmoPal - 心灵伙伴

EmoPal是一个AI虚拟伙伴应用，能够通过语音和文本与用户进行富有同情心的对话，提供情感支持和陪伴。

## 主要功能

- 基于语音和文本的自然对话
- 情感分析技术识别用户情绪
- 3D虚拟形象实时互动和反馈
- 提供个性化的情感支持和陪伴

## 安装步骤

1. 克隆仓库
```bash
git clone [https://github.com/salad14/EmoPal]
cd EmoPal
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env.local
```
然后编辑 `.env.local` 文件，添加您的API密钥。

## API密钥获取

1. **DeepSeek API**: 访问 [DeepSeek官网](https://deepseek.com/) 注册并获取API密钥。
2. **百度AI API**: 访问 [百度AI开放平台](https://ai.baidu.com/) 注册账号，创建应用并获取API Key和Secret Key。
   - 需要开通"自然语言处理"技术服务下的"情感倾向分析"和"对话情绪识别"两个接口权限。

## 启动项目

```bash
npm run dev
```

然后在浏览器中访问 `http://localhost:5173` 或终端中显示的地址。

## 技术实现

- 前端框架: React + TypeScript
- 语音识别与合成: Web Speech API
- 3D虚拟形象: Three.js
- AI对话: DeepSeek API
- 情感分析: 百度AI自然语言处理（情感倾向分析和对话情绪识别）

## 注意事项

- 本应用需要访问麦克风权限进行语音输入。
- 使用Chrome、Edge等现代浏览器获得最佳体验。
- 应用不存储任何用户数据，所有对话在会话结束后自动清除。
- 这不是专业的心理治疗工具，如果您有严重的情绪困扰，请寻求专业医疗帮助。
