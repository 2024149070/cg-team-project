import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { floors, obstacles, goal, pillarPositions, pillars, ice, steps, bigwalls, smallfloors } from './map.js';

// --- 전역 변수 설정 ---
const scene = new THREE.Scene();
const loader = new GLTFLoader();
const aspect = window.innerWidth / window.innerHeight;

let character = null;
let snowFloor = null;

// 카메라 설정
const perspCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
const frusSize = 5.8;
const orthoCamera = new THREE.OrthographicCamera(
    -frusSize * aspect / 2,
    frusSize * aspect / 2,
    frusSize / 2,
    -frusSize / 2,
    0.1, 1000
);
const DEFAULT_SPEED = 0.1;
const SLOW_SPEED = 0.05; // 비 구역에서 50% 속도로 감소

const ORTHO_Z = 5.5;
const ORTHO_Y = 0;

let camera = orthoCamera;
camera.position.set(4, ORTHO_Y, ORTHO_Z);
camera.lookAt(4, 0, 0);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(new THREE.Color(0xb8f8fd));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0);
directionalLight.position.set(0, 40, 60);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0xaaaaaa);
scene.add(ambientLight);

// 게임 상태 변수
let isOrtho = true;
let isGameOver = false;
let gameOverReason = "";
let isTransitioning = false;
let transitionAlpha = 0;

const keys = {
    up: false,
    down: false,
    left: false,
    right: false
};

const weatherSystems = []; 
const WEATHER_CONFIG = {
    RAIN: {
        startX: 15, endX: 25, 
        color: 0x0000ff, size: 0.4, 
        texture: './assets/textures/raindrop-3.png', // 비 텍스처
        count: 1000, 
        fallSpeed: 0.3, windSpeed: 0.1, wiggle: false,
        blending: THREE.AdditiveBlending
    },
    SNOW: {
        startX: 45, endX: 55, 
        color: 0xffffff, size: 0.7, 
        texture: getSnowTexture(),
        count: 1000, 
        fallSpeed: 0.05, windSpeed: 0.02, wiggle: true,
        blending: THREE.NormalBlending
    }
};

// 카메라 뷰 설정값
const VIEW_CONFIG = {
    SIDE: { offsetX: 0, offsetY: 0, offsetZ: 100, fov: 3.3 },
    TPS: { offsetX: -6, offsetY: 3, offsetZ: 0, fov: 60 }
};

function lerp(a, b, t) {
    return a + (b - a) * t;
}

let velocity = new THREE.Vector3(1, 0, 0);
let momentumX = 0;
let momentumZ = 0;
const GRAVITY = -0.01;
const JUMP_POWER = 0.2;
let isGrounded = true;

// 맵 엔티티 추가
floors.forEach(floor => { scene.add(floor); });
obstacles.forEach(obstacle => { scene.add(obstacle); });
scene.add(goal);


///// 아파트 추가 /////
const gltfLoader = new GLTFLoader();

gltfLoader.load(
    './apartment.glb',
    (gltf) => {
        const template = gltf.scene;
        template.scale.set(1, 1, 1);

        template.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });

        pillarPositions.forEach((pos) => {
            const apartment = template.clone(true);

            apartment.position.set(pos.x, pos.y, pos.z);
            apartment.userData.originalZ = apartment.position.z;
            apartment.bbox = new THREE.Box3().setFromObject(apartment);

            scene.add(apartment);
            pillars.push(apartment);
            obstacles.push(apartment);
        });
    },
    undefined,
    (err) => {
        console.error('apartment.glb 로드 실패: ', err);
    }
);


