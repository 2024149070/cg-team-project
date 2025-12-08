import * as THREE from 'https://unpkg.com/three@0.159.0/build/three.module.js';

const floorPositions = [
    { x: 4, y: 0, z: 0 }, { x: 8, y: 0, z: 0 }, { x: 12, y: 0, z: 0 },
    { x: 16, y: 0, z: 0 }, { x: 20, y: 0, z: 0 }, { x: 24, y: 0, z: 0 },
    { x: 28, y: 0, z: 0 }, { x: 32, y: 0, z: -20 }, { x: 36, y: 0, z: -20 },
    { x: 40, y: 0, z: 0 }, { x: 44, y: 0, z: 0 }, { x: 48, y: 0, z: 0 },
    { x: 52, y: 0, z: 0 }, { x: 56, y: 0, z: 0 }, { x: 60, y: 0, z: 0 },
    { x: 64, y: 0, z: 0 }, { x: 68, y: 0, z: 0 }, { x: 72, y: 0, z: 0 },
    { x: 76, y: 0, z: 0 }, { x: 80, y: 0, z: 0 }, { x: 84, y: 0, z: 0 }
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
    //scene.add(floor);
    floors.push(floor);
});

const obstacles = [];

const pillarPositions = [
    { x: 6, y: 2.5, z: -3 }, { x: 10, y: 2.5, z: 2 }
];

const pillarGeometry = new THREE.BoxGeometry(1, 5, 1);
const pillarMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5dc });
const pillars = [];

pillarPositions.forEach(pos => {
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    pillar.position.set(pos.x, pos.y, pos.z);
    pillar.userData.originalZ = pillar.position.z;
    pillar.geometry.computeBoundingBox();
    pillar.bbox = new THREE.Box3().setFromObject(pillar);
    //scene.add(pillar);
    pillars.push(pillar);
    obstacles.push(pillar);
});

const wallPositions = [
    { x: 65, y: 1, z: 0 }
];

const wallGeometry = new THREE.BoxGeometry(1, 1.5, 10); 
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

const goalGeometry = new THREE.IcosahedronGeometry(0.5, 0);
const goalMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
const goal = new THREE.Mesh(goalGeometry, goalMaterial);
goal.position.set(80, 0.7, 0);
//scene.add(goal);

export { floors, pillars, walls, obstacles, goal };