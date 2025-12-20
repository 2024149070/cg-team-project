import * as THREE from 'three';

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

const floorGeometry = new THREE.BoxGeometry(4, 0.5, 10);
const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x964b00 });
const floors = [];

floorPositions.forEach(pos => {
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.set(pos.x, pos.y, pos.z);
    floor.userData.originalZ = floor.position.z;
    floor.geometry.computeBoundingBox();
    floor.bbox = new THREE.Box3().setFromObject(floor);
    floors.push(floor);
});

const weatherFloors = [];
const weatherClouds = [];

const invisibleObstacles = [];

const obstacles = [];

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

const invGeometry = new THREE.BoxGeometry(2, 0.5, 2);
const invMaterial = new THREE.MeshLambertMaterial({
    color: 0xa8b2d2,
    transparent: true,
    opacity: 0.0
});

invPositions.forEach(pos => {
    const material = invMaterial.clone();
    const inv = new THREE.Mesh(invGeometry, material);
    inv.position.set(pos.x, pos.y, pos.z);
    inv.userData.originalZ = inv.position.z;
    inv.geometry.computeBoundingBox();
    inv.bbox = new THREE.Box3().setFromObject(inv);
    obstacles.push(inv);
    invisibleObstacles.push(inv);
});

const conePositions = [];
for (let i = 0; i < 16; i++) {
    conePositions.push({
        x: 75 + Math.random() * 10,
        y: 0.4, // Adjusted for smaller scale
        z: -5 + Math.random() * 10
    });
}

const pillarPositions = [
    { x: -2, y: 4, z: 0 }, { x: 6, y: 4, z: -3 }, { x: 10, y: 4, z: 2 },

    { x: 8, y: 4, z: -17 }, { x: 12, y: 4, z: -14 }
];

const pillars = [];

const wallPositions = [
    { x: 15, y: 1.5, z: 0 }, { x: 40, y: 1.5, z: -15 }
];

const wallGeometry = new THREE.BoxGeometry(1, 3, 10);
const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xa8b2d2b });
const walls = [];

wallPositions.forEach(pos => {
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(pos.x, pos.y, pos.z);
    wall.userData.originalZ = wall.position.z;
    wall.geometry.computeBoundingBox();
    wall.bbox = new THREE.Box3().setFromObject(wall);
    //scene.add(wall);
    walls.push(wall);
    obstacles.push(wall);
});


///// 큰 벽 추가 /////
const bigWallPositions = [
    { x: 37, y: 2.5, z: 0 }
];

const bigWallGeometry = new THREE.BoxGeometry(1, 5, 10);
const bigWallMaterial = new THREE.MeshLambertMaterial({ color: 0xa8b2d2 });
const bigwalls = [];

bigWallPositions.forEach(pos => {
    const bigwall = new THREE.Mesh(bigWallGeometry, bigWallMaterial);
    bigwall.position.set(pos.x, pos.y, pos.z);
    bigwall.userData.originalZ = bigwall.position.z;
    bigwall.userData.raised = false; // 발판 밟았을 때 벽 이동 한 번만 하도록
    bigwall.geometry.computeBoundingBox();
    bigwall.bbox = new THREE.Box3().setFromObject(bigwall);
    bigwalls.push(bigwall);
    obstacles.push(bigwall);
});
//////////


///// 밟는 발판 추가 /////
const stepPositions = [
    { x: 33, y: 0.2, z: -2 }, { x: 34, y: 0.2, z: 3 }
]

const stepGeometry = new THREE.BoxGeometry(1, 0.2, 1);
const stepMaterial = new THREE.MeshLambertMaterial({ color: 0xffa500 });
const steps = [];

stepPositions.forEach(pos => {
    const material = stepMaterial.clone();
    const step = new THREE.Mesh(stepGeometry, material);
    step.position.set(pos.x, pos.y, pos.z);
    step.userData.originalZ = step.position.z;

    step.userData.originalColor = material.color.clone();
    step.geometry.computeBoundingBox();
    step.bbox = new THREE.Box3().setFromObject(step);
    steps.push(step);
    obstacles.push(step);
})
//////////////////////////////


const goalGeometry = new THREE.IcosahedronGeometry(0.5, 0);
const goalMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
const goal = new THREE.Mesh(goalGeometry, goalMaterial);
goal.position.set(100, 0.7, 0);

const weatherZones = [
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

async function initMap(scene, assetManager) {
    // Add static objects to scene
    floors.forEach(floor => scene.add(floor));
    obstacles.forEach(obstacle => scene.add(obstacle));
    scene.add(goal);

    // Load Apartments
    try {
        const gltf = await assetManager.loadGLTF('../assets/apartment.glb');
        const template = gltf.scene;
        template.scale.set(1, 1, 1);
        template.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });

        const box = new THREE.Box3().setFromObject(template);
        const bottomOffset = -box.min.y;

        pillarPositions.forEach((pos) => {
            const apartment = template.clone(true);
            apartment.position.set(pos.x, 0.25 + bottomOffset, pos.z);
            apartment.userData.originalZ = apartment.position.z;
            apartment.bbox = new THREE.Box3().setFromObject(apartment);

            scene.add(apartment);
            pillars.push(apartment);
            obstacles.push(apartment);
        });
    } catch (err) {
        console.error('Failed to load apartment:', err);
    }

    // Load Cones
    try {
        const gltf = await assetManager.loadGLTF('../assets/cone.glb');
        const template = gltf.scene;
        template.scale.set(0.5, 0.5, 0.5); // Reduced size to 1/2
        template.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });

        // Assume cone needs to sit on floor similar to apartment or just at y=0.5 (floor top) depending on origin
        const box = new THREE.Box3().setFromObject(template);
        const bottomOffset = -box.min.y;

        conePositions.forEach((pos) => {
            const cone = template.clone(true);
            const yPos = pos.y !== undefined ? pos.y : 0.25; // Target floor top is 0.25
            // Since we scaled, maybe need to re-adjust Y?
            // Let's rely on pos.y or recalculate if needed. If pos.y is 0.25, and bottomOffset handles local origin.
            // With scale 0.5, bottomOffset is likely smaller.
            // We'll trust the logic: scale first, then setFromObject gets scaled bounds. Correct.

            cone.position.set(pos.x, yPos + bottomOffset, pos.z);
            cone.userData.originalZ = cone.position.z;
            cone.bbox = new THREE.Box3().setFromObject(cone);

            scene.add(cone);
            // cones.push(cone); // cones array not defined/exported, pushing to obstacles is key
            obstacles.push(cone); // Add to obstacles for collision
        });
    } catch (err) {
        console.error('Failed to load cone:', err);
    }

    // Initialize Weather Visuals (Clouds, SnowFloor)
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
}


export { floors, pillars, walls, obstacles, goal, pillarPositions, steps, bigwalls, weatherZones, initMap, weatherFloors, weatherClouds, invisibleObstacles };