// =========================================================
// 초기화 함수 (async/await 사용)
// =========================================================
async function init() {
    try {
        console.log("캐릭터 로딩 중...");

        weatherSystems.push(createWeatherSystem(WEATHER_CONFIG.RAIN));
        weatherSystems.push(createWeatherSystem(WEATHER_CONFIG.SNOW));

        const snowZoneStart = WEATHER_CONFIG.SNOW.startX;
        const snowZoneEnd = WEATHER_CONFIG.SNOW.endX;
        const zoneWidth = snowZoneEnd - snowZoneStart;
        const centerX = (snowZoneStart + snowZoneEnd) / 2;

        const snowGeo = new THREE.BoxGeometry(zoneWidth, 0.05, 10); 

        const snowMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 1.0,
            metalness: 0.0,
            transparent: true,
            opacity: 0
        });

        snowFloor = new THREE.Mesh(snowGeo, snowMat);

        snowFloor.position.set(centerX, 0.285, 0); 
        snowFloor.receiveShadow = true;

        scene.add(snowFloor);
        
        // loadAsync를 사용하여 로딩이 끝날 때까지 대기
        const gltf = await loader.loadAsync('./assets/Character.glb');
        character = gltf.scene;

        // 캐릭터 초기 위치 및 설정
        character.position.set(4, 1.5, 0); 
        
        // 모델 방향이 맞지 않다면 여기서 회전 (필요에 따라 조절)
        character.rotation.y = Math.PI / 2; // 예: 90도 회전

        // 그림자 설정
        character.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(character);
        console.log("로딩 완료! 게임 시작");

        // 로딩이 완료된 후에 렌더 루프 시작
        render();

    } catch (error) {
        console.error("모델 로딩 실패:", error);
        alert("캐릭터 모델을 불러오지 못했습니다.");
    }
}

// =========================================================
// 이벤트 리스너
// =========================================================
function switchCamera() {
    if (isTransitioning) return;
    
    isOrtho = !isOrtho;
    isTransitioning = true;
    transitionAlpha = 0;

    camera = perspCamera;
    camera.updateProjectionMatrix();
}

window.addEventListener('keydown', function (event) {
    if (!character) return; // 캐릭터 로딩이 끝나지 않으면 return

    if (isGameOver && event.key === 'Enter') {
        resetGame();
        return;
    }
    if (isTransitioning) return;
    
    if (event.key === 'ArrowUp') keys.up = true;
    if (event.key === 'ArrowDown') keys.down = true;
    if (event.key === 'ArrowLeft') keys.left = true;
    if (event.key === 'ArrowRight') keys.right = true;
    
    if (event.key === 'Tab') {
        event.preventDefault();
        switchCamera();
    }
    if (event.code === 'Space') {
        if (isGrounded) {
            velocity.y = JUMP_POWER;
            isGrounded = false;
        }
    }
});

window.addEventListener('keyup', function (event) {
    if (event.key === 'ArrowUp') keys.up = false;
    if (event.key === 'ArrowDown') keys.down = false;
    if (event.key === 'ArrowLeft') keys.left = false;
    if (event.key === 'ArrowRight') keys.right = false;
});

window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    perspCamera.aspect = aspect;
    perspCamera.updateProjectionMatrix();
    orthoCamera.left = -frusSize * aspect / 2;
    orthoCamera.right = frusSize * aspect / 2;
    orthoCamera.top = frusSize / 2;
    orthoCamera.bottom = -frusSize / 2;
    orthoCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
// =========================================================
// 날씨 로직
// =========================================================
function getSnowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;

    const context = canvas.getContext('2d');
    
    // 그라데이션: 중심(흰색) -> 외곽(투명한 흰색)
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)'); 
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)'); 

    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

