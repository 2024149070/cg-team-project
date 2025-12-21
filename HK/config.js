import * as THREE from 'three';

export const CONFIG = {
    SPEED: {
        DEFAULT: 0.1,
        SLOW: 0.05,
        MAX: 0.15,
        ACCEL: 0.1,
        FRICTION: 0.0,
        SNOW_ACCEL: 0.005,
        SNOW_FRICTION: 0.96
    },
    PHYSICS: {
        GRAVITY: -0.01,
        JUMP_POWER: 0.2,
        PLAYER_RADIUS: 0.5
    },
    CAMERA: {
        ORTHO_Z: 5.5,
        ORTHO_Y: 0,
        FRUSTUM_SIZE: 5.8,
        VIEW: {
            SIDE: { offsetX: 0, offsetY: 0, offsetZ: 100, fov: 3.3 },
            TPS: { offsetX: -6, offsetY: 3, offsetZ: 0, fov: 60 }
        }
    },
    GAME: {
        TIME_LIMIT: 500
    },
    COLORS: {
        SKY: new THREE.Color(0xb8f8fd),
        DARK: new THREE.Color(0x0E0F37)
    },
    WEATHER: {
        RAIN: {
            color: 0x558BCF, size: 1,
            count: 100,
            fallSpeed: 0.4, windSpeed: 0.1, wiggle: false,
            blending: THREE.NormalBlending
        },
        SNOW: {
            color: 0xffffff, size: 0.7,
            count: 100,
            fallSpeed: 0.05, windSpeed: 0.02, wiggle: true,
            blending: THREE.NormalBlending
        }
    }
};
