import React, { useEffect, useRef, useState } from 'react';
import './VirtualAgent.css';

// Three.js导入
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// 背景图片路径
const BACKGROUND_IMAGE_PATH = '/images/virtual_background.jpg'; // 背景图片路径，请确保此路径存在

// 创建渐变背景纹理的函数
function createGradientTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  
  const context = canvas.getContext('2d');
  if (context) {
    // 创建渐变
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#6e8efb'); // 顶部颜色
    gradient.addColorStop(1, '#a777e3'); // 底部颜色
    
    // 应用渐变
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface LoadProgress {
  loaded: number;
  total: number;
  [key: string]: any;
}

interface VirtualAgentProps {
  isSpeaking: boolean;
  targetVisemeKey: string;
}

// 定义Viseme形状
const visemesMap: {
  [key: string]: { jaw: number; lipsVertical?: number; lipsHorizontal?: number };
} = {
  neutral: { jaw: 0, lipsVertical: 0, lipsHorizontal: 0 },
  A: { jaw: 0.25, lipsVertical: 0.15, lipsHorizontal: 0.05 }, // 啊 (嘴张大)
  E: { jaw: 0.1, lipsVertical: 0.05, lipsHorizontal: 0.2 },  // 衣/诶 (嘴咧开)
  O: { jaw: 0.15, lipsVertical: 0.2, lipsHorizontal: -0.1 }, // 哦/乌 (嘴拢圆)
  MBP: { jaw: 0.01, lipsVertical: -0.05, lipsHorizontal: -0.05 }, // 姆/不/泼 (闭唇)
};

const VirtualAgent: React.FC<VirtualAgentProps> = ({ isSpeaking, targetVisemeKey }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const animationFrameIdRef = useRef<number>(0);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const idleActionRef = useRef<THREE.AnimationAction | null>(null);
  
  const jawBoneRef = useRef<THREE.Bone | null>(null);
  const initialBoneStatesRef = useRef<Map<THREE.Bone, { rotation: THREE.Euler, position: THREE.Vector3 }>>(new Map());
  
  // 添加三个口型骨骼的引用
  const mouthBone1Ref = useRef<THREE.Bone | null>(null);
  const mouthBone2Ref = useRef<THREE.Bone | null>(null);
  const mouthBone3Ref = useRef<THREE.Bone | null>(null);
  
  // 添加用于交互的骨骼引用
  const rootJointRef = useRef<THREE.Bone | null>(null);
  const bone01Ref = useRef<THREE.Bone | null>(null);
  const bone02Ref = useRef<THREE.Bone | null>(null);
  const bone03Ref = useRef<THREE.Bone | null>(null);
  
  // 为交互动画添加状态
  const isPlayingInteractionAnimRef = useRef<boolean>(false);
  const interactionTimeRef = useRef<number>(0);
  const raycastRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  
  // Refs to hold the latest prop values for the animation loop
  const isSpeakingRef = useRef(isSpeaking);
  const currentVisemeTargetRef = useRef(visemesMap[targetVisemeKey] || visemesMap.neutral);
  
  const isMounted = useRef(false);
  
  // Update refs when props change
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
    console.log("VirtualAgent: isSpeaking updated to", isSpeaking);
  }, [isSpeaking]);

  useEffect(() => {
    currentVisemeTargetRef.current = visemesMap[targetVisemeKey] || visemesMap.neutral;
    console.log("VirtualAgent: targetVisemeKey updated to", targetVisemeKey);
  }, [targetVisemeKey]);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      console.log("Container ref not available yet.");
      return;
    }
    
    if (rendererRef.current) {
        console.log("Three.js scene already initialized, skipping setup.");
        return;
    }

    console.log("VirtualAgent: Initializing Three.js scene...");

    const currentContainer = containerRef.current;

        const scene = new THREE.Scene();
    // 加载背景图片
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      BACKGROUND_IMAGE_PATH,
      (texture) => {
        if (!isMounted.current || !sceneRef.current) return;
        console.log("VirtualAgent: Background image loaded successfully.");
        // 设置纹理属性
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
      },
      undefined,
      (error) => {
        console.warn("VirtualAgent: Failed to load background image:", error);
        // 加载失败则使用渐变背景
        console.log("VirtualAgent: Using gradient background instead.");
        scene.background = createGradientTexture();
      }
    );
    
    // 保留雾效但默认不启用，以免影响背景图片
    // scene.fog = new THREE.FogExp2(0xf0f2f5, 0.035);
        sceneRef.current = scene;
        
    const camera = new THREE.PerspectiveCamera(45, currentContainer.clientWidth / currentContainer.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.0, 7);
        cameraRef.current = camera;
        
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(currentContainer.clientWidth, currentContainer.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
    renderer.setClearColor(0xf0f2f5, 1);
        rendererRef.current = renderer;
    currentContainer.appendChild(renderer.domElement);
    console.log("VirtualAgent: Renderer created and appended.");
        
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(3, 6, 4);
        directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
        scene.add(directionalLight);
        
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        
        // 限制只能横向转动，不能纵向转动
        // 设置极角限制（垂直旋转）- 将最小和最大值设置为接近相同的值可以锁定垂直旋转
        // Math.PI/2 是90度，相机保持在水平视角
        const fixedPolarAngle = Math.PI * 0.5; // 90度，水平视角
        controls.minPolarAngle = fixedPolarAngle - 0.01; // 允许极小的上下偏移
        controls.maxPolarAngle = fixedPolarAngle + 0.01; // 允许极小的上下偏移
        
        // 可选：限制水平旋转范围，比如只允许前方180度视角
        // controls.minAzimuthAngle = -Math.PI * 0.5; // -90度
        // controls.maxAzimuthAngle = Math.PI * 0.5;  // +90度
        
        controls.enablePan = false; // 禁止平移
        controls.minDistance = 1.5;  // 最小缩放距离
        controls.maxDistance = 12;   // 最大缩放距离
        controls.target.set(0, 1.2, 0);
        controls.update();
        controlsRef.current = controls;
        
    const clock = new THREE.Clock();
    clockRef.current = clock;

    const loadModel = () => {
      if (!isMounted.current) return;
      setIsLoading(true);
      const modelPath = '/models/scene.gltf';
      console.log(`VirtualAgent: Loading model from ${modelPath}...`);
      const loader = new GLTFLoader();
      loader.load(
        modelPath,
        (gltf) => {
          if (!isMounted.current || !sceneRef.current || !cameraRef.current || !controlsRef.current) {
            console.warn("VirtualAgent: Component unmounted or scene cleared before model could be processed.");
            if (isMounted.current) setIsLoading(false);
            return;
          }
          console.log("VirtualAgent: GLTF model loaded successfully.", gltf);
          
          const model = gltf.scene;
          modelRef.current = model;

          // 初始化 AnimationMixer
          if (gltf.animations && gltf.animations.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(model);
            const idleAnimationName = "unnamed.001|sb_idle_tough.anm"; // 从 GLTF 文件中获取的动画名称
            const idleClip = THREE.AnimationClip.findByName(gltf.animations, idleAnimationName);
            
            if (idleClip) {
              idleActionRef.current = mixerRef.current.clipAction(idleClip);
              idleActionRef.current.setLoop(THREE.LoopRepeat, Infinity);
              // 初始状态不说话，播放idle动画
              if (!isSpeakingRef.current) {
                idleActionRef.current.play();
                console.log(`VirtualAgent: Playing idle animation: ${idleAnimationName}`);
              } else {
                // 如果初始状态是说话，idle动画先不播放或权重为0，等待animate函数处理
                idleActionRef.current.weight = 0;
                idleActionRef.current.play(); // 仍然需要play来激活，但权重为0
                 console.log(`VirtualAgent: Idle animation (${idleAnimationName}) prepared but not playing (isSpeaking is true).`);
              }
            } else {
              console.warn(`VirtualAgent: Idle animation '${idleAnimationName}' not found in model.`);
            }
          } else {
            console.warn("VirtualAgent: Model has no animations.");
          }

          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          console.log("VirtualAgent: Model original size:", size, "center:", center);

          const desiredHeight = 1.8;
          const scale = desiredHeight / size.y;
          model.scale.set(scale, scale, scale);

          box.setFromObject(model);
          box.getCenter(center);

          model.position.x = -center.x;
          model.position.y = -box.min.y;
          const modelYOffset = desiredHeight * 10.0; // 使用较大的偏移值，相当于模型高度的80%
          model.position.y += modelYOffset;
          console.log("!!! MODEL Y POSITION MODIFIED HERE !!! New Y:", model.position.y);
          model.position.z = -center.z;
          console.log("VirtualAgent: Model position after centering:", model.position);

          // 因为模型位置变了，重新计算其在世界坐标中的中心
          const boxAfterYOffset = new THREE.Box3().setFromObject(model);
          const centerAfterYOffset = boxAfterYOffset.getCenter(new THREE.Vector3());
          console.log("VirtualAgent: Model center AFTER Y offset:", centerAfterYOffset);

          // Log all bone names for debugging
          let bonesFound = false;
          model.traverse((object) => {
            if (object instanceof THREE.Bone) {
              bonesFound = true;
              console.log("Bone found:", object.name);
            }
          });
          
          if (!bonesFound) {
            console.warn("VirtualAgent: No bones found in model. Mouth animation will not work.");
          }

          model.traverse((object) => {
            if (object instanceof THREE.Bone) {
              const bone = object as THREE.Bone;
              initialBoneStatesRef.current.set(bone, {
                rotation: bone.rotation.clone(),
                position: bone.position.clone(),
              });
              
              // 查找指定的说话骨骼
              if (bone.name === 'unnamed003_04') {
                mouthBone1Ref.current = bone;
              } else if (bone.name === 'unnamed004_05') {
                mouthBone2Ref.current = bone;
              } else if (bone.name === 'unnamed004_end_045') {
                mouthBone3Ref.current = bone;
              }
              
              // 查找交互骨骼
              if (bone.name === '_rootJoint') {
                rootJointRef.current = bone;
                console.log("VirtualAgent: 找到交互骨骼 _rootJoint");
              } else if (bone.name === 'unnamed_01') {
                bone01Ref.current = bone;
                console.log("VirtualAgent: 找到交互骨骼 unnamed_01");
              } else if (bone.name === 'unnamed001_02') {
                bone02Ref.current = bone;
                console.log("VirtualAgent: 找到交互骨骼 unnamed001_02");
              } else if (bone.name === 'unnamed002_03') {
                bone03Ref.current = bone;
                console.log("VirtualAgent: 找到交互骨骼 unnamed002_03");
              }
            }
            if (object instanceof THREE.Mesh) {
              object.castShadow = true;
              object.receiveShadow = true;
            }
          });
          
          if (!jawBoneRef.current) {
            console.warn("VirtualAgent: Jaw bone not found. Mouth animation will not work.");
          }
          
          sceneRef.current.add(model);
          console.log("VirtualAgent: Model added to scene.");

          // 使用模型调整位置后的中心来更新控制器目标和相机
          controlsRef.current.target.copy(centerAfterYOffset);
          console.log("VirtualAgent: Controls target updated to:", controlsRef.current.target);

          // 更新相机位置，保持适当的距离和视角
          cameraRef.current.position.set(
            centerAfterYOffset.x,
            centerAfterYOffset.y - desiredHeight * 1.5, // 略微在模型中心上方，产生俯视感
            centerAfterYOffset.z // 保持Z轴距离
          );
          cameraRef.current.lookAt(centerAfterYOffset);
          controlsRef.current.update();
          console.log("VirtualAgent: Camera position updated to:", cameraRef.current.position);
          console.log("VirtualAgent: Camera looking at:", centerAfterYOffset);
          
          if (isMounted.current) setIsLoading(false);
        },
        (progress) => {
          if (!isMounted.current) return;
          const percent = Math.floor((progress.loaded / progress.total) * 100);
          console.log(`VirtualAgent: Loading progress: ${percent}%`);
        },
        (errorEvent) => {
          console.error("VirtualAgent: Error loading GLTF model:", errorEvent.message || errorEvent);
          if (isMounted.current) {
            setError(`Failed to load model: ${errorEvent.message || 'Unknown error'}`);
            setIsLoading(false);
          }
        }
      );
    };
    loadModel();

    // 添加鼠标点击事件处理
    const handleMouseClick = (event: MouseEvent) => {
      if (!containerRef.current || !sceneRef.current || !cameraRef.current || !modelRef.current) return;
      
      if (isPlayingInteractionAnimRef.current) {
        console.log("VirtualAgent: 已有交互动画正在播放，忽略点击");
        return;
      }
      
      // 当模型正在说话时，忽略点击事件
      if (isSpeakingRef.current) {
        console.log("VirtualAgent: 模型正在说话，忽略点击事件");
        return;
      }
      
      // 计算鼠标在归一化设备坐标中的位置
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / containerRef.current.clientWidth) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / containerRef.current.clientHeight) * 2 + 1;
      
      // 更新射线位置
      raycastRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      
      // 检查射线与模型的交点
      const intersects = raycastRef.current.intersectObject(modelRef.current, true);
      
      if (intersects.length > 0) {
        console.log("VirtualAgent: 点击了模型!");
        // 随机选择一个骨骼来执行动画
        playRandomInteractionAnimation();
      }
    };
    
    // 随机选择一个骨骼执行动画
    const playRandomInteractionAnimation = () => {
      if (isPlayingInteractionAnimRef.current) return;
      
      // 收集所有可用骨骼
      const availableBones = [];
      if (rootJointRef.current) availableBones.push(rootJointRef.current);
      if (bone01Ref.current) availableBones.push(bone01Ref.current);
      if (bone02Ref.current) availableBones.push(bone02Ref.current);
      if (bone03Ref.current) availableBones.push(bone03Ref.current);
      
      if (availableBones.length === 0) {
        console.log("VirtualAgent: 没有可用骨骼进行交互");
        return;
      }
      
      // 随机选择一个骨骼
      const randomBone = availableBones[Math.floor(Math.random() * availableBones.length)];
      const boneName = randomBone === rootJointRef.current ? "_rootJoint" : 
                       randomBone === bone01Ref.current ? "unnamed_01" : 
                       randomBone === bone02Ref.current ? "unnamed001_02" : 
                       "unnamed002_03";
      
      console.log(`VirtualAgent: 随机选择 ${boneName} 执行交互动画`);
      
      // 设置交互状态
      isPlayingInteractionAnimRef.current = true;
      interactionTimeRef.current = 0;
      
      // 2秒后重置交互状态
      setTimeout(() => {
        isPlayingInteractionAnimRef.current = false;
        console.log("VirtualAgent: 交互动画结束");
      }, 2000);
    };
    
    // 添加事件监听器
    currentContainer.addEventListener('click', handleMouseClick);

    const animate = () => {
      if (!isMounted.current || !rendererRef.current || !sceneRef.current || !cameraRef.current || !clockRef.current) {
        return;
      }
      animationFrameIdRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) controlsRef.current.update();

      // Use refs to get the latest prop values
      const speaking = isSpeakingRef.current;
      const currentViseme = currentVisemeTargetRef.current;
      
      const delta = clockRef.current.getDelta();
      const elapsedTime = clockRef.current.getElapsedTime();

      // 更新 AnimationMixer (如果存在)
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      // Debug log every second to verify values are updating
      if (elapsedTime % 5 < 0.01) {
        console.log(`Animation state: speaking=${speaking}, viseme=${JSON.stringify(currentViseme)}`);
      }
      
      // 处理交互动画
      if (isPlayingInteractionAnimRef.current) {
        interactionTimeRef.current += delta;
        const t = interactionTimeRef.current; // 当前交互动画的时间
        
        // 为每个交互骨骼添加不同的动画效果
        if (rootJointRef.current && initialBoneStatesRef.current.has(rootJointRef.current)) {
          const initialState = initialBoneStatesRef.current.get(rootJointRef.current)!;
          // 整体摇晃效果
          rootJointRef.current.rotation.y = initialState.rotation.y + Math.sin(t * 10) * 0.3;
        }
        
        if (bone01Ref.current && initialBoneStatesRef.current.has(bone01Ref.current)) {
          const initialState = initialBoneStatesRef.current.get(bone01Ref.current)!;
          // 头部点头效果
          bone01Ref.current.rotation.x = initialState.rotation.x + Math.sin(t * 8) * 0.2;
        }
        
        if (bone02Ref.current && initialBoneStatesRef.current.has(bone02Ref.current)) {
          const initialState = initialBoneStatesRef.current.get(bone02Ref.current)!;
          // 头部旋转效果
          bone02Ref.current.rotation.z = initialState.rotation.z + Math.sin(t * 6) * 0.25;
        }
        
        if (bone03Ref.current && initialBoneStatesRef.current.has(bone03Ref.current)) {
          const initialState = initialBoneStatesRef.current.get(bone03Ref.current)!;
          // 复合运动
          bone03Ref.current.rotation.x = initialState.rotation.x + Math.sin(t * 7) * 0.2;
          bone03Ref.current.rotation.z = initialState.rotation.z + Math.cos(t * 5) * 0.15;
        }
      } else if (!speaking) {
        // 只有在不说话且没有交互动画时，才恢复交互骨骼的初始状态
        const resetBone = (boneRef: React.MutableRefObject<THREE.Bone | null>) => {
          if (boneRef.current && initialBoneStatesRef.current.has(boneRef.current)) {
            const initialState = initialBoneStatesRef.current.get(boneRef.current)!;
            boneRef.current.rotation.x = THREE.MathUtils.lerp(
              boneRef.current.rotation.x, 
              initialState.rotation.x, 
              0.1
            );
            boneRef.current.rotation.y = THREE.MathUtils.lerp(
              boneRef.current.rotation.y, 
              initialState.rotation.y, 
              0.1
            );
            boneRef.current.rotation.z = THREE.MathUtils.lerp(
              boneRef.current.rotation.z, 
              initialState.rotation.z, 
              0.1
            );
          }
        };
        
        resetBone(rootJointRef);
        resetBone(bone01Ref);
        resetBone(bone02Ref);
        resetBone(bone03Ref);
      }

      // 使用三个指定骨骼模拟说话动作
      if (speaking && !isPlayingInteractionAnimRef.current) {
        // 只在说话且没有交互动画时控制口型骨骼
        const time = clockRef.current.getElapsedTime();
        
        // 为骨骼1添加随机动作
        if (mouthBone1Ref.current && initialBoneStatesRef.current.has(mouthBone1Ref.current)) {
          const initialState = initialBoneStatesRef.current.get(mouthBone1Ref.current)!;
          // 使用正弦函数和随机幅度创建自然的运动
          const randomAmplitude = Math.sin(time * 15) * 0.2; // 增加幅度从0.2到0.5
          mouthBone1Ref.current.rotation.x = initialState.rotation.x + randomAmplitude;
          // 添加Y轴和Z轴旋转，使动作更加复杂
          mouthBone1Ref.current.rotation.y = initialState.rotation.y + Math.sin(time * 12) * 0.2;
        }
        
        // 为骨骼2添加随机动作 (使用不同频率)
        if (mouthBone2Ref.current && initialBoneStatesRef.current.has(mouthBone2Ref.current)) {
          const initialState = initialBoneStatesRef.current.get(mouthBone2Ref.current)!;
          const randomAmplitude = Math.sin(time * 12) * 0.15; // 增加幅度从0.15到0.4
          mouthBone2Ref.current.rotation.x = initialState.rotation.x + randomAmplitude;
          // 添加Z轴旋转
          mouthBone2Ref.current.rotation.z = initialState.rotation.z + Math.cos(time * 10) * 0.15;
        }
        
        // 为骨骼3添加随机动作 (使用不同频率)
        if (mouthBone3Ref.current && initialBoneStatesRef.current.has(mouthBone3Ref.current)) {
          const initialState = initialBoneStatesRef.current.get(mouthBone3Ref.current)!;
          const randomAmplitude = Math.sin(time * 18) * 0.25; // 增加幅度从0.25到0.6
          mouthBone3Ref.current.rotation.x = initialState.rotation.x + randomAmplitude;
          // 添加Y轴旋转
          mouthBone3Ref.current.rotation.y = initialState.rotation.y + Math.sin(time * 20) * 0.3;
        }
        
        // 添加调试日志，每5秒打印一次骨骼状态
        if (clockRef.current.getElapsedTime() % 5 < 0.01) {
          console.log("说话状态下骨骼旋转: ", 
            mouthBone1Ref.current ? mouthBone1Ref.current.rotation : "未找到骨骼1", 
            mouthBone2Ref.current ? mouthBone2Ref.current.rotation : "未找到骨骼2", 
            mouthBone3Ref.current ? mouthBone3Ref.current.rotation : "未找到骨骼3");
              }
            } else {
        // 如果不说话，将骨骼恢复到初始状态
        if (mouthBone1Ref.current && initialBoneStatesRef.current.has(mouthBone1Ref.current)) {
          const initialState = initialBoneStatesRef.current.get(mouthBone1Ref.current)!;
          mouthBone1Ref.current.rotation.x = THREE.MathUtils.lerp(
            mouthBone1Ref.current.rotation.x, 
            initialState.rotation.x, 
            0.3
          );
          mouthBone1Ref.current.rotation.y = THREE.MathUtils.lerp(
            mouthBone1Ref.current.rotation.y, 
            initialState.rotation.y, 
            0.3
          );
        }
        
        if (mouthBone2Ref.current && initialBoneStatesRef.current.has(mouthBone2Ref.current)) {
          const initialState = initialBoneStatesRef.current.get(mouthBone2Ref.current)!;
          mouthBone2Ref.current.rotation.x = THREE.MathUtils.lerp(
            mouthBone2Ref.current.rotation.x, 
            initialState.rotation.x, 
            0.3
          );
          mouthBone2Ref.current.rotation.z = THREE.MathUtils.lerp(
            mouthBone2Ref.current.rotation.z, 
            initialState.rotation.z, 
            0.3
          );
        }
        
        if (mouthBone3Ref.current && initialBoneStatesRef.current.has(mouthBone3Ref.current)) {
          const initialState = initialBoneStatesRef.current.get(mouthBone3Ref.current)!;
          mouthBone3Ref.current.rotation.x = THREE.MathUtils.lerp(
            mouthBone3Ref.current.rotation.x, 
            initialState.rotation.x, 
            0.3
          );
          mouthBone3Ref.current.rotation.y = THREE.MathUtils.lerp(
            mouthBone3Ref.current.rotation.y, 
            initialState.rotation.y, 
            0.3
          );
        }
      }

      // 保留原来的代码，但只在没有找到指定骨骼时作为备用
      if (!mouthBone1Ref.current && !mouthBone2Ref.current && !mouthBone3Ref.current && 
          jawBoneRef.current && initialBoneStatesRef.current.has(jawBoneRef.current)) {
        const initialState = initialBoneStatesRef.current.get(jawBoneRef.current)!;
        let targetRotationX = initialState.rotation.x;
        if (speaking) {
          targetRotationX += currentViseme.jaw;
        }
        jawBoneRef.current.rotation.x = THREE.MathUtils.lerp(
          jawBoneRef.current.rotation.x,
          targetRotationX,
          0.35 // Slightly faster lerp for more responsive mouth
        );
      }

      // 根据说话状态控制闲置动画的权重
      if (idleActionRef.current) {
        if (speaking) {
          // 如果正在说话，逐渐减弱闲置动画的权重
          idleActionRef.current.setEffectiveWeight(
            THREE.MathUtils.lerp(idleActionRef.current.getEffectiveWeight(), 0, 0.1)
          );
        } else {
          // 如果没有说话，逐渐增强闲置动画的权重
           idleActionRef.current.setEffectiveWeight(
            THREE.MathUtils.lerp(idleActionRef.current.getEffectiveWeight(), 1, 0.1)
          );
        }
      }

      if (modelRef.current && !mixerRef.current) { // 如果没有mixer控制，才使用旧的程序化旋转
        const time = clockRef.current.getElapsedTime();
        if (speaking) {
          // More pronounced head movement when speaking
          modelRef.current.rotation.y = Math.sin(time * 2.5) * 0.025;
        } else {
          // Subtle idle movement
          modelRef.current.rotation.y = Math.sin(time * 0.8) * 0.015;
        }
      }
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    console.log("VirtualAgent: Starting animation loop.");
    animate();

    const handleResize = () => {
      if (!isMounted.current || !rendererRef.current || !cameraRef.current || !containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
      console.log("VirtualAgent: Resized.");
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      console.log("VirtualAgent: Cleaning up Three.js resources...");
      cancelAnimationFrame(animationFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      
      // 移除点击事件监听器
      if (currentContainer) {
        currentContainer.removeEventListener('click', handleMouseClick);
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      
      // 停止并清理动画
      if (idleActionRef.current) {
        idleActionRef.current.stop();
        idleActionRef.current = null;
      }
      if (mixerRef.current) {
        // mixerRef.current.uncacheRoot(modelRef.current); // May not be needed if model is removed
        mixerRef.current = null;
      }
      
      // Safely remove model from scene
      if (modelRef.current && sceneRef.current && sceneRef.current.children.includes(modelRef.current)) {
        sceneRef.current.remove(modelRef.current);
      }
      modelRef.current = null;
      
      sceneRef.current?.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material?.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
      
      if(sceneRef.current){
          while(sceneRef.current.children.length > 0){
              sceneRef.current.remove(sceneRef.current.children[0]);
          }
      }
      sceneRef.current = null;
      
      if (rendererRef.current) {
        if (currentContainer && rendererRef.current.domElement.parentNode === currentContainer) {
          try {
            currentContainer.removeChild(rendererRef.current.domElement);
          } catch (e) {
             console.warn("VirtualAgent: Error removing canvas from DOM during cleanup:", e);
          }
        }
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      
      cameraRef.current = null;
      jawBoneRef.current = null;
      initialBoneStatesRef.current.clear();
      clockRef.current = null;
      console.log("VirtualAgent: Cleanup complete.");
    };
  }, []);
  
  return (
    <div className="virtual-agent-container">
      {error ? (
        <div className="agent-placeholder">
          <div className="placeholder-icon">⚠️</div>
          <p className="placeholder-text">加载虚拟形象出错</p>
          <p className="placeholder-description">{error}</p>
        </div>
      ) : (
        <div 
          className="model-container" 
          ref={containerRef} 
          style={{
            overflow: 'hidden',
            height: '100%',
            width: '100%',
            minHeight: '500px',
            position: 'relative',
            display: 'block',
            touchAction: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitBackgroundClip: 'padding-box',
            backgroundClip: 'padding-box',
            WebkitTextSizeAdjust: 'none',
            textSizeAdjust: 'none'
          }}
        >
          {isLoading && (
            <div className="model-loading">
              <div className="placeholder-icon">👤</div>
              <p className="placeholder-text">加载虚拟形象中...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VirtualAgent; 