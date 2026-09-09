// Smart CPU AI Controller for PvE Mode
class AIController {
    constructor(difficulty = 'NORMAL') {
        this.difficulty = difficulty; // EASY, NORMAL, HARD
        this.decisionTimer = 0;
        this.decisionInterval = 12; // Frames between decisions
        this.currentAction = {
            left: false,
            right: false,
            up: false,
            down: false,
            attack1: false,
            attack2: false,
            special: false
        };
    }

    setDifficulty(diff) {
        this.difficulty = diff;
        if (diff === 'EASY') this.decisionInterval = 18;
        if (diff === 'NORMAL') this.decisionInterval = 10;
        if (diff === 'HARD') this.decisionInterval = 6;
    }

    update(bot, player) {
        this.decisionTimer++;

        // Reset inputs on attack states
        if (bot.state.startsWith('ATTACK') || bot.state === 'SPECIAL' || bot.state === 'HURT') {
            this.currentAction.attack1 = false;
            this.currentAction.attack2 = false;
            this.currentAction.special = false;
            return this.currentAction;
        }

        if (this.decisionTimer >= this.decisionInterval) {
            this.decisionTimer = 0;
            this.makeDecision(bot, player);
        }

        return this.currentAction;
    }

    makeDecision(bot, player) {
        // Clear all triggers
        this.currentAction.left = false;
        this.currentAction.right = false;
        this.currentAction.up = false;
        this.currentAction.down = false;
        this.currentAction.attack1 = false;
        this.currentAction.attack2 = false;
        this.currentAction.special = false;

        const distance = Math.abs(bot.x - player.x);
        const playerIsRight = player.x > bot.x;
        const playerAttacking = player.state.startsWith('ATTACK') || player.state === 'SPECIAL';

        // 1. Defensive Reaction: Block if player attacks nearby
        const blockChance = this.difficulty === 'HARD' ? 0.75 : (this.difficulty === 'NORMAL' ? 0.45 : 0.15);
        if (playerAttacking && distance < 120 && Math.random() < blockChance) {
            this.currentAction.down = true; // Hold Block
            return;
        }

        // 2. Super Special Attack if meter available and in good position
        if (bot.energy >= 35 && distance > 100 && distance < 250 && Math.random() < 0.6) {
            this.currentAction.special = true;
            return;
        }

        // 3. Close Range Combat (Distance < 90px)
        if (distance < 85) {
            const rand = Math.random();
            if (rand < 0.45) {
                this.currentAction.attack1 = true; // Fast Jab
            } else if (rand < 0.8) {
                this.currentAction.attack2 = true; // Heavy Punch
            } else {
                // Tactical backstep / jump
                if (playerIsRight) this.currentAction.left = true;
                else this.currentAction.right = true;
                if (Math.random() < 0.3) this.currentAction.up = true;
            }
            return;
        }

        // 4. Mid Range / Approach (Distance >= 85px)
        if (playerIsRight) {
            this.currentAction.right = true;
        } else {
            this.currentAction.left = true;
        }

        // Occasional jump in approach
        if (distance > 180 && Math.random() < 0.25) {
            this.currentAction.up = true;
        }
    }
}

window.AIController = AIController;
