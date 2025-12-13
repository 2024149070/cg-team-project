// map_generation.js
import { loadTrafficLight } from './traffic_light.js';
import * as THREE from 'https://unpkg.com/three@0.159.0/build/three.module.js';
import { traffic_light_zone } from './traffic_light_zone.js';

// loader, scene, obstacles 배열을 인자로 받습니다.
export async function initMap(loader, scene, obstacles, floors,collisionObjects) { 
    console.log("맵 생성 시작");

    await traffic_light_zone(scene, loader, {x:20,y:0,z:0}, collisionObjects);

    // 3. 씬과 충돌 배열에 추가합니다.
    
    await createFloors(loader, scene, floorPositions, floors)

    console.log("맵 생성 완료");
}





const floorPositions = [
    { x: 4, y: 0, z: 0 }, { x: 8, y: 0, z: 0 }, { x: 12, y: 0, z: 0 },
    { x: 16, y: 0, z: 0 }, { x: 20, y: 0, z: 0 }, { x: 24, y: 0, z: 0 },
    { x: 28, y: 0, z: 0 }, { x: 32, y: 0, z: 0 }, { x: 36, y: 0, z: 0 },
    { x: 40, y: 0, z: 0 }, { x: 44, y: 0, z: 0 }, { x: 48, y: 0, z: 0 },
    { x: 52, y: 0, z: 0 }, { x: 56, y: 0, z: 0 }, { x: 60, y: 0, z: 0 },
    { x: 64, y: 0, z: 0 }, { x: 68, y: 0, z: 0 }, { x: 72, y: 0, z: 0 },
    { x: 76, y: 0, z: 0 }, { x: 80, y: 0, z: 0 }, { x: 84, y: 0, z: 0 }
];



async function loadFloor(loader) {
    // 1. 비동기로 로드
    const gltf = await loader.loadAsync('./assets/road.glb');
    let floorGeometry, floorMaterial;

    gltf.scene.traverse((child) => {
    if (child.isMesh && !floorGeometry) { 
        floorGeometry = child.geometry;
        floorMaterial = child.material; 
    }
    
    });
    // floorGeometry = new THREE.BoxGeometry(4, 0.5, 10);
    // floorMaterial = new THREE.MeshLambertMaterial({ color: 0x964b00 });
    return [floorGeometry, floorMaterial];
}

async function createFloors(loader, scene, positions, floors) {
    // ★ 수정 1: await를 붙여서 데이터를 확실히 받아온 뒤 구조 분해 할당
    const [floorGeometry, floorMaterial] = await loadFloor(loader);
    positions.forEach(pos => {
        // Geometry와 Material을 재활용하여(인스턴싱 개념) 메쉬 생성
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.scale.set(0.5,0.5,0.5);
        floor.position.set(pos.x, pos.y, pos.z);
        floor.userData.originalZ = floor.position.z;
        
        // BoundingBox 계산
        // (computeBoundingBox는 보통 geometry 레벨에서 한 번만 해도 되지만 안전하게 유지)
        floor.geometry.computeBoundingBox(); 
        floor.bbox = new THREE.Box3().setFromObject(floor);
        
        // ★ 수정 2: 화면에 보이도록 scene에 추가
        scene.add(floor);
        
        // 충돌/관리 배열에 추가
        floors.push(floor);
    });
}

// //
// const obstacles = []
// const floors = []
// const collisionObjects = []
// initMap(loader, scene, obstacles, floors, collisionObjects);