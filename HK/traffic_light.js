// traffic_light.js
import * as THREE from 'https://unpkg.com/three@0.159.0/build/three.module.js';

export async function loadTrafficLight(loader) {
    // 1. 비동기로 로드
    const gltf = await loader.loadAsync('./assets/traffic_light.glb');
    const model = gltf.scene;

    // 2. 모델 기본 설정 (회전, 크기 등 모델 고유의 특성)
    model.scale.set(0.3, 0.3, 0.3); 
    model.rotation.y = -Math.PI ;

    // 3. 재질 및 그림자 설정 (빨간불 로직)
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (child.name === 'Light_Red') {
                child.material = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    emissive: 0xff0000,
                    emissiveIntensity: 5,
                    metalness: 0.1,
                    roughness: 0.3
                });
            }
        }
    });
    
    return model;
}

//-------------------------------
// Map .js

// const trafficLight = await loadTrafficLight(loader);
// trafficLight.position.set(8, 0.5, 0);

//-------------------------------
// main.js

//scene.add(trafficLight);
