import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class AssetManager {
    constructor() {
        this.loader = new GLTFLoader();
        this.textures = {};
        this.models = {};
    }

    async loadGLTF(path) {
        try {
            const gltf = await this.loader.loadAsync(path);
            return gltf;
        } catch (error) {
            console.error(`Failed to load GLTF: ${path}`, error);
            throw error;
        }
    }

    getRainTexture() {
        if (this.textures.rain) return this.textures.rain;

        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 64;

        const context = canvas.getContext('2d');
        const gradient = context.createLinearGradient(0, 0, 0, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        context.fillStyle = gradient;
        context.fillRect(14, 0, 4, 64);

        const texture = new THREE.CanvasTexture(canvas);
        this.textures.rain = texture;
        return texture;
    }

    getSnowTexture() {
        if (this.textures.snow) return this.textures.snow;

        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;

        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        this.textures.snow = texture;
        return texture;
    }
}
