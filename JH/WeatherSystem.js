import * as THREE from 'three';
import { CONFIG } from './config.js';

export class WeatherSystem {
    constructor(scene) {
        this.scene = scene;
        this.systems = [];
        this.snowFloor = null;
        this.cloud = null;
    }

    init(assetManager) {
        // Initialize Rain
        const rainConfig = { ...CONFIG.WEATHER.RAIN, texture: assetManager.getRainTexture() };
        this.systems.push(this.createSystem(rainConfig));

        // Initialize Snow
        const snowConfig = { ...CONFIG.WEATHER.SNOW, texture: assetManager.getSnowTexture() };
        this.systems.push(this.createSystem(snowConfig));

        this.createZones();
    }

    createZones() {
        // Snow Floor
        const snowConfig = CONFIG.WEATHER.SNOW;
        const snowZoneWidth = snowConfig.endX - snowConfig.startX;
        const snowCenterX = (snowConfig.startX + snowConfig.endX) / 2;

        const snowGeo = new THREE.BoxGeometry(snowZoneWidth, 0.05, 10);
        const snowMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 1.0,
            metalness: 0.0,
            transparent: true,
            opacity: 0.8
        });

        this.snowFloor = new THREE.Mesh(snowGeo, snowMat);
        this.snowFloor.position.set(snowCenterX, 0.285, 0);
        this.snowFloor.receiveShadow = true;
        this.scene.add(this.snowFloor);

        // Rain Cloud
        const rainConfig = CONFIG.WEATHER.RAIN;
        const rainZoneWidth = rainConfig.endX - rainConfig.startX;
        const rainCenterX = (rainConfig.startX + rainConfig.endX) / 2;

        const cloudGeo = new THREE.BoxGeometry(rainZoneWidth, 1, 10);
        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 1.0,
            metalness: 0.0
        });

        this.cloud = new THREE.Mesh(cloudGeo, cloudMat);
        this.cloud.position.set(rainCenterX, 6, 0);
        this.scene.add(this.cloud);
    }

    createSystem(config) {
        const geom = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        const CLOUD_Y = 6.0;
        const FLOOR_Y = 0.0;
        const rangeX = 10;

        for (let i = 0; i < config.count; i++) {
            positions.push(
                Math.random() * rangeX + config.startX,
                Math.random() * (CLOUD_Y - FLOOR_Y) + FLOOR_Y,
                -5 + (10 * i / config.count)
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
            sizeAttenuation: true, // Default to true, will be updated by CameraManager/Game
            color: config.color,
            depthWrite: false
        });

        material.userData.originalSize = config.size;

        const mesh = new THREE.Points(geom, material);
        mesh.sortParticles = true;
        this.scene.add(mesh);

        return { mesh, config, CLOUD_Y, FLOOR_Y };
    }

    update(characterX) {
        const fadePadding = 5.0;

        this.systems.forEach(system => {
            const { mesh, config, CLOUD_Y, FLOOR_Y } = system;

            // Opacity Logic
            const center = (config.startX + config.endX) / 2;
            const width = config.endX - config.startX;
            const dist = Math.abs(characterX - center);
            let intensity = 1 - (dist - width / 2) / fadePadding;

            // Fix logic based on original code:
            // const distOutside = dist - halfWidth;
            // intensity = 1 - (distOutside / fadePadding);
            // If distOutside <= 0, intensity = 1.

            if (dist <= width / 2) {
                intensity = 1;
            } else {
                intensity = 1 - ((dist - width / 2) / fadePadding);
            }

            if (intensity < 0) intensity = 0;
            if (intensity > 1) intensity = 1;

            mesh.material.opacity = intensity;

            if (intensity > 0) {
                const pos = mesh.geometry.attributes.position.array;
                const vel = mesh.geometry.attributes.velocity.array;
                const zoneWidth = config.endX - config.startX;

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
                        pos[i * 3] = config.startX + Math.random() * zoneWidth;
                    }
                }
                mesh.geometry.attributes.position.needsUpdate = true;
            }
        });
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

    getMaxIntensity(characterX) {
        let maxIntensity = 0;
        const fadePadding = 5.0;

        this.systems.forEach(system => {
            const { config } = system;
            const center = (config.startX + config.endX) / 2;
            const width = config.endX - config.startX;
            const dist = Math.abs(characterX - center);

            let intensity;
            if (dist <= width / 2) {
                intensity = 1;
            } else {
                intensity = 1 - ((dist - width / 2) / fadePadding);
            }

            if (intensity < 0) intensity = 0;
            if (intensity > 1) intensity = 1;

            if (intensity > maxIntensity) maxIntensity = intensity;
        });
        return maxIntensity;
    }
}
