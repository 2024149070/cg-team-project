import * as THREE from 'three';
import { traffic_light_zone } from './traffic_light_zone.js';



export const weatherFloors = [];
export const weatherClouds = [];
export const invisibleObstacles = []; // Will be populated with 'inv' objects

// These are kept for compatibility if needed, but will be empty or unused
export const floors = [];
export const obstacles = [];
export const goal = { position: { x: 120, y: 0.7, z: 0 } }; // HK defines goal position locally, but Game.js uses it for distance check
export const pillars = [];
export const pillarPositions = [];
export const steps = [];
export const bigwalls = [];

// loader, scene, colliders 배열을 인자로 받습니다.
export async function initMap(loader, scene, colliders) {
    console.log("맵 생성 시작");
    for (const pos of trafficPositions) {
        await traffic_light_zone(scene, loader, pos, colliders);
    }


    await createFloors(loader, scene, floorPositions, colliders);


    await createStepPair(loader, scene, globalStepPosition1, globalbigWallPosition1[0], colliders);
    await createStepPair(loader, scene, globalStepPosition21, globalbigWallPosition21[0], colliders);
    await createStepPair(loader, scene, globalStepPosition22, globalbigWallPosition22[0], colliders);
    await createStepPair(loader, scene, globalStepPosition31, globalbigWallPosition31[0], colliders);
    await createStepPair(loader, scene, globalStepPosition32, globalbigWallPosition32[0], colliders);

    await createAPT(loader, scene, APTPositions, colliders);

    await createCones(loader, scene, conePositions, colliders);

    await createGoal(loader, scene, goalPosition, colliders);

    await createWall(scene, wallPositions, colliders);

    await createRamp(scene, [rampPositions[0]], rampSize[0], colliders);
    await createRamp(scene, [rampPositions[1]], rampSize[1], colliders);
    await createRamp(scene, [rampPositions[2]], rampSize[2], colliders);

    createInv(scene, invPositions, colliders);

    createSinkHole(scene, sinkHolePositions, sinkHoleKeepIndices, colliders);

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
];

async function loadFloor(loader) {
    // 1. 비동기로 로드
    const gltf = await loader.loadAsync('../assets/road.glb');
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
    { x: 75, y: 0.2, z: -2 }, { x: 76, y: 0.2, z: 3 }
]
const bigWallPosition = { x: 80, y: 2.5, z: 0 };

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
        const gltf = await loader.loadAsync('../assets/bigWall.glb');
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

];
async function createAPT(loader, scene, positions, colliders) {
    try {
        const gltf = await loader.loadAsync('../assets/apartment.glb');
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

            apartment.scale.set(
                pos.scaleX ?? 1,
                pos.scaleY ?? 1,
                pos.scaleZ ?? 1
            );

            apartment.rotation.set(
                pos.rotX ?? 0,
                pos.rotY ?? 0,
                pos.rotZ ?? 0
            )

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


async function createCones(loader, scene, positions, collider) {
    try {
        const gltf = await loader.loadAsync('../assets/cone.glb');
        const template = gltf.scene;

        template.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });

        positions.forEach((pos) => {
            const cone = template.clone(true);

            cone.position.set(pos.x, pos.y, pos.z);

            cone.scale.set(
                (pos.scaleX ?? 1) * 0.5,
                (pos.scaleY ?? 1) * 0.5,
                (pos.scaleZ ?? 1) * 0.5
            );
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
];

async function createWall(scene, positions, colliders) {
    const wallGeometry = new THREE.BoxGeometry(1, 3, 10);
    const textureLoader = new THREE.TextureLoader();
    const texture = await textureLoader.loadAsync('../assets/plaster.jpg');
    const normalTexture = await textureLoader.loadAsync('../assets/plaster-normal.jpg');

    const wallMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        normalMap: normalTexture,
        color: 0xCCCCCC,
        roughness: 0.07,
        metalness: 0.1
    });

    positions.forEach(pos => {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);

        wall.scale.set(
            pos.scaleX ?? 1,
            pos.scaleY ?? 1,
            pos.scaleZ ?? 1,
        )

        wall.rotation.set(
            pos.rotX ?? 0,
            pos.rotY ?? 0,
            pos.rotZ ?? 0
        )

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
const rampPositions = [];
async function createRamp(scene, positions, size, colliders) {
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

    const textureLoader = new THREE.TextureLoader();
    const texture = await textureLoader.loadAsync('../assets/ramp.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Rotate 90 degrees
    texture.center.set(0.5, 0.5);
    texture.rotation = Math.PI / 2 * 3;

    // Zoom in (fewer repeats = larger texture features)
    texture.repeat.set(0.35, 0.35);

    const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.2
    });
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
async function createGoal(loader, scene, pos, colliders) {
    try {
        const gltf = await loader.loadAsync('../assets/goal_house.glb');
        const template = gltf.scene;

        template.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });

        const goal = template.clone(true);
        goal.position.set(pos.x, pos.y, pos.z);
        goal.scale.set(0.5, 0.5, 0.5);

        goal.updateMatrixWorld(true);
        goal.bbox = new THREE.Box3().setFromObject(goal);

        goal.userData.type = 'goal';
        scene.add(goal);
        colliders.push(goal);
        obstacles.push(goal);
    } catch (err) {
        console.error('goal load error', err);
    }
}

const invPositions = [];


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

const sinkHoleKeepIndices = [0, 8, 12, 17, 23, 27, 30, 33, 38];
const sinkHolePositions = [];






function createSinkHole(scene, positions, keepIndices, colliders) {
    const sinkHoleGeometry = new THREE.BoxGeometry(1, 0.5, 1);
    const sinkHoleMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    positions.forEach((pos,index) => {
        const sinkHole = new THREE.Mesh(sinkHoleGeometry, sinkHoleMaterial);
        sinkHole.position.set(pos.x, pos.y, pos.z);
        sinkHole.geometry.computeBoundingBox();
        sinkHole.bbox = new THREE.Box3().setFromObject(sinkHole);
        sinkHole.userData.type = "sinkHole";
        sinkHole.userData.fell = false;
        if(keepIndices.includes(index)){
            sinkHole.userData.keep = true; 
        }
        else{
            sinkHole.userData.kepp = false;
        }
        colliders.push(sinkHole);
        scene.add(sinkHole);
    });

}


//###############################################################################
const floorPositions1 = [
    { x: -20, y: 0, z: 0 },
    { x: -16, y: 0, z: 0 }, { x: -12, y: 0, z: 0 }, { x: -8, y: 0, z: 0 },
    { x: -4, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 },
    { x: 8, y: 0, z: 0 }, { x: 12, y: 0, z: 0 }, { x: 16, y: 0, z: 0 },
    { x: 20, y: 0, z: 0 }, { x: 24, y: 0, z: 0 }, { x: 28, y: 0, z: 0 },
    { x: 32, y: 0, z: 0 }, { x: 36, y: 0, z: 0 }, { x: 40, y: 0, z: 0 },
    { x: 44, y: 0, z: 0 }, //{ x: 47, y: 0, z: 0 }, { x: 52, y: 0, z: 0 },
    { x: 56, y: 0, z: 0 }, { x: 60, y: 0, z: 0 }, { x: 64, y: 0, z: 0 },
    { x: 68, y: 0, z: 0 }, { x: 72, y: 0, z: 0 }, { x: 76, y: 0, z: 0 },
    { x: 80, y: 0, z: 0 }, { x: 84, y: 0, z: 0 }, { x: 88, y: 0, z: 0 },
    { x: 92, y: 0, z: 0 }, { x: 96, y: 0, z: 0 }, { x: 100, y: 0, z: 0 },
    { x: 104, y: 0, z: 0 }, { x: 108, y: 0, z: 0 }, { x: 112, y: 0, z: 0 },
    { x: 116, y: 0, z: 0 }, { x: 120, y: 0, z: 0 }, { x: 124, y: 0, z: 0 },


    //{ x: -20, y: 0, z: -15 }, { x: -16, y: 0, z: -15 }, { x: -12, y: 0, z: -15 },    
    //{ x: -8, y: 0, z: -15 }, //{ x: -4, y: 0, z: -15 }, { x: 0, y: 0, z: -15 },
    //{ x: 4, y: 0, z: -15 },
    { x: 8, y: 0, z: -15 }, { x: 12, y: 0, z: -15 },
    //{ x: 16, y: 0, z: -15 }, { x: 20, y: 0, z: -15 }, { x: 24, y: 0, z: -15 },
    //{ x: 28, y: 0, z: -15 }, { x: 32, y: 0, z: -15 }, { x: 36, y: 0, z: -15 },
    //{ x: 40, y: 0, z: -15 }, { x: 44, y: 0, z: -15 }, { x: 48, y: 0, z: -15 },
    //{ x: 52, y: 0, z: -15 }, { x: 56, y: 0, z: -15 }, { x: 60, y: 0, z: -15 },
    //{ x: 64, y: 0, z: -15 }, { x: 68, y: 0, z: -15 }, { x: 72, y: 0, z: -15 },
    //{ x: 76, y: 0, z: -15 }, { x: 80, y: 0, z: -15 }, { x: 84, y: 0, z: -15 },
    //{ x: 88, y: 0, z: -15 }, { x: 92, y: 0, z: -15 }, { x: 96, y: 0, z: -15 },
    //{ x: 100, y: 0, z: -15 }
];

const stepPositions1 = [
    { x: 75, y: 0.2, z: -2 }, { x: 76, y: 0.2, z: 3 }
]
const bigWallPosition1 = [{ x: 80, y: 2.5, z: 0 }];

const APTPositions1 = [
    { x: -2, y: 1.8, z: 0 }, { x: 6, y: 1.8, z: -3 }, { x: 10, y: 1.8, z: 2 },
    { x: 25, y: 1.8, z: 2 }, { x: 44, y: 1.8, z: -4 }, { x: 56, y: 1.8, z: 2 },

    { x: 8, y: 1.8, z: -17 }, { x: 12, y: 1.8, z: -14 }
];

const conePositions1 = [];
for (let i = 0; i < 15; i++) {
    conePositions1.push({
        x: 60 + 10 * Math.random(),
        y: 0.4, // Adjusted for smaller scale
        z: -4.5 + 10 * Math.random(),
        scaleY: 2
    });
}
for (let i = 0; i < 9; i++) {
    conePositions1.push({
        x: 91.5 + i,
        y: 0.4, // Adjusted for smaller scale
        z: -4.5 + i,
        scaleY: 2
    });
}
for (let i = 0; i < 7; i++) {
    conePositions1.push({
        x: 91.5 + i,
        y: 0.4, // Adjusted for smaller scale
        z: -1.5 + i,
        scaleY: 2
    });
}
for (let i = 0; i < 8; i++) {
    conePositions1.push({
        x: 100.5 + i,
        y: 0.4, // Adjusted for smaller scale
        z: 2.5 - i,
        scaleY: 2
    });
}
for (let i = 0; i < 9; i++) {
    conePositions1.push({
        x: 101.5 + i,
        y: 0.4, // Adjusted for smaller scale
        z: 4.5 - i,
        scaleY: 2
    });
}
const wallPositions1 = [
    { x: 15, y: 1.75, z: 0 },
    //{ x: 45.5, y: 1.75, z: -15 }, { x: 46.5, y: 1.75, z: -15 },
    //{ x: 47.5, y: 1.75, z: -15 }, { x: 48.5, y: 1.75, z: -15 }, { x: 49.5, y: 1.75, z: -15 },
    //{ x: 50.5, y: 1.75, z: -15 }, { x: 51.5, y: 1.75, z: -15 }, { x: 52.5, y: 1.75, z: -15 }
];
const rampPositions1 = [{ x: 90, y: 90, z: 0 }];
const rampSize1 = [{ length: 5, height: 2, width: 3 }];

const invPositions1 = [];
for (let i = 0; i < 8; i++) {
    invPositions1.push({
        x: -23,
        y: 0 + i * 1.5,
        z: -16 + 2 * Math.pow(-1, i)
    });
}
for (let i = 0; i < 13; i++) {
    invPositions1.push({
        x: -23 + i * 2,
        y: 0 + 7 * 1.5,
        z: -18
    });
}
for (let i = 0; i < 3; i++) {
    invPositions1.push({
        x: 48 + i * 2,
        y: 0 + i * 1.5,
        z: 3 * Math.pow(-1, i)
    })
}

const floorPositions2 = [
    { x: -16, y: 0, z: 0 }, { x: -12, y: 0, z: 0 }, { x: -8, y: 0, z: 0 },
    { x: -4, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 },
    { x: 8, y: 0, z: 0 }, { x: 12, y: 0, z: 0 }, { x: 16, y: 0, z: 0 },
    { x: 20, y: 0, z: 0 }, { x: 24, y: 0, z: 0 }, { x: 28, y: 0, z: 0 },
    { x: 32, y: 0, z: 0 }, { x: 36, y: 0, z: 0 }, { x: 40, y: 0, z: 0 },
    { x: 44, y: 0, z: 0 }, { x: 48, y: 0, z: 0 }, { x: 52, y: 0, z: 0 },
    { x: 56, y: 0, z: 0 }, { x: 60, y: 0, z: 0 }, { x: 64, y: 0, z: 0 },
    { x: 68, y: 0, z: 0 }, { x: 72, y: 0, z: 0 }, { x: 76, y: 0, z: 0 },
    { x: 80, y: 0, z: 0 }, { x: 84, y: 0, z: 0 }, { x: 88, y: 0, z: 0 },
    { x: 92, y: 0, z: 0 }, { x: 96, y: 0, z: 0 }, { x: 100, y: 0, z: 0 },

];

const stepPositions21 = [
    { x: 33, y: 0.2, z: -2 }, { x: 34, y: 0.2, z: 3 }
]
const bigWallPosition21 = [{ x: 37, y: 2.5, z: 0 }];

const stepPositions22 = [
    { x: 74, y: 0.2, z: -2 }, { x: 75, y: 0.2, z: 3 }
]
const bigWallPosition22 = [{ x: 79, y: 2.5, z: 0 }];

const APTPositions2 = [
    { x: 13, y: 1.8, z: 0 }, { x: 15, y: 1.8, z: -3 }, { x: 20, y: 1.8, z: 2 },
    { x: 50, y: 1.8, z: 2 }, { x: 76, y: 1.8, z: -4 }, { x: 84, y: 1.8, z: 3 }

];
const conePositions2 = [
    { x: 6, y: 0.3, z: -1, },
    { x: 10, y: 0.3, z: 4 },
    { x: 50, y: 0.3, z: -4 },
    { x: 58, y: 0.3, z: -4, scaleX: 2, scaleY: 2, scaleZ: 2 },
    { x: 58, y: 0.3, z: -2, scaleX: 2, scaleY: 2, scaleZ: 2 },
    { x: 58, y: 0.3, z: 0, scaleX: 2, scaleY: 2, scaleZ: 2 },
    { x: 58, y: 0.3, z: 2, scaleX: 2, scaleY: 2, scaleZ: 2 },
    { x: 58, y: 0.3, z: 4, scaleX: 2, scaleY: 2, scaleZ: 2 },

];
const wallPositions2 = [
    { x: 54, y: 1.5, z: 4, scaleZ: 0.5, rotX: 0, rotY: Math.PI / 2, rotZ: 0 },
    { x: 88, y: 1.5, z: 0 }
];

const rampPositions2 = [
    { x: 62, y: 0.2, z: 3, }
];
const rampSizes2 = [{ length: 10, height: 5, width: 3 }]

const invPositions2 = [{x:79, y:0, z:6}];


const floorPositions3 = [
    { x: -12, y: 0, z: 0 }, { x: -8, y: 0, z: 0 },
    { x: -4, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 },
    { x: 8, y: 0, z: 0 }, { x: 12, y: 0, z: 0 }, { x: 16, y: 0, z: 0 },
    { x: 20, y: 0, z: 0 }, { x: 24, y: 0, z: 0 }, { x: 28, y: 0, z: 0 },
    { x: 32, y: 0, z: 0 }, { x: 36, y: 0, z: 0 }, { x: 40, y: 0, z: 0 },
    { x: 44, y: 0, z: 0 }, { x: 48, y: 0, z: 0 }, { x: 52, y: 0, z: 0 },
    { x: 56, y: 0, z: 0 }, { x: 60, y: 0, z: 0 }, { x: 64, y: 0, z: 0 },
    { x: 68, y: 0, z: 0 }, { x: 72, y: 0, z: 0 }, { x: 76, y: 0, z: 0 },
    { x: 80, y: 0, z: 0 }, { x: 84, y: 0, z: 0 },
    { x: 92, y: 0, z: 0 }, { x: 96, y: 0, z: 0 }, { x: 100, y: 0, z: 0 },


    { x: 88, y: 0, z: -18 },
];


const stepPositions31 = [
    { x: 16, y: 0.2, z: -2 }, { x: 17.5, y: 0.2, z: 3 },
]
const stepPositions32 = [
    { x: 85, y: 2.95, z: 3 }, { x: 86.5, y: 2.95, z: -19 },
]
const bigWallPosition31 = [{ x: 20, y: 2.5, z: 0 }];
const bigWallPosition32 = [{ x: 90, y: -2.5, z: 0 }];

const APTPositions3 = [
    { x: -3, y: 1.8, z: 2 }, { x: 6, y: 1.8, z: -3, scaleX: 2, scaleZ: 2, rotY: -Math.PI / 2 }, { x: 10, y: 1.8, z: 2 },
    { x: 29, y: 1.8, z: 2 },
    { x: 68, y: 1.8, z: 3, rotY: -Math.PI / 2 }, { x: 75, y: 1.8, z: -2, scaleX: 2, scaleZ: 2 },


    // { x: 8, y: 1.8, z: -17 }, { x: 12, y: 1.8, z: -14 }
];
const conePositions3 = [
    { x: -6, y: 0.28, z: 2 }, { x: -1, y: 0.28, z: -3 }, { x: 1, y: 0.28, z: -1 },
    { x: 2, y: 0.28, z: 3 }, { x: 7, y: 0.28, z: 4 },
    { x: 68, y: 0.28, z: 3 }, { x: 74, y: 0.28, z: 4 }, { x: 70, y: 0.28, z: -2 },
];
for (let i = 0; i < 10; i++) {
    conePositions3.push({
        x: 27 + Math.random() * 10,
        y: 0.28, // Adjusted for smaller scale
        z: -5 + Math.random() * 7
    });
}

for (let i = 0; i < 16; i++) {
    conePositions3.push({
        x: 52 + Math.random() * 10,
        y: 0.3, // Adjusted for smaller scale
        z: -5 + Math.random() * 10,
        scaleY: 2.0
    });
}

const wallPositions3 = [
    // { x: 35, y: 1.5, z: 1, scaleZ: 0.8 }, { x: 36, y: 1.5, z: 1, scaleZ: 0.8 },
    // { x: 37, y: 1.5, z: 1, scaleZ: 0.8 }, { x: 38, y: 1.5, z: 1, scaleZ: 0.8 }, 
    // { x: 47.5, y: 1.5, z: -15 }, { x: 48.5, y: 1.5, z: -15 }, { x: 49.5, y: 1.5, z: -15 },

    { x: 83, y: 1.5, z: 0 }, { x: 84, y: 1.5, z: 0 }, { x: 85, y: 1.5, z: 0 },
    { x: 86.5, y: 1.5, z: -18 },
    { x: 87.5, y: 1.5, z: -18 }, { x: 88.5, y: 1.5, z: -18 },

    { x: 93, y: 1.5, z: 0 }, { x: 95.5, y: 1.5, z: 0 },
];
const rampPositions3 = [{ x: 78, y: 0.25, z: 3 }];
const rampSizes3 = [{ length: 4, height: 2, width: 3 }];



function addChunkToGlobal(globalList, localList, globalStartX, startfloorX, endfloorX) {
    localList.forEach(pos => {
        // 원본 객체를 보호하기 위해 Spread(...)로 복사 후 x만 수정
        globalList.push({
            ...pos,
            x: pos.x + globalStartX - startfloorX
        });
    });
    return globalStartX + endfloorX - startfloorX;
}

const startfloorX1 = -20
const endfloorX1 = 124;

const startfloorX2 = -16
const endfloorX2 = 100;

const startfloorX3 = -12
const endfloorX3 = 100;
let nextX = -20;

//###########################################################################
addChunkToGlobal(floorPositions, floorPositions1, nextX, startfloorX1, endfloorX1);
addChunkToGlobal(APTPositions, APTPositions1, nextX, startfloorX1, endfloorX1);


const weatherZones1 = [
    {
        type: 'RAIN',
        position: { x: 50 + nextX - startfloorX1, y: 5, z: 0 },
        size: { x: 10, y: 10, z: 10 }
    },
    {
        type: 'SNOW',
        position: { x: 65 + nextX - startfloorX1, y: 5, z: 0 },
        size: { x: 10, y: 10, z: 10 }
    },
    {
        type: 'SNOW',
        position: { x: 100 + nextX - startfloorX1, y: 5, z: 0 },
        size: { x: 20, y: 10, z: 10 }
    }
];
const trafficPositions1 = [{ x: 36 + nextX - startfloorX1, y: 0, z: 0 }];

const globalStepPosition1 = [];
const globalbigWallPosition1 = [];
addChunkToGlobal(globalStepPosition1, stepPositions1, nextX, startfloorX1, endfloorX1);
addChunkToGlobal(globalbigWallPosition1, bigWallPosition1, nextX, startfloorX1, endfloorX1);
addChunkToGlobal(conePositions, conePositions1, nextX, startfloorX1, endfloorX1);
addChunkToGlobal(wallPositions, wallPositions1, nextX, startfloorX1, endfloorX1);
addChunkToGlobal(rampPositions, rampPositions1, nextX, startfloorX1, endfloorX1);
nextX = addChunkToGlobal(invPositions, invPositions1, nextX, startfloorX1, endfloorX1) + 4;

//###########################################################################

addChunkToGlobal(floorPositions, floorPositions2, nextX, startfloorX2, endfloorX2);
addChunkToGlobal(APTPositions, APTPositions2, nextX, startfloorX2, endfloorX2);


const weatherZones2 = [
    {
        type: 'RAIN',
        position: { x: 60 + nextX - startfloorX2, y: 5, z: 0 },
        size: { x: 10, y: 10, z: 10 }
    },

];
const trafficPositions2 = [{ x: -4 + nextX - startfloorX2, y: 0, z: 0 }];


const globalStepPosition21 = [];
const globalbigWallPosition21 = [];
const globalStepPosition22 = [];
const globalbigWallPosition22 = [];
addChunkToGlobal(globalStepPosition21, stepPositions21, nextX, startfloorX2, endfloorX2);
addChunkToGlobal(globalbigWallPosition21, bigWallPosition21, nextX, startfloorX2, endfloorX2);
addChunkToGlobal(globalStepPosition22, stepPositions22, nextX, startfloorX2, endfloorX2);
addChunkToGlobal(globalbigWallPosition22, bigWallPosition22, nextX, startfloorX2, endfloorX2);
addChunkToGlobal(conePositions, conePositions2, nextX, startfloorX2, endfloorX2);
addChunkToGlobal(wallPositions, wallPositions2, nextX, startfloorX2, endfloorX2);
addChunkToGlobal(invPositions, invPositions2, nextX, startfloorX2, endfloorX2)
nextX = addChunkToGlobal(rampPositions, rampPositions2, nextX, startfloorX2, endfloorX2) + 4;

//###########################################################################
const trafficPositions3 = [{ x: 45 + nextX - startfloorX3, y: 0, z: 0 }];

addChunkToGlobal(floorPositions, floorPositions3, nextX, startfloorX3, endfloorX3);
addChunkToGlobal(APTPositions, APTPositions3, nextX, startfloorX3, endfloorX3);

const weatherZones3 = [
    {
        type: 'RAIN',
        position: { x: 34 + nextX - startfloorX3, y: 5, z: 0 },
        size: { x: 10, y: 10, z: 10 }
    },
    {
        type: 'SNOW',
        position: { x: 57 + nextX - startfloorX3, y: 5, z: 0 },
        size: { x: 10, y: 10, z: 10 }
    }
];

const globalStepPosition31 = [];
const globalbigWallPosition31 = [];
const globalStepPosition32 = [];
const globalbigWallPosition32 = [];
addChunkToGlobal(globalStepPosition31, stepPositions31, nextX, startfloorX3, endfloorX3);
addChunkToGlobal(globalbigWallPosition31, bigWallPosition31, nextX, startfloorX3, endfloorX3);
addChunkToGlobal(globalStepPosition32, stepPositions32, nextX, startfloorX3, endfloorX3);
addChunkToGlobal(globalbigWallPosition32, bigWallPosition32, nextX, startfloorX3, endfloorX3);
addChunkToGlobal(conePositions, conePositions3, nextX, startfloorX3, endfloorX3);
addChunkToGlobal(wallPositions, wallPositions3, nextX, startfloorX3, endfloorX3);
nextX = addChunkToGlobal(rampPositions, rampPositions3, nextX, startfloorX3, endfloorX3) + 4;

const rampSize = [...rampSize1, ...rampSizes2, ...rampSizes3];

const trafficPositions = [...trafficPositions1, ...trafficPositions2, ...trafficPositions3];
export const weatherZones = [...weatherZones1, ...weatherZones2, ...weatherZones3];






const startX = nextX-1; // 시작 X 좌표
const endX = nextX + 5;   // 끝 X 좌표
nextX = nextX + 8;
const startZ = -3; // 시작 Z 좌표
const endZ = 3;    // 끝 Z 좌표

for (let x = startX; x <= endX; x++) {
    for (let z = startZ; z <= endZ; z++) {
        sinkHolePositions.push({ x: x, y: 0, z: z });
    }
}

floorPositions.push({ x: nextX, y: 0, z: 0 });

floorPositions.push({ x: nextX + 4, y: 0, z: 0 });
const goalPosition = { x: nextX, y: 0.7, z: 0 };





