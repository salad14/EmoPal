# 3D模型目录

请将您的3D模型文件（.gltf和.bin文件）放置在此目录中。

推荐的文件结构:
```
models/
  ├── character.gltf    # 主模型文件
  ├── character.bin     # 二进制数据文件
  └── textures/         # 纹理目录（如有需要）
      ├── diffuse.png
      └── normal.png
```

注意：
1. 确保模型文件命名为`character.gltf`，或修改`VirtualAgent.tsx`组件中的文件路径
2. 如果您的模型有多个部分，请确保所有相关文件都放在此目录中
3. 模型文件应该位于public目录，这样可以通过URL直接访问 