function createWeatherSystem(config) {
    let texture;

    if (typeof config.texture === 'string') {
        texture = new THREE.TextureLoader().load(config.texture); // Rain
    } else {
        texture = config.texture; // Snow
    }

    const geom = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];

    const material = new THREE.PointsMaterial({
        size: config.size,
        transparent: true,
        opacity: 0, 
        map: texture,
        blending: config.blending || THREE.NormalBlending, 
        sizeAttenuation: true,
        color: config.color,
        depthWrite: false // 투명한 파티클끼리 겹칠 때 이상하게 보이는 현상 방지
    });

    const rangeX = 10;
    const rangeY = 20;

    for (let i = 0; i < config.count; i++) {
        positions.push(
            Math.random() * rangeX + config.startX,
            Math.random() * rangeY,
            -5 + (10 * i / config.count)
        );

        // 속도 설정 (Rain은 빠르고 일정, Snow는 느리고 랜덤성)
        velocities.push(
            (Math.random() - 0.5) * config.windSpeed, // X축 흔들림/바람
            config.fallSpeed + Math.random() * (config.fallSpeed * 0.5) // Y축 낙하 속도
        );
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 2));

    const mesh = new THREE.Points(geom, material);
    mesh.sortParticles = true;
    scene.add(mesh);

    const update = (characterX) => {
        // 1. 투명도 계산 (페이드 인/아웃)
        // startX ~ endX 구간에서 가장 밝고, 경계에서 서서히 사라짐
        const fadePadding = 5.0; // 여유 구간
        const center = (config.startX + config.endX) / 2;
        const width = config.endX - config.startX;
        
        // 간단한 거리 기반 투명도 계산
        let dist = Math.abs(characterX - center);
        let intensity = 1 - (dist / (width / 2 + fadePadding));
        
        // Clamp 0~1
        if (intensity < 0) intensity = 0;
        if (intensity > 1) intensity = 1;

        mesh.material.opacity = intensity;

        // 2. 파티클 움직임 (투명도가 0보다 클 때만)
        if (intensity > 0) {
            const pos = mesh.geometry.attributes.position.array;
            const vel = mesh.geometry.attributes.velocity.array;

            for (let i = 0; i < config.count; i++) {
                // Y축 이동 (낙하)
                pos[i * 3 + 1] -= vel[i * 2 + 1];

                // X축 이동 (눈은 흔들거림 추가)
                if (config.wiggle) {
                    // sin 함수를 이용해 좌우로 흔들리는 효과
                    pos[i * 3] -= Math.sin(Date.now() * 0.001 + i) * 0.02; 
                } else {
                    // 비는 그냥 바람대로 이동
                    pos[i * 3] -= vel[i * 2]; 
                }

                // 바닥 리셋 로직
                if (pos[i * 3 + 1] < -5) { // 바닥 아래로 떨어지면
                    pos[i * 3 + 1] = 15; // 위로 올림
                    // X 위치도 랜덤하게 재배치 (카메라 따라다니는 느낌 원하면 characterX 활용)
                    pos[i * 3] = config.startX - 10 + Math.random() * 20; 
                }
            }
            mesh.geometry.attributes.position.needsUpdate = true;
        }
    };

    return { mesh, update };
}

// =========================================================
// 충돌, 카메라
// =========================================================
function updatePhysics() {
    if (isTransitioning || !character) return; // character 체크 추가

    const snowConfig = WEATHER_CONFIG.SNOW;
    const isOnSnow = character.position.x >= snowConfig.startX && 
                     character.position.x <= snowConfig.endX;

    let inputDirX = 0;
    let inputDirZ = 0;
    
    if (isOrtho) {
        if (keys.left) inputDirX = -1;
        if (keys.right) inputDirX = 1;
        
        inputDirZ = 0;
        
        if (character.position.z !== 0) {
            character.position.z = lerp(character.position.z, 0, 0.2);
            momentumZ = 0; // Ortho에서는 Z축 관성 제거
        }
    } else {
        // Perspective 모드일 때는 Up/Down이 X축 이동
        if (keys.up) inputDirX = 1;
        if (keys.down) inputDirX = -1;
        if (keys.left) inputDirZ = -1;
        if (keys.right) inputDirZ = 1;
    }

    let accel, friction, maxSpeed;

    if (isOnSnow) {
        // [눈 구역]: 낮은 마찰력, 서서히 가속
        accel = 0.005;      // 가속도 (작을수록 미끄러움)
        friction = 0.96;    // 마찰 계수 (1에 가까울수록 안 멈추고 계속 미끄러짐)
        maxSpeed = 0.15;    // 최대 속도
    } else {
        // [일반 구역]: 즉각 반응 (비 구역 감속 로직 포함)
        const isRainZone = character.position.x >= WEATHER_CONFIG.RAIN.startX && 
                           character.position.x <= WEATHER_CONFIG.RAIN.endX;
        
        accel = 0.1;        // 즉시 가속
        friction = 0.0;     // 즉시 정지 (관성 없음)
        maxSpeed = isRainZone ? SLOW_SPEED : DEFAULT_SPEED;
    }

    // 물리 연산 함수 (축 별로 중복되는 로직을 함수화)
    const updateMomentum = (currentMomentum, inputDir) => {
        if (inputDir !== 0) {
            // 키 누름: 가속
            currentMomentum += inputDir * accel;
        } else {
            // 키 뗌: 마찰력으로 감속
            currentMomentum *= friction;
            if (Math.abs(currentMomentum) < 0.001) currentMomentum = 0;
        }
        
        // 최대 속도 제한
        if (currentMomentum > maxSpeed) currentMomentum = maxSpeed;
        if (currentMomentum < -maxSpeed) currentMomentum = -maxSpeed;
        
        return currentMomentum;
    };

    // 5. 관성 업데이트 및 위치 적용
    momentumX = updateMomentum(momentumX, inputDirX);
    character.position.x += momentumX;

    // Ortho 모드가 아닐 때만 Z축 물리 적용
    if (!isOrtho) {
        momentumZ = updateMomentum(momentumZ, inputDirZ);
        character.position.z += momentumZ;
    }

    // 캐릭터 회전
    const LERP_FACTOR = 0.1;
    const ANGLE_CENTER = Math.PI / 2;
    const ANGLE_LEFT = Math.PI * 3 / 4;
    const ANGLE_RIGHT = Math.PI / 4;

    let targetRotation = ANGLE_CENTER;

    if (!isOrtho) {
        if (keys.left) {
            targetRotation = ANGLE_LEFT;
        } 
        if (keys.right) {
            targetRotation = ANGLE_RIGHT;
        }
        character.rotation.y += (targetRotation - character.rotation.y) * LERP_FACTOR;
    }

    velocity.y += GRAVITY;
    character.position.y += velocity.y;

    // 플레이어 정보 업데이트 (Bounding Box 계산용)
    // 캐릭터 메쉬 크기에 따라 playerRadius 값 조절이 필요할 수 있습니다.
    const playerRadius = 0.5; 

    const pMinX = character.position.x - playerRadius;
    const pMaxX = character.position.x + playerRadius;
    const pMinY = character.position.y - playerRadius; // 캐릭터의 중심점을 기준으로 계산
    const pMaxY = character.position.y + playerRadius;
    const pMinZ = character.position.z - playerRadius;
    const pMaxZ = character.position.z + playerRadius;

    isGrounded = false;

    for (const obstacle of obstacles) {
        const box = obstacle.bbox;
        const oMin = box.min;
        const oMax = box.max;

        const overlapX = pMaxX > oMin.x && pMinX < oMax.x;
        const overlapY = pMaxY > oMin.y && pMinY < oMax.y;
        
        let overlapZ = true;
        if (!isOrtho) {
            overlapZ = pMaxZ > oMin.z && pMinZ < oMax.z;
        }

        if (overlapX && overlapY && overlapZ) {
            const depthX_Left = pMaxX - oMin.x;
            const depthX_Right = oMax.x - pMinX;
            const depthY_Bottom = pMaxY - oMin.y;
            const depthY_Top = oMax.y - pMinY;
            const depthZ_Back = pMaxZ - oMin.z;
            const depthZ_Front = oMax.z - pMinZ;

            const minX = Math.min(depthX_Left, depthX_Right);
            const minY = Math.min(depthY_Bottom, depthY_Top);
            const minZ = isOrtho ? Infinity : Math.min(depthZ_Back, depthZ_Front);

            const minOverlap = Math.min(minX, minY, minZ);

            if (minOverlap === minY) {
                velocity.y = 0;
                if (depthY_Top < depthY_Bottom) {
                    character.position.y = oMax.y + playerRadius;
                    isGrounded = true;
                } else {
                    character.position.y = oMin.y - playerRadius;
                }
            } else if (minOverlap === minX) {
                if (depthX_Left < depthX_Right) {
                    character.position.x = oMin.x - playerRadius;
                } else {
                    character.position.x = oMax.x + playerRadius;
                }
            } else if (minOverlap === minZ) {
                if (depthZ_Back < depthZ_Front) {
                    character.position.z = oMin.z - playerRadius;
                } else {
                    character.position.z = oMax.z + playerRadius;
                }
            }
        }
    }

    if (!isGrounded) { 
        const playerBottomY = character.position.y - 0.5;
        const playerX = character.position.x;
        const playerZ = character.position.z;

        for (const floor of floors) {
            const box = floor.bbox;
            const min = box.min;
            const max = box.max;
            const inX = playerX >= min.x - 0.2 && playerX <= max.x + 0.2;
            let inZ = true;
            if (!isOrtho) {
                inZ = playerZ >= min.z - 0.1 && playerZ <= max.z + 0.1;
            }

            if (inX && inZ && velocity.y <= 0) {
                if (playerBottomY <= max.y && playerBottomY >= min.y - 0.5) {
                    isGrounded = true;
                    velocity.y = 0;
                    character.position.y = max.y + 0.5;
                    if (isOrtho) {
                        character.position.z = floor.position.z;
                    }
                    break;
                }
            }
        }
    }

    ///// 발판 색 바꾸기 /////
    let allPressed = (steps.length > 0);
    steps.forEach(step => {
        const box = step.bbox;
        const min = box.min;
        const max = box.max;

        // 발판(y) 위?
        const onY = Math.abs(playerBottomY - max.y) < 0.06;

        // x 범위 안?
        const onX =
        sphere.position.x >= min.x - playerRadius &&
        sphere.position.x <= max.x + playerRadius;

        // z 범위 안?
        let onZ = isOrtho ? true : (sphere.position.z >= min.z && sphere.position.z <= max.z);

        const onStep = onX && onY && onZ;

        if (onStep) {
            step.material.color.set(0x7CFC00);
        }
        else {
            step.material.color.copy(step.userData.originalColor);
        }

        if (!onStep) {
            allPressed = false;
        }
    });

    ///// 발판 밟으면 bigWall 위로 이동 /////
    const TARGET_WALL_INDEX = 0;
    if (allPressed && bigwalls.length > TARGET_WALL_INDEX) {
        const targetWall = bigwalls[TARGET_WALL_INDEX];
        if (!targetWall.userData.raised) {
            targetWall.position.y += 1.8;
            targetWall.userData.raised = true;

            targetWall.updateMatrixWorld();
            targetWall.geometry.computeBoundingBox();
            targetWall.bbox = new THREE.Box3().setFromObject(targetWall);

            // bigWall 이동과 함께 작은 바닥 등장 (y좌표 이동)
            const smallFloorConfigs = [
                { index: 0, y: 0}, { index: 1, y: 1.5}, { index: 2, y: 0},
            ];

            smallFloorConfigs.forEach(cfg => {
                const sf = smallfloors[cfg.index];
                if (sf && !sf.userData.activated) {
                    sf.position.y = cfg.y;
                    sf.userData.activated = true;

                    scene.add(sf);
                    floors.push(sf);

                    sf.updateMatrixWorld();
                    sf.geometry.computeBoundingBox();
                    sf.bbox = new THREE.Box3().setFromObject(sf);
                }
            });
        }
    }
    

    if (character.position.y < -10) {
        isGameOver = true;
        gameOverReason = "발을 헛디뎠습니다!";
    }
}

