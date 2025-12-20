import * as THREE from 'three';
import { traffic_light_zone } from './traffic_light_zone.js';

export const weatherZones = [
    {
        type: 'RAIN',
        position: { x: 20, y: 5, z: 0 },
        size: { x: 10, y: 10, z: 10 }
    },
    {
        type: 'SNOW',
        position: { x: 80, y: 5, z: 0 },
        size: { x: 10, y: 10, z: 10 }
    }
];

export const weatherFloors = [];
export const weatherClouds = [];
export const invisibleObstacles = []; // Will be populated with 'inv' objects

// These are kept for compatibility if needed, but will be empty or unused
export const floors = [];
export const obstacles = [];
export const goal = { position: { x: 80, y: 0.7, z: 0 } }; // HK defines goal position locally, but Game.js uses it for distance check
export const pillars = [];
export const pillarPositions = [];
export const steps = [];
export const bigwalls = [];

// loader, scene, colliders 배열을 인자로 받습니다.
export async function initMap(loader, scene, colliders) {
    console.log("맵 생성 시작");

    await traffic_light_zone(scene, loader, { x: 20, y: 0, z: 0 }, colliders);

    await createFloors(loader, scene, floorPositions, colliders);

    await createStepPair(loader, scene, stepPositions, bigWallPosition, colliders);

    await createAPT(loader, scene, APTPositions, colliders);

    await createCones(loader, scene, conePositions, colliders);

    createGoal(scene, goalPosition, colliders);

    createWall(scene, wallPositions, colliders);

    createRamp(scene, rampPositions, { length: 5, height: 2, width: 3 }, colliders);
    createInv(scene, invPositions, colliders);

    // Initialize Weather Visuals (Clouds, SnowFloor) - Integrated from old map.js
    weatherZones.forEach(zone => {
        // Create Cloud for all weather zones
        const cloudGeo = new THREE.BoxGeometry(zone.size.x, 1, zone.size.z);
        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 1.0,
            metalness: 0.0,
            transparent: true,
            opacity: 0.0 // Start invisible
        });
        const cloud = new THREE.Mesh(cloudGeo, cloudMat);
        cloud.position.set(zone.position.x, 6, zone.position.z);
        cloud.userData.zone = zone;

        scene.add(cloud);
        weatherClouds.push(cloud);

        // Create Snow Floor for SNOW zones
        if (zone.type === 'SNOW') {
            const snowGeo = new THREE.BoxGeometry(zone.size.x, 0.05, zone.size.z);
            const snowMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 1.0,
                metalness: 0.0,
                transparent: true,
                opacity: 0.0 // Start invisible
            });
            const snowFloor = new THREE.Mesh(snowGeo, snowMat);
            snowFloor.position.set(zone.position.x, 0.285, zone.position.z);
            snowFloor.receiveShadow = true;
            snowFloor.userData.zone = zone; // Attach zone for distance calculation

            scene.add(snowFloor);
            weatherFloors.push(snowFloor);
        }
    });

    console.log("맵 생성 완료");
}

//생성함수 작성시 주의할 점
//만약 해당 오브젝트가 충돌 처리가 필요할 경우
//obj.userData.type = ""을 통해 충돌 처리 type을 설정하고,
//colliders 배열을 파라미터로 받아 배열에 push.

