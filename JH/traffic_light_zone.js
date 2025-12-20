import * as THREE from 'three';

export async function traffic_light_zone(scene, loader, position, collider, isDebugging = false) {

    // traffic_light_zone에서의 상대적 위치 traffic_light
    const traffic_light_pos = new THREE.Vector3(3, 0, 0)


    const zoneGeometry = new THREE.BoxGeometry(4, 10, 10);
    let zoneMaterial;
    if (isDebugging) {
        zoneMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 1 // 투명도 설정
        });
    }
    else {
        zoneMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0 // 투명도 설정
        });
    }

    const zoneMesh = new THREE.Mesh(zoneGeometry, zoneMaterial);
    zoneMesh.position.set(position.x, position.y, position.z);
    zoneMesh.userData = {
        collisionHandler: traffic_light_zone_handler
    }
    zoneMesh.geometry.computeBoundingBox();
    zoneMesh.bbox = new THREE.Box3().setFromObject(zoneMesh);
    zoneMesh.userData.type = "traffic_zone";

    const trafficLight = await loadTrafficLight(loader);
    trafficLight.position.set(position.x, position.y, position.z);
    trafficLight.position.add(traffic_light_pos)

    scene.add(zoneMesh)
    scene.add(trafficLight)
    collider.push(zoneMesh)
}

function traffic_light_zone_handler(player, playerRadius, zone, isOrtho) {
    if (isOrtho) return;
    const zoneBox = zone.bbox;
    const playerMax = {
        x: player.position.x + playerRadius,
        y: player.position.y + playerRadius,
        z: player.position.z + playerRadius
    }
    const playerMin = {
        x: player.position.x - playerRadius,
        y: player.position.y - playerRadius,
        z: player.position.z - playerRadius
    }

    const oMin = zoneBox.min;
    const oMax = zoneBox.max;

    const overlapX = playerMax.x > oMin.x && playerMin.x < oMax.x;
    const overlapY = playerMax.y > oMin.y && playerMin.y < oMax.y;
    const overlapZ = playerMax.z > oMin.z && playerMax.z < oMax.z;

    if (overlapX && overlapY && overlapZ) {
        const depthX_Left = playerMax.x - oMin.x;
        const depthX_Right = oMax.x - playerMin.x;
        const depthY_Bottom = playerMax.y - oMin.y;
        const depthY_Top = oMax.y - playerMin.y;
        const depthZ_Back = playerMax.z - oMin.z;
        const depthZ_Front = oMax.z - playerMax.z;

        const minX = Math.min(depthX_Left, depthX_Right);
        const minY = Math.min(depthY_Bottom, depthY_Top);
        const minZ = Math.min(depthZ_Back, depthZ_Front);

        const minOverlap = Math.min(minX, minY, minZ);

        if (minOverlap === minY) {
            if (depthY_Top < depthY_Bottom) {
                player.position.y = oMax.y + playerRadius;
            } else {
                player.position.y = oMin.y - playerRadius;
            }
        } else if (minOverlap === minX) {
            if (depthX_Left < depthX_Right) {
                player.position.x = oMin.x - playerRadius;
            } else {
                player.position.x = oMax.x + playerRadius;
            }
        } else if (minOverlap === minZ) {
            if (depthZ_Back < depthZ_Front) {
                player.position.z = oMin.z - playerRadius;
            } else {
                player.position.z = oMax.z + playerRadius;
            }
        }
    }
}

async function loadTrafficLight(loader) {
    // 1. 비동기로 로드
    const gltf = await loader.loadAsync('../assets/trafficLight2.glb');
    const model = gltf.scene;

    // 2. 모델 기본 설정 (회전, 크기 등 모델 고유의 특성)
    model.scale.set(0.3, 0.3, 0.3);
    model.rotation.y = -Math.PI;

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

