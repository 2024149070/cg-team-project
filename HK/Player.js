import * as THREE from 'three';
import { CONFIG } from './config.js';
import { lerp } from './utils.js';
import { CollisionHandlers } from './CollisionManager.js';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.momentumX = 0;
        this.momentumZ = 0;
        this.isGrounded = true;
        this.playerRadius = CONFIG.PHYSICS.PLAYER_RADIUS;
        this.bbox = new THREE.Box3();
        this.isFinished = false; // Flag for game completion
    }

    setMesh(mesh) {
        this.mesh = mesh;
        this.mesh.position.set(-8, 1.5, 0);
        this.mesh.rotation.y = Math.PI / 2;

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Attach callbacks for CollisionManager
        this.mesh.userData.land = (object, isOrtho) => {
            this.isGrounded = true;
            this.velocity.y = 0;
            // You might want to store 'isOnObstacle' if needed for other logic
            this.isOnObstacle = true;
            if (isOrtho) {
                this.mesh.position.z = object.position.z;
            }
        };

        this.mesh.userData.finish = () => {
            this.isFinished = true;
        };

        // Initialize bbox
        this.bbox.setFromObject(this.mesh);
        this.mesh.bbox = this.bbox;

        this.scene.add(this.mesh);
    }

    update(inputManager, isOrtho, colliders, weatherZones, isTransitioning) {
        if (!this.mesh) return;
        if (isTransitioning) return false;

        this.handleMovement(inputManager, isOrtho, weatherZones);
        this.applyGravity();

        // Update Bounding Box once per frame
        this.bbox.setFromObject(this.mesh);

        this.checkCollisions(colliders, isOrtho);

        // Check for fall
        if (this.mesh.position.y < -10) {
            return true; // isGameOver (Dead)
        }
        return false;
    }

    handleMovement(inputManager, isOrtho, weatherZones) {
        let isOnSnow = false;
        let isRainZone = false;

        // Check if player is inside any weather zone
        if (weatherZones) {
            const playerPos = this.mesh.position;

            weatherZones.forEach(zone => {
                // Using simple box check, assuming zones are axis-aligned boxes
                const halfWidth = zone.size.x / 2;
                const halfHeight = zone.size.y / 2;
                const halfDepth = zone.size.z / 2;

                const minX = zone.position.x - halfWidth;
                const maxX = zone.position.x + halfWidth;
                const minY = zone.position.y - halfHeight;
                const maxY = zone.position.y + halfHeight;
                const minZ = zone.position.z - halfDepth;
                const maxZ = zone.position.z + halfDepth;

                if (playerPos.x >= minX && playerPos.x <= maxX &&
                    playerPos.y >= minY && playerPos.y <= maxY &&
                    playerPos.z >= minZ && playerPos.z <= maxZ) {

                    if (zone.type === 'SNOW') isOnSnow = true;
                    if (zone.type === 'RAIN') isRainZone = true;
                }
            });
        }

        let inputDirX = 0;
        let inputDirZ = 0;

        if (isOrtho) {
            if (inputManager.keys.left) inputDirX = -1;
            if (inputManager.keys.right) inputDirX = 1;

            if (this.mesh.position.z !== 0 && !this.isOnObstacle) {
                this.mesh.position.z = lerp(this.mesh.position.z, 0, 0.2);
                this.momentumZ = 0;
            }
        } else {
            if (inputManager.keys.up) inputDirX = 1;
            if (inputManager.keys.down) inputDirX = -1;
            if (inputManager.keys.left) inputDirZ = -1;
            if (inputManager.keys.right) inputDirZ = 1;
        }

        // Jump
        if (inputManager.keys.space && this.isGrounded) {
            this.velocity.y = CONFIG.PHYSICS.JUMP_POWER;
            this.isGrounded = false;
            this.isOnObstacle = false; // Left ground
        }

        let accel, friction, maxSpeed;

        if (isOnSnow) {
            accel = CONFIG.SPEED.SNOW_ACCEL;
            friction = CONFIG.SPEED.SNOW_FRICTION;
            maxSpeed = CONFIG.SPEED.MAX;
        } else {
            accel = CONFIG.SPEED.ACCEL;
            friction = CONFIG.SPEED.FRICTION;
            maxSpeed = isRainZone ? CONFIG.SPEED.SLOW : CONFIG.SPEED.DEFAULT;
        }

        this.momentumX = this.updateMomentum(this.momentumX, inputDirX, accel, friction, maxSpeed);
        this.mesh.position.x += this.momentumX;

        if (!isOrtho) {
            this.momentumZ = this.updateMomentum(this.momentumZ, inputDirZ, accel, friction, maxSpeed);
            this.mesh.position.z += this.momentumZ;
            this.updateRotation(inputManager);
        }
    }

    updateMomentum(currentMomentum, inputDir, accel, friction, maxSpeed) {
        if (inputDir !== 0) {
            currentMomentum += inputDir * accel;
        } else {
            currentMomentum *= friction;
            if (Math.abs(currentMomentum) < 0.001) currentMomentum = 0;
        }

        if (currentMomentum > maxSpeed) currentMomentum = maxSpeed;
        if (currentMomentum < -maxSpeed) currentMomentum = -maxSpeed;

        return currentMomentum;
    }

    updateRotation(inputManager) {
        const LERP_FACTOR = 0.1;
        const ANGLE_CENTER = Math.PI / 2;
        const ANGLE_LEFT = Math.PI * 3 / 4;
        const ANGLE_RIGHT = Math.PI / 4;

        let targetRotation = ANGLE_CENTER;

        if (inputManager.keys.left) {
            targetRotation = ANGLE_LEFT;
        }
        if (inputManager.keys.right) {
            targetRotation = ANGLE_RIGHT;
        }
        this.mesh.rotation.y += (targetRotation - this.mesh.rotation.y) * LERP_FACTOR;
    }

    applyGravity() {
        this.velocity.y += CONFIG.PHYSICS.GRAVITY;
        this.mesh.position.y += this.velocity.y;
    }

    checkCollisions(colliders, isOrtho) {
        // Reset grounded state tentatively (will be set to true if collision handler says so)
        // Wait, typical physic engines reset grounded then check collision. 
        // Our 'land' callback sets isGrounded = true.
        // So we should assume not grounded unless 'land' is called this frame?
        // Or maintain state? 
        // If we don't reset, we might stay grounded forever.
        // But if we reset, we might jitter. 
        // Usually: apply gravity -> assume air. Check collision -> if hit floor -> land.
        this.isGrounded = false;
        // this.isOnObstacle = false; // Can optionally reset this too

        const pBox = this.bbox;

        for (const object of colliders) {
            const oBox = object.bbox;
            if (!oBox) continue;

            const overlapX = pBox.max.x > oBox.min.x && pBox.min.x < oBox.max.x;
            const overlapY = pBox.max.y > oBox.min.y && pBox.min.y < oBox.max.y;
            let overlapZ = true;
            if (!isOrtho) {
                overlapZ = pBox.max.z > oBox.min.z && pBox.min.z < oBox.max.z;
            }

            const isCollision = overlapX && overlapY && overlapZ;

            const type = object.userData.type;
            if (CollisionHandlers[type]) {
                CollisionHandlers[type](this.mesh, object, isOrtho, isCollision);
            }
        }
    }
}
