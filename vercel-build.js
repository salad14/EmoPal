// vercel-build.js - 专用于Vercel部署的构建脚本
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 调用Vite执行构建
console.log('🚀 正在通过自定义脚本构建项目...');

// 检查node_modules/.bin目录中的可执行文件权限
const binDir = join(__dirname, 'node_modules', '.bin');
if (fs.existsSync(binDir)) {
  try {
    // 递归遍历目录下所有文件并修改权限
    const files = fs.readdirSync(binDir);
    for (const file of files) {
      const filePath = join(binDir, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        // 为所有bin目录下的文件添加执行权限 (755 = rwxr-xr-x)
        fs.chmodSync(filePath, 0o755);
        console.log(`已添加执行权限: ${filePath}`);
      }
    }
    console.log('所有bin目录下的文件权限已更新');
  } catch (error) {
    console.error('修改权限时出错:', error);
  }
}

// 使用子进程执行vite构建
const viteBin = join(__dirname, 'node_modules', '.bin', 'vite');
const buildProcess = spawn('node', [viteBin, 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`构建失败，退出码: ${code}`);
    process.exit(code);
  }
  console.log('✅ 构建完成!');
}); 