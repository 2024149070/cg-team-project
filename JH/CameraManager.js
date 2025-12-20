import * as THREE from 'three';
import { CONFIG } from './config.js';
import { lerp } from './utils.js';

export class CameraManager {
    constructor(scene, aspect) {
        this.scene = scene;
        this.aspect = aspect;

        // Perspective Camera
        this.perspCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);

        // Orthographic Camera
        const frusSize = CONFIG.CAMERA.FRUSTUM_SIZE;
        this.orthoCamera = new THREE.OrthographicCamera(
            -frusSize * aspect / 2,
            frusSize * aspect / 2,
            frusSize / 2,
            -frusSize / 2,
            0.1, 1000
        );

        this.activeCamera = this.orthoCamera;
        this.isOrtho = true;
        this.isTransitioning = false;
        this.transitionAlpha = 0;

        // Initial setup
        this.activeCamera.position.set(4, CONFIG.CAMERA.ORTHO_Y, CONFIG.CAMERA.ORTHO_Z);
        this.activeCamera.lookAt(4, 0, 0);
        this.scene.add(this.activeCamera);
    }

    resize(width, height) {
        this.aspect = width / height;

        this.perspCamera.aspect = this.aspect;
        this.perspCamera.updateProjectionMatrix();

        const frusSize = CONFIG.CAMERA.FRUSTUM_SIZE;
        this.orthoCamera.left = -frusSize * this.aspect / 2;
        this.orthoCamera.right = frusSize * this.aspect / 2;
        this.orthoCamera.top = frusSize / 2;
        this.orthoCamera.bottom = -frusSize / 2;
        this.orthoCamera.updateProjectionMatrix();
    }

    switchCamera() {
        if (this.isTransitioning) return;

        this.isOrtho = !this.isOrtho;
        this.isTransitioning = true;
        this.transitionAlpha = 0;

        // Start transition with perspective camera
        this.activeCamera = this.perspCamera;
        this.activeCamera.updateProjectionMatrix();
    }

    update(characterPosition) {
        if (this.isTransitioning) {
            this.transitionAlpha += 0.03;
            if (this.transitionAlpha >= 1) {
                this.transitionAlpha = 1;
                this.isTransitioning = false;

                if (this.isOrtho) {
                    this.activeCamera = this.orthoCamera;
                    this.activeCamera.position.set(characterPosition.x, characterPosition.y, CONFIG.CAMERA.ORTHO_Z);
                    this.activeCamera.lookAt(characterPosition.x, characterPosition.y, 0);
                    return;
                }
            }
        }

        if (this.activeCamera === this.perspCamera) {
            const t = this.transitionAlpha < 0.5
                ? 2 * this.transitionAlpha * this.transitionAlpha
                : 1 - Math.pow(-2 * this.transitionAlpha + 2, 2) / 2;

            let ratio = this.isOrtho ? (1 - t) : t;

            const sideX = characterPosition.x + CONFIG.CAMERA.VIEW.SIDE.offsetX;
            const sideY = characterPosition.y + CONFIG.CAMERA.VIEW.SIDE.offsetY;
            const sideZ = characterPosition.z + CONFIG.CAMERA.VIEW.SIDE.offsetZ;

            const tpsX = characterPosition.x + CONFIG.CAMERA.VIEW.TPS.offsetX;
            const tpsY = characterPosition.y + CONFIG.CAMERA.VIEW.TPS.offsetY;
            const tpsZ = characterPosition.z + CONFIG.CAMERA.VIEW.TPS.offsetZ;

            this.activeCamera.position.x = lerp(sideX, tpsX, ratio);
            this.activeCamera.position.y = lerp(sideY, tpsY, ratio);
            this.activeCamera.position.z = lerp(sideZ, tpsZ, ratio);

            this.activeCamera.fov = lerp(CONFIG.CAMERA.VIEW.SIDE.fov, CONFIG.CAMERA.VIEW.TPS.fov, ratio);
            this.activeCamera.updateProjectionMatrix();

            const lookSideX = characterPosition.x;
            const lookSideY = characterPosition.y;
            const lookSideZ = characterPosition.z;

            const lookTpsX = characterPosition.x + 2;
            const lookTpsY = characterPosition.y;
            const lookTpsZ = characterPosition.z;

            const currentLookX = lerp(lookSideX, lookTpsX, ratio);
            const currentLookY = lerp(lookSideY, lookTpsY, ratio);
            const currentLookZ = lerp(lookSideZ, lookTpsZ, ratio);

            this.activeCamera.lookAt(currentLookX, currentLookY, currentLookZ);
        } else {
            // Orthographic tracking
            this.activeCamera.position.x = characterPosition.x;
            this.activeCamera.position.y = characterPosition.y;
        }
    }

    reset() {
        this.isOrtho = true;
        this.activeCamera = this.orthoCamera;
        this.isTransitioning = false;
        this.transitionAlpha = 0;
        this.activeCamera.position.set(4, CONFIG.CAMERA.ORTHO_Y, CONFIG.CAMERA.ORTHO_Z);
        this.activeCamera.lookAt(4, 0, 0);
    }
}
