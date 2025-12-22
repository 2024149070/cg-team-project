export class InputManager {
    constructor() {
        this.enabled = false;
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            space: false
        };

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
        Object.keys(this.keys).forEach(key => this.keys[key] = false);
    }

    onKeyDown(event) {
        if (!this.enabled) return;
        if (event.key === 'ArrowUp') this.keys.up = true;
        if (event.key === 'ArrowDown') this.keys.down = true;
        if (event.key === 'ArrowLeft') this.keys.left = true;
        if (event.key === 'ArrowRight') this.keys.right = true;
        if (event.code === 'Space') this.keys.space = true;
    }

    onKeyUp(event) {
        if (!this.enabled) return;
        if (event.key === 'ArrowUp') this.keys.up = false;
        if (event.key === 'ArrowDown') this.keys.down = false;
        if (event.key === 'ArrowLeft') this.keys.left = false;
        if (event.key === 'ArrowRight') this.keys.right = false;
        if (event.code === 'Space') this.keys.space = false;
    }

    isKeyPressed(key) {
        return this.keys[key];
    }

    // For one-off checks like space bar jump trigger which should be consumed
    consumeSpace() {
        if (this.keys.space) {
            this.keys.space = false; // Reset immediately if you want single trigger behavior, 
            // but for continuous holding check, just use isKeyPressed('space')
            // In the original code, jump was triggered on keydown.
            // We might need to handle it slightly differently or just check the state.
            return true;
        }
        return false;
    }

    cleanup() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }
}
