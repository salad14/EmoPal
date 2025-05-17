// vercel-build.js - 专用于Vercel部署的构建脚本
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 正在通过自定义脚本构建项目...');

async function build() {
  try {
    // 直接导入vite模块，而不是使用bin目录的脚本
    console.log('正在导入vite模块...');
    const { build } = await import('vite');
    
    // 导入vite配置
    console.log('正在读取vite配置...');
    const { default: config } = await import('./vite.config.js');
    
    console.log('开始执行构建...');
    await build({
      ...config,
      mode: 'production',
      logLevel: 'info'
    });
    
    console.log('✅ 构建完成!');
  } catch (error) {
    console.error('构建过程中发生错误:', error);
    process.exit(1);
  }
}

build(); 