import * as THREE from 'three';
import { CONFIG } from './config.js';

export class WeatherSystem {
    constructor(scene) {
        this.scene = scene;
        this.systems = [];
        this.zones = [];
    }

    init(assetManager, weatherZones, weatherFloors, weatherClouds, invisibleObstacles) {
        this.zones = weatherZones;
        this.floors = weatherFloors || [];
        this.clouds = weatherClouds || [];
        this.invisibleObstacles = invisibleObstacles || [];

        weatherZones.forEach(zone => {
            if (zone.type === 'RAIN') {
                const config = { ...CONFIG.WEATHER.RAIN, texture: assetManager.getRainTexture() };
                this.createSystem(config, zone);
            } else if (zone.type === 'SNOW') {
                const config = { ...CONFIG.WEATHER.SNOW, texture: assetManager.getSnowTexture() };
                this.createSystem(config, zone);
            }
        });
    }

    createSystem(config, zone) {
        const geom = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        // Define bounds for particle spawning
        const halfWidth = zone.size.x / 2;
        const halfDepth = zone.size.z / 2;
        const startX = zone.position.x - halfWidth;
        const rangeX = zone.size.x;

        const centerZ = zone.position.z;

        const CLOUD_Y = 6.0;
        const FLOOR_Y = 0.0;

        for (let i = 0; i < config.count; i++) {
            positions.push(
                Math.random() * rangeX + startX,
                Math.random() * (CLOUD_Y - FLOOR_Y) + FLOOR_Y,
                centerZ - (halfDepth) + Math.random() * zone.size.z // Distribute in Z
            );

            velocities.push(
                (Math.random() - 0.5) * config.windSpeed,
                config.fallSpeed + Math.random() * (config.fallSpeed * 0.5)
            );
        }

        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 2));

        const material = new THREE.PointsMaterial({
            size: config.size,
            transparent: true,
            opacity: 0,
            map: config.texture,
            blending: config.blending,
            sizeAttenuation: true,
            color: config.color,
            depthWrite: false
        });

        material.userData.originalSize = config.size;

        const mesh = new THREE.Points(geom, material);
        mesh.sortParticles = true;
        this.scene.add(mesh);

        // Store system with its specific zone data
        this.systems.push({
            mesh,
            config,
            zone,
            CLOUD_Y,
            FLOOR_Y,
            startX,
            rangeX,
            rangeZ: zone.size.z,
            minZ: centerZ - halfDepth
        });
    }

    update(characterPos, isOrtho) {
        const fadePadding = 5.0;

        // Update Systems (Particles)
        this.systems.forEach(system => {
            const { mesh, config, zone, CLOUD_Y, FLOOR_Y, startX, rangeX, minZ, rangeZ } = system;

            // Opacity Logic
            // Calculate 3D distance to ZONE BOX.
            const halfSize = new THREE.Vector3(zone.size.x / 2, zone.size.y / 2, zone.size.z / 2);

            // Calculate distance to the box's outer shell
            const dx = Math.max(0, Math.abs(characterPos.x - zone.position.x) - halfSize.x);
            const dy = Math.max(0, Math.abs(characterPos.y - zone.position.y) - halfSize.y);
            const dz = Math.max(0, Math.abs(characterPos.z - zone.position.z) - halfSize.z);

            // Euclidean distance to the nearest point on the box
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            let intensity;
            if (dist <= 0) {
                // Inside the box
                intensity = 1;
            } else {
                // Outside the box, fade out
                intensity = 1 - (dist / fadePadding);
            }

            if (intensity < 0) intensity = 0;
            if (intensity > 1) intensity = 1;

            mesh.material.opacity = intensity;

            if (intensity > 0) {
                const pos = mesh.geometry.attributes.position.array;
                const vel = mesh.geometry.attributes.velocity.array;

                for (let i = 0; i < config.count; i++) {
                    // Y axis fall
                    pos[i * 3 + 1] -= vel[i * 2 + 1];

                    // X axis movement
                    if (config.wiggle) {
                        pos[i * 3] -= Math.sin(Date.now() * 0.001 + i) * 0.02;
                    } else {
                        pos[i * 3] -= vel[i * 2];
                    }

                    // Reset logic
                    if (pos[i * 3 + 1] < FLOOR_Y) {
                        pos[i * 3 + 1] = CLOUD_Y;
                        pos[i * 3] = startX + Math.random() * rangeX;
                        // Reset Z as well to stay in volume
                        pos[i * 3 + 2] = minZ + Math.random() * rangeZ;
                    }
                }
                mesh.geometry.attributes.position.needsUpdate = true;
            }
        });

        // Update Floors (Persistent Fade-in)
        if (this.floors) {
            this.floors.forEach(floor => {
                const zone = floor.userData.zone;
                if (!zone) return;

                const halfSize = new THREE.Vector3(zone.size.x / 2, zone.size.y / 2, zone.size.z / 2);

                // Calculate distance to the box's outer shell
                const dx = Math.max(0, Math.abs(characterPos.x - zone.position.x) - halfSize.x);
                const dy = Math.max(0, Math.abs(characterPos.y - zone.position.y) - halfSize.y);
                const dz = Math.max(0, Math.abs(characterPos.z - zone.position.z) - halfSize.z);

                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                let targetIntensity = 0;

                if (dist <= 0) {
                    targetIntensity = 1;
                } else {
                    targetIntensity = 1 - (dist / fadePadding);
                }

                if (targetIntensity < 0) targetIntensity = 0;
                if (targetIntensity > 1) targetIntensity = 1;

                const MAX_OPACITY = 0.8;
                const calculatedOpacity = targetIntensity * MAX_OPACITY;

                // Ratchet: Never decrease opacity
                if (calculatedOpacity > floor.material.opacity) {
                    floor.material.opacity = calculatedOpacity;
                }
            });
        }

        // Update Clouds (Dynamic Fade-in/out)
        if (this.clouds) {
            this.clouds.forEach(cloud => {
                const zone = cloud.userData.zone;
                if (!zone) return;

                const halfSize = new THREE.Vector3(zone.size.x / 2, zone.size.y / 2, zone.size.z / 2);

                // Calculate distance to the box's outer shell
                const dx = Math.max(0, Math.abs(characterPos.x - zone.position.x) - halfSize.x);
                const dy = Math.max(0, Math.abs(characterPos.y - zone.position.y) - halfSize.y);
                const dz = Math.max(0, Math.abs(characterPos.z - zone.position.z) - halfSize.z);

                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                let targetIntensity = 0;

                if (dist <= 0) {
                    targetIntensity = 1;
                } else {
                    targetIntensity = 1 - (dist / fadePadding);
                }

                if (targetIntensity < 0) targetIntensity = 0;
                if (targetIntensity > 1) targetIntensity = 1;

                cloud.material.opacity = targetIntensity;
            });
        }

        // Update Invisible Obstacles (Fade-in when close)
        if (this.invisibleObstacles) {
            this.invisibleObstacles.forEach(obj => {
                // Obj is small (2x2), let's use 3D distance to center
                const dx = Math.abs(characterPos.x - obj.position.x);
                const dy = Math.abs(characterPos.y - obj.position.y);
                let dz = Math.abs(characterPos.z - obj.position.z);

                if (isOrtho) {
                    dz = 0; // Ignore Z distance in Ortho mode
                }

                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                const FADE_START = 8.0; // Start fading in at 8 units
                const FADE_FULL = 4.0;  // Fully visible at 4 units

                let intensity = 0;
                if (distance <= FADE_FULL) {
                    intensity = 1;
                } else if (distance <= FADE_START) {
                    intensity = 1 - (distance - FADE_FULL) / (FADE_START - FADE_FULL);
                }

                if (intensity < 0) intensity = 0;
                if (intensity > 1) intensity = 1;

                obj.material.opacity = intensity;
            });
        }
    }

    updateMaterials(isOrtho) {
        this.systems.forEach(system => {
            const mat = system.mesh.material;
            if (isOrtho) {
                mat.sizeAttenuation = false;
                mat.size = mat.userData.originalSize * 30;
            } else {
                mat.sizeAttenuation = true;
                mat.size = mat.userData.originalSize;
            }
            mat.needsUpdate = true;
        });
    }

    getMaxIntensity(characterPos) {
        let maxIntensity = 0;
        const fadePadding = 5.0;

        this.systems.forEach(system => {
            const { zone } = system;

            const halfSize = new THREE.Vector3(zone.size.x / 2, zone.size.y / 2, zone.size.z / 2);

            // Calculate distance to the box's outer shell
            const dx = Math.max(0, Math.abs(characterPos.x - zone.position.x) - halfSize.x);
            const dy = Math.max(0, Math.abs(characterPos.y - zone.position.y) - halfSize.y);
            const dz = Math.max(0, Math.abs(characterPos.z - zone.position.z) - halfSize.z);

            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            let intensity;
            if (dist <= 0) {
                intensity = 1;
            } else {
                intensity = 1 - (dist / fadePadding);
            }

            if (intensity < 0) intensity = 0;
            if (intensity > 1) intensity = 1;

            if (intensity > maxIntensity) maxIntensity = intensity;
        });
        return maxIntensity;
    }

    reset() {
        if (this.floors) {
            this.floors.forEach(floor => {
                floor.material.opacity = 0;
            });
        }
    }
}
