import * as THREE from 'three';
import { CONFIG } from './config.js';
import { AssetManager } from './AssetManager.js';
import { InputManager } from './InputManager.js';
import { CameraManager } from './CameraManager.js';
import { WeatherSystem } from './WeatherSystem.js';
import { Player } from './Player.js';
import { weatherZones, initMap, weatherFloors, weatherClouds, invisibleObstacles } from './map.js';

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setClearColor(CONFIG.COLORS.SKY);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.assetManager = new AssetManager();
        this.inputManager = new InputManager();
        this.cameraManager = new CameraManager(this.scene, window.innerWidth / window.innerHeight);
        this.weatherSystem = new WeatherSystem(this.scene);
        this.player = new Player(this.scene);

        this.colliders = []; // Centralized colliders array

        this.isGameOver = false;
        this.startTime = Date.now();
        this.tempColor = new THREE.Color();

        this.ui = {
            resultModal: document.getElementById('game-result-modal'),
            resultTitle: document.getElementById('result-title'),
            confirmBtn: document.getElementById('confirm-btn'),
            gameOverModal: document.getElementById('game-over-modal'),
            retryBtn: document.getElementById('retry-btn'),
            timeoutModal: document.getElementById('timeout-modal'),
            timeoutRetryBtn: document.getElementById('timeout-retry-btn'),
            timeLeftSpan: document.getElementById('time-left'),
            timerUi: document.getElementById('timer-ui')
        };

        this.setupLights();
        // this.setupMap(); // Refactored to initMap
        this.setupEvents();

        this.render = this.render.bind(this);
    }

    setupLights() {
        const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0);
        directionalLight.position.set(0, 40, 60);
        this.scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0xaaaaaa);
        this.scene.add(ambientLight);
    }

    setupEvents() {
        window.addEventListener('resize', () => {
            this.cameraManager.resize(window.innerWidth, window.innerHeight);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        window.addEventListener('keydown', (event) => {
            if (this.isGameOver && event.key === 'Enter') {
                this.resetGame();
                return;
            }
            if (event.key === 'Tab') {
                event.preventDefault();
                this.cameraManager.switchCamera();
            }
        });

        this.ui.confirmBtn.addEventListener('click', () => {
            this.ui.resultModal.style.display = 'none';
            this.resetGame();
        });

        this.ui.retryBtn.addEventListener('click', () => {
            this.ui.gameOverModal.style.display = 'none';
            this.resetGame();
        });

        this.ui.timeoutRetryBtn.addEventListener('click', () => {
            this.ui.timeoutModal.style.display = 'none';
            this.resetGame();
        });
    }

    async init() {
        try {
            console.log("Loading assets...");

            // Initialize Map (Loads objects and apartments)
            // Pass assetManager.loader and colliders array
            console.log("Initializing map with HK logic...");
            await initMap(this.assetManager.loader, this.scene, this.colliders);

            // Initialize Weather System
            // Note: invisibleObstacles array is populated by initMap (via exported array in map.js)
            this.weatherSystem.init(this.assetManager, weatherZones, weatherFloors, weatherClouds, invisibleObstacles);

            // Load Character
            const charGltf = await this.assetManager.loadGLTF('../assets/Character.glb');
            this.player.setMesh(charGltf.scene);

            console.log("Game Started");
            this.render();
        } catch (error) {
            console.error("Failed to initialize game:", error);
            alert("Failed to load game assets.");
        }
    }

    render() {
        if (!this.player.mesh) return;

        if (this.isGameOver) {
            this.renderer.render(this.scene, this.cameraManager.activeCamera);
            requestAnimationFrame(this.render);
            return;
        }

        const currentTime = Date.now();
        const elapsedSec = (currentTime - this.startTime) / 1000;
        const remainingTime = Math.max(0, CONFIG.GAME.TIME_LIMIT - elapsedSec);

        this.ui.timeLeftSpan.innerText = remainingTime.toFixed(1);

        if (remainingTime <= 5) {
            this.ui.timerUi.classList.add('urgent');
        } else {
            this.ui.timerUi.classList.remove('urgent');
        }

        if (elapsedSec >= CONFIG.GAME.TIME_LIMIT) {
            this.isGameOver = true;
            this.ui.timeoutModal.style.display = 'flex';
            this.ui.timeLeftSpan.innerText = "0.0";
        }

        // Win condition check using player.isFinished flag from collision manager
        if (!this.isGameOver && this.player.isFinished) {
            const endTime = Date.now();
            const timeTaken = ((endTime - this.startTime) / 1000).toFixed(1);

            this.ui.resultTitle.innerText = `${timeTaken}초 만에 배달이 완료되었어요`;
            this.ui.resultModal.style.display = 'flex';
            this.isGameOver = true;
        }

        if (!this.isGameOver) {
            // Update Player with 'colliders'
            const isDead = this.player.update(this.inputManager, this.cameraManager.isOrtho, this.colliders, weatherZones, this.cameraManager.isTransitioning);
            if (isDead) {
                this.isGameOver = true;
                this.ui.gameOverModal.style.display = 'flex';
            }

            this.cameraManager.update(this.player.mesh.position);
            this.updateBackgroundColor();
            this.weatherSystem.update(this.player.mesh.position, this.cameraManager.isOrtho);
            this.weatherSystem.updateMaterials(this.cameraManager.isOrtho);
        }

        requestAnimationFrame(this.render);
        this.renderer.render(this.scene, this.cameraManager.activeCamera);
    }

    updateBackgroundColor() {
        if (!this.weatherSystem) return;
        const maxIntensity = this.weatherSystem.getMaxIntensity(this.player.mesh.position);
        this.tempColor.copy(CONFIG.COLORS.SKY).lerp(CONFIG.COLORS.DARK, maxIntensity);
        this.renderer.setClearColor(this.tempColor);
    }

    resetGame() {
        if (!this.player.mesh) return;

        this.isGameOver = false;
        this.startTime = Date.now();

        this.ui.resultModal.style.display = 'none';
        this.ui.gameOverModal.style.display = 'none';
        this.ui.timeoutModal.style.display = 'none';
        this.ui.timerUi.classList.remove('urgent');

        this.cameraManager.reset();
        this.weatherSystem.reset(); // Reset weather visuals (snow accumulation)

        this.player.mesh.position.set(-8, 1.5, 0);
        this.player.velocity.set(0, 0, 0);
        this.player.momentumX = 0;
        this.player.momentumZ = 0;
        this.player.isGrounded = true;
        this.player.isFinished = false; // Reset finish flag

        // Reset Bigwalls and Steps (need to iterate colliders or specific arrays)
        // HK logic sets 'raised' on bigwall.
        // We can iterate this.colliders and check types suitable for reset.
        this.colliders.forEach(obj => {
            if (obj.userData.type === 'obstacle' && obj.userData.raised !== undefined) {
                if (obj.userData.raised) {
                    obj.position.y -= 1.8;
                    obj.userData.raised = false;
                    obj.updateMatrixWorld();
                    obj.bbox.setFromObject(obj);
                }
            }
            if (obj.userData.type === 'step') {
                // Reset step color
                if (obj.userData.originalColor) {
                    obj.material.color.copy(obj.userData.originalColor);
                }
                obj.userData.pressed = false;
            }
        });
    }
}