// 바닥 생성
const floorPositions = [
    { x: -16, y: 0, z: 0 }, { x: -12, y: 0, z: 0 }, { x: -8, y: 0, z: 0 },
    { x: -4, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 },
    { x: 8, y: 0, z: 0 }, { x: 12, y: 0, z: 0 }, { x: 16, y: 0, z: 0 },
    { x: 20, y: 0, z: 0 }, { x: 24, y: 0, z: 0 }, { x: 28, y: 0, z: 0 },
    { x: 32, y: 0, z: 0 }, { x: 36, y: 0, z: 0 }, { x: 40, y: 0, z: 0 },
    { x: 44, y: 0, z: 0 }, //{ x: 48, y: 0, z: 0 }, { x: 52, y: 0, z: 0 },
    { x: 56, y: 0, z: 0 }, { x: 60, y: 0, z: 0 }, { x: 64, y: 0, z: 0 },
    { x: 68, y: 0, z: 0 }, { x: 72, y: 0, z: 0 }, { x: 76, y: 0, z: 0 },
    { x: 80, y: 0, z: 0 }, { x: 84, y: 0, z: 0 }, { x: 88, y: 0, z: 0 },
    { x: 92, y: 0, z: 0 }, { x: 96, y: 0, z: 0 }, { x: 100, y: 0, z: 0 },


    { x: -20, y: 0, z: -15 }, { x: -16, y: 0, z: -15 }, { x: -12, y: 0, z: -15 },
    { x: -8, y: 0, z: -15 }, { x: -4, y: 0, z: -15 }, { x: 0, y: 0, z: -15 },
    { x: 4, y: 0, z: -15 }, { x: 8, y: 0, z: -15 }, { x: 12, y: 0, z: -15 },
    { x: 16, y: 0, z: -15 }, { x: 20, y: 0, z: -15 }, { x: 24, y: 0, z: -15 },
    { x: 28, y: 0, z: -15 }, { x: 32, y: 0, z: -15 }, { x: 36, y: 0, z: -15 },
    { x: 40, y: 0, z: -15 }, { x: 44, y: 0, z: -15 }, { x: 48, y: 0, z: -15 },
    { x: 52, y: 0, z: -15 }, { x: 56, y: 0, z: -15 }, { x: 60, y: 0, z: -15 },
    { x: 64, y: 0, z: -15 }, { x: 68, y: 0, z: -15 }, { x: 72, y: 0, z: -15 },
    { x: 76, y: 0, z: -15 }, { x: 80, y: 0, z: -15 }, { x: 84, y: 0, z: -15 },
    { x: 88, y: 0, z: -15 }, { x: 92, y: 0, z: -15 }, { x: 96, y: 0, z: -15 },
    { x: 100, y: 0, z: -15 }
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
    return [floorGeometry, floorMaterial];
}

async function createFloors(loader, scene, positions, colliders) {
    // ★ 수정 1: await를 붙여서 데이터를 확실히 받아온 뒤 구조 분해 할당
    const [floorGeometry, floorMaterial] = await loadFloor(loader);
    positions.forEach(pos => {
        // Geometry와 Material을 재활용하여(인스턴싱 개념) 메쉬 생성
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.scale.set(0.5, 0.5, 0.5);
        floor.position.set(pos.x, pos.y, pos.z);
        floor.userData.originalZ = floor.position.z;
        floor.userData.type = "floor";
        // BoundingBox 계산
        // (computeBoundingBox는 보통 geometry 레벨에서 한 번만 해도 되지만 안전하게 유지)
        floor.geometry.computeBoundingBox();
        floor.bbox = new THREE.Box3().setFromObject(floor);

        // ★ 수정 2: 화면에 보이도록 scene에 추가
        scene.add(floor);
        colliders.push(floor);
        floors.push(floor); // Legacy support
    });
}

// 발판 기믹 생성.
const stepPositions = [
    { x: 33, y: 0.2, z: -2 }, { x: 34, y: 0.2, z: 3 }
]
const bigWallPosition = { x: 37, y: 2.5, z: 0 };

async function createStepPair(loader, scene, stepPositions, wallPosition, colliders) {
    const stepGeometry = new THREE.BoxGeometry(1, 0.2, 1);
    const stepMaterial = new THREE.MeshLambertMaterial({ color: 0xffa500 });
    const localSteps = [];

    stepPositions.forEach(pos => {
        const material = stepMaterial.clone();
        const step = new THREE.Mesh(stepGeometry, material);
        step.position.set(pos.x, pos.y, pos.z);
        step.userData.originalZ = step.position.z;
        step.userData.originalColor = material.color.clone();
        step.geometry.computeBoundingBox();
        step.bbox = new THREE.Box3().setFromObject(step);
        step.userData.type = "step";
        colliders.push(step);
        localSteps.push(step);
        scene.add(step);
        steps.push(step); // Legacy
    })
    localSteps[0].userData.pair = localSteps[1];
    localSteps[1].userData.pair = localSteps[0];

    // Using loader.loadAsync because HK code used callback but we want to await it if possible, 
    // BUT HK code logic inside initMap awaits createStepPair.
    // HK createStepPair used loader.load (callback).
    // I should convert to loadAsync to properly await.
    try {
        const gltf = await loader.loadAsync('./assets/bigWall.glb');
        const template = gltf.scene;

        template.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });
        const bigWallMesh = template.clone(true);
        bigWallMesh.scale.set(0.7, 0.7, 0.7);
        bigWallMesh.position.set(wallPosition.x, wallPosition.y, wallPosition.z);

        bigWallMesh.userData.initialPosition = bigWallMesh.position.clone();
        bigWallMesh.userData.raised = false;

        bigWallMesh.updateMatrixWorld(true);
        bigWallMesh.bbox = new THREE.Box3().setFromObject(bigWallMesh);
        bigWallMesh.userData.type = "obstacle";
        localSteps[0].userData.target = bigWallMesh;
        localSteps[1].userData.target = bigWallMesh;
        scene.add(bigWallMesh)

        colliders.push(bigWallMesh);
        bigwalls.push(bigWallMesh); // Legacy
    } catch (err) {
        console.error('bigWall glb 로드 실패:', err);
    }
}