function updateCamera() {
    if (!character) return; // character 체크 추가

    if (isTransitioning) {
        transitionAlpha += 0.03;
        if (transitionAlpha >= 1) {
            transitionAlpha = 1;
            isTransitioning = false;
            
            if (isOrtho) {
                camera = orthoCamera;
                camera.position.set(character.position.x, ORTHO_Y, ORTHO_Z);
                camera.lookAt(character.position.x, 0, 0);
                return;
            }
        }
    }

    if (camera === perspCamera) {
        const t = transitionAlpha < 0.5 
            ? 2 * transitionAlpha * transitionAlpha 
            : 1 - Math.pow(-2 * transitionAlpha + 2, 2) / 2;

        let ratio = isOrtho ? (1 - t) : t;

        const sideX = character.position.x + VIEW_CONFIG.SIDE.offsetX;
        const sideY = VIEW_CONFIG.SIDE.offsetY;
        const sideZ = VIEW_CONFIG.SIDE.offsetZ;

        const tpsX = character.position.x + VIEW_CONFIG.TPS.offsetX;
        const tpsY = character.position.y + VIEW_CONFIG.TPS.offsetY;
        const tpsZ = character.position.z + VIEW_CONFIG.TPS.offsetZ;

        camera.position.x = lerp(sideX, tpsX, ratio);
        camera.position.y = lerp(sideY, tpsY, ratio);
        camera.position.z = lerp(sideZ, tpsZ, ratio);

        camera.fov = lerp(VIEW_CONFIG.SIDE.fov, VIEW_CONFIG.TPS.fov, ratio);
        camera.updateProjectionMatrix();

        const lookSideX = character.position.x;
        const lookSideY = 0;
        const lookSideZ = 0;

        const lookTpsX = character.position.x + 2;
        const lookTpsY = character.position.y;
        const lookTpsZ = character.position.z;

        const currentLookX = lerp(lookSideX, lookTpsX, ratio);
        const currentLookY = lerp(lookSideY, lookTpsY, ratio);
        const currentLookZ = lerp(lookSideZ, lookTpsZ, ratio);

        camera.lookAt(currentLookX, currentLookY, currentLookZ);
    } else {
        camera.position.x = character.position.x;
    }
}

