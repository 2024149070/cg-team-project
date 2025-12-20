import * as THREE from 'three';
import { CONFIG } from './config.js';
import { lerp } from './utils.js';

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

        this.scene.add(this.mesh);
    }

    update(inputManager, isOrtho, obstacles, floors, steps, bigwalls, weatherZones) {
        if (!this.mesh) return;

        this.handleMovement(inputManager, isOrtho, weatherZones);
        this.applyGravity();

        // Update Bounding Box once per frame
        this.bbox.setFromObject(this.mesh);

        this.checkCollisions(obstacles, isOrtho);
        this.checkFloor(floors, isOrtho);
        this.checkSteps(steps, bigwalls, isOrtho);

        // Check for fall
        if (this.mesh.position.y < -10) {
            return true; // isGameOver
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
                const halfWidth = zone.size.x / 2;
                const halfHeight = zone.size.y / 2;
                const halfDepth = zone.size.z / 2;

                const minX = zone.position.x - halfWidth;
                const maxX = zone.position.x + halfWidth;
                const minY = zone.position.y - halfHeight;
                const maxY = zone.position.y + halfHeight;
                const minZ = zone.position.z - halfDepth;
                const maxZ = zone.position.z + halfDepth;

                // Check 3D bounds
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
        }

        let accel, friction, maxSpeed;

        if (isOnSnow) {
            accel = CONFIG.SPEED.SNOW_ACCEL;
            friction = CONFIG.SPEED.SNOW_FRICTION;
            maxSpeed = CONFIG.SPEED.MAX;
        } else {
            // Note: Logic priority. If both snow and rain? existing logic said else { check rain }. 
            // So Snow overrides Rain if overlapping? Or just mutually exclusive.
            // With zones we might overlap. Assuming snow priority as per original structure.

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

    checkCollisions(obstacles, isOrtho) {
        this.isGrounded = false;
        this.isOnObstacle = false;

        const pMinX = this.bbox.min.x;
        const pMaxX = this.bbox.max.x;
        const pMinY = this.bbox.min.y;
        const pMaxY = this.bbox.max.y;
        const pMinZ = this.bbox.min.z;
        const pMaxZ = this.bbox.max.z;

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
                    this.velocity.y = 0;
                    if (depthY_Top < depthY_Bottom) {
                        this.mesh.position.y = oMax.y + this.playerRadius;
                        this.isGrounded = true;
                        this.isOnObstacle = true;
                        if (isOrtho) {
                            this.mesh.position.z = obstacle.position.z;
                        }
                    } else {
                        this.mesh.position.y = oMin.y - this.playerRadius;
                    }
                } else if (minOverlap === minX) {
                    if (depthX_Left < depthX_Right) {
                        this.mesh.position.x = oMin.x - this.playerRadius;
                    } else {
                        this.mesh.position.x = oMax.x + this.playerRadius;
                    }
                } else if (minOverlap === minZ) {
                    if (depthZ_Back < depthZ_Front) {
                        this.mesh.position.z = oMin.z - this.playerRadius;
                    } else {
                        this.mesh.position.z = oMax.z + this.playerRadius;
                    }
                }

                // Re-update bbox after position correction
                this.bbox.setFromObject(this.mesh);
            }
        }
    }

    checkFloor(floors, isOrtho) {
        if (!this.isGrounded) {
            const playerBottomY = this.bbox.min.y;

            const pMinX = this.bbox.min.x;
            const pMaxX = this.bbox.max.x;
            const pMinZ = this.bbox.min.z;
            const pMaxZ = this.bbox.max.z;

            for (const floor of floors) {
                const box = floor.bbox;
                const min = box.min;
                const max = box.max;

                const inX = pMaxX > min.x && pMinX < max.x;
                let inZ = true;
                if (!isOrtho) {
                    inZ = pMaxZ > min.z && pMinZ < max.z;
                }

                if (inX && inZ && this.velocity.y <= 0) {
                    if (playerBottomY <= max.y && playerBottomY >= min.y - 0.5) {
                        this.isGrounded = true;
                        this.velocity.y = 0;
                        this.mesh.position.y = max.y + this.playerRadius;
                        if (isOrtho) {
                            this.mesh.position.z = floor.position.z;
                        }
                        this.bbox.setFromObject(this.mesh);
                        break;
                    }
                }
            }
        }
    }

    checkSteps(steps, bigwalls, isOrtho) {
        const playerBottomY = this.bbox.min.y;
        let allPressed = (steps.length > 0);

        const pMinX = this.bbox.min.x;
        const pMaxX = this.bbox.max.x;
        const pMinZ = this.bbox.min.z;
        const pMaxZ = this.bbox.max.z;

        steps.forEach(step => {
            const box = step.bbox;
            const min = box.min;
            const max = box.max;

            const onY = Math.abs(playerBottomY - max.y) < 0.06;

            const onX = pMaxX > min.x && pMinX < max.x;
            let onZ = isOrtho ? true : (pMaxZ > min.z && pMinZ < max.z);

            const onStep = onX && onY && onZ;

            if (onStep) {
                step.material.color.set(0x7CFC00);
            } else {
                step.material.color.copy(step.userData.originalColor);
            }

            if (!onStep) {
                allPressed = false;
            }
        });

        const TARGET_WALL_INDEX = 0;
        if (allPressed && bigwalls.length > TARGET_WALL_INDEX) {
            const targetWall = bigwalls[TARGET_WALL_INDEX];
            if (!targetWall.userData.raised) {
                targetWall.position.y += 1.8;
                targetWall.userData.raised = true;

                targetWall.updateMatrixWorld();
                targetWall.geometry.computeBoundingBox();
                targetWall.bbox = new THREE.Box3().setFromObject(targetWall);
            }
        }
    }
}