//건물 생성.
const APTPositions = [
    { x: -2, y: 1.8, z: 0 }, { x: 6, y: 1.8, z: -3 }, { x: 10, y: 1.8, z: 2 },

    { x: 8, y: 1.8, z: -17 }, { x: 12, y: 1.8, z: -14 }
];
async function createAPT(loader, scene, positions, colliders) {
    try {
        const gltf = await loader.loadAsync('./assets/apartment.glb');
        const template = gltf.scene;
        template.scale.set(1, 1, 1);

        template.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });

        positions.forEach((pos) => {
            const apartment = template.clone(true);

            apartment.position.set(pos.x, pos.y, pos.z);
            apartment.userData.originalZ = apartment.position.z;
            apartment.bbox = new THREE.Box3().setFromObject(apartment);
            apartment.userData.type = 'obstacle';
            scene.add(apartment);
            colliders.push(apartment);
            obstacles.push(apartment); // Legacy
        });
    } catch (err) {
        console.error('apartment.glb 로드 실패: ', err);
    }
}

// 콘 생성
const conePositions = [];
for (let i = 0; i < 16; i++) {
    conePositions.push({
        x: 75 + Math.random() * 10,
        y: 0.4, // Adjusted for smaller scale
        z: -5 + Math.random() * 10
    });
}

async function createCones(loader, scene, positions, collider) {
    try {
        const gltf = await loader.loadAsync('./assets/cone.glb');
        const template = gltf.scene;

        template.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });

        positions.forEach((pos) => {
            const cone = template.clone(true);

            cone.scale.set(0.5, 0.5, 0.5);
            cone.position.set(pos.x, pos.y, pos.z);

            cone.updateMatrixWorld(true);
            cone.bbox = new THREE.Box3().setFromObject(cone);

            cone.userData.type = 'obstacle';
            scene.add(cone);
            collider.push(cone);
            obstacles.push(cone); // Legacy
        });
    } catch (err) {
        console.error('cone load error', err);
    }
}

// 벽 생성
const wallPositions = [
    { x: 15, y: 15, z: 0 }, { x: 45.5, y: 1.5, z: -15 }, { x: 46.5, y: 1.5, z: -15 },
    { x: 47.5, y: 1.5, z: -15 }, { x: 48.5, y: 1.5, z: -15 }, { x: 49.5, y: 1.5, z: -15 },
    { x: 50.5, y: 1.5, z: -15 }, { x: 51.5, y: 1.5, z: -15 }, { x: 52.5, y: 1.5, z: -15 }
];

function createWall(scene, positions, colliders) {
    const wallGeometry = new THREE.BoxGeometry(1, 3, 10);
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xa8b2d2b });

    positions.forEach(pos => {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(pos.x, pos.y, pos.z);
        wall.userData.originalZ = wall.position.z;
        wall.geometry.computeBoundingBox();
        wall.bbox = new THREE.Box3().setFromObject(wall);

        wall.userData.type = 'obstacle';
        scene.add(wall);

        colliders.push(wall);
        obstacles.push(wall); // Legacy
    });
}

// 경사로 생성.
const rampPositions = [{ x: 40, y: 0, z: 0 }];
function createRamp(scene, positions, size, colliders) {
    // size = { length: X축 길이, height: Y축 높이, width: Z축 폭 }
    const { length, height, width } = size;

    // 1. 2D 삼각형 모양 정의 (옆에서 본 모습)
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);             // 시작점 (왼쪽 아래)
    shape.lineTo(length, 0);        // 오른쪽 아래
    shape.lineTo(length, height);   // 오른쪽 위 (경사 끝점)
    shape.closePath();              // 삼각형 닫기

    // 2. 3D로 돌출 (Extrude)
    const extrudeSettings = {
        steps: 1,
        depth: width, // Z축으로 두께 주기
        bevelEnabled: false,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // 3. 중심점 맞추기 및 회전/이동
    // Extrude는 Z축 방향으로 생성되므로, 우리가 원하는 방향으로 맞춥니다.
    // 현재 상태: X방향 길이, Y방향 높이, Z방향 폭. (시작점이 0,0,0)
    // 편의를 위해 Z축 중심을 맞춰줍니다.
    geometry.translate(0, 0, -width / 2);

    const material = new THREE.MeshStandardMaterial({ color: 0x88ccff });
    positions.forEach(pos => {
        const ramp = new THREE.Mesh(geometry, material);
        ramp.position.set(pos.x, pos.y, pos.z);
        // 그림자 설정
        ramp.receiveShadow = true;
        ramp.castShadow = true;

        // 4. 필수 데이터 계산 및 저장 (★ 핵심 부분)
        // 월드 좌표계 기준의 BBox를 구합니다.
        ramp.updateMatrixWorld();
        geometry.computeBoundingBox();
        ramp.bbox = new THREE.Box3().setFromObject(ramp);

        // 물리 계산에 필요한 데이터를 userData에 저장합니다.
        // 경사가 X축 방향으로 올라간다고 가정합니다.
        ramp.userData = {
            type: "ramp",
            // 경사로의 시작 X좌표와 끝 X좌표 (월드 기준)
            startX: ramp.bbox.min.x,
            endX: ramp.bbox.max.x,
            // 경사로의 바닥 높이와 꼭대기 높이 (월드 기준)
            baseY: ramp.bbox.min.y,
            topY: ramp.bbox.min.y + height, // 또는 ramp.bbox.max.y (정확히 일치한다면)
            // 미리 계산해둔 길이 (나눗셈 최적화용)
            lengthX: ramp.bbox.max.x - ramp.bbox.min.x
        };

        scene.add(ramp);
        colliders.push(ramp);
        obstacles.push(ramp); // Legacy
    });
}

// goal 생성
const goalPosition = { x: 100, y: 0.7, z: 0 };
function createGoal(scene, position, colliders) {
    const goalGeometry = new THREE.IcosahedronGeometry(0.5, 0);
    const goalMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const goalMesh = new THREE.Mesh(goalGeometry, goalMaterial);

    goalMesh.position.set(position.x, position.y, position.z);

    goalMesh.bbox = new THREE.Box3().setFromObject(goalMesh);

    goalMesh.userData.type = "goal";
    colliders.push(goalMesh)
    scene.add(goalMesh);
}


const invPositions = [];
for (let i = 0; i < 8; i++) {
    invPositions.push({
        x: -21,
        y: 1 + i * 1.5,
        z: -16 + 2 * Math.pow(-1, i)
    });
}
for (let i = 0; i < 12; i++) {
    invPositions.push({
        x: -21 + i * 2,
        y: 1 + 7 * 1.5,
        z: -18
    });
}

function createInv(scene, position, colliders) {
    const invGeometry = new THREE.BoxGeometry(2, 0.5, 2);
    const invMaterial = new THREE.MeshLambertMaterial({
        color: 0xa8b2d2,
        transparent: true,
        opacity: 0.0
    });
    position.forEach(pos => {
        const material = invMaterial.clone();
        const inv = new THREE.Mesh(invGeometry, material);
        inv.position.set(pos.x, pos.y, pos.z);
        inv.userData.originalZ = inv.position.z;
        inv.geometry.computeBoundingBox();
        inv.bbox = new THREE.Box3().setFromObject(inv);
        inv.userData.type = "inv";
        colliders.push(inv);
        scene.add(inv);
        invisibleObstacles.push(inv); // Add to exported array for WeatherSystem to pick up?
        // Note: WeatherSystem uses 'invisibleObstacles' for fading logic in OLD code.
        // In NEW code, fading is handled by CollisionHandlers.inv!
        // So WeatherSystem might not need to handle this anymore if Logic is fully moved.
        // But WeatherSystem might still be doing something.
        // Actually, HK Collision Manager handles fading logic inside 'inv'.
        // So 'WeatherSystem.js' might overlap or conflict if it also tries to fade 'invisibleObstacles'.
        // I should probably remove the fading logic from WeatherSystem or just let HK handle it.
        // HK handles it in 'inv' collision handler (which runs on update).
    });

}