function render() {
    // character가 로드된 이후에만 로직 실행
    if (!character) {
        // 아직 로딩중이라면 렌더만 돌리고 리턴할 수도 있음
        // 하지만 여기서는 init()에서 완료 후 호출하므로 이 조건문은 안전장치임
        return; 
    }

    if (isGameOver) {
        alert("Game Over: " + gameOverReason + "\n\n재시작하려면 Enter 키를 누르세요.");
        resetGame();
        requestAnimationFrame(render);
        return;
    }

    // 도착 판정 (sphere -> character)
    if (Math.abs(character.position.x - goal.position.x) < 0.5 &&
        Math.abs(character.position.y - goal.position.y) < 1 &&
        Math.abs(character.position.z - goal.position.z) < 1) {
        alert("도착했습니다!");
        return;
    }

    updatePhysics();
    updateCamera();

    weatherSystems.forEach(system => {
        system.update(character.position.x);
    });
    
    if (snowFloor) {
        const config = WEATHER_CONFIG.SNOW;
        const fadePadding = 5.0; // 파티클과 동일한 여유 구간
        const center = (config.startX + config.endX) / 2;
        const width = config.endX - config.startX;

        // 캐릭터와 눈 구역 중심 사이의 거리 계산
        let dist = Math.abs(character.position.x - center);
        
        // 거리에 따른 투명도 계산 (가까울수록 1, 멀어질수록 0)
        let intensity = 1 - (dist / (width / 2 + fadePadding));

        if (intensity < 0) intensity = 0;
        if (intensity > 1) intensity = 1;
        
        snowFloor.material.opacity = Math.max(snowFloor.material.opacity, intensity);
    }

    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

function resetGame() {
    if (!character) return;

    isGameOver = false;
    gameOverReason = "";
    isTransitioning = false;
    
    isOrtho = true;
    camera = orthoCamera;
    
    camera.position.set(4, ORTHO_Y, ORTHO_Z);
    camera.lookAt(4, 0, 0);

    character.position.set(4, 1.5, 0);
    velocity.set(0.03, 0, 0);
}

init();