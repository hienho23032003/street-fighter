// Asset loader & Sprite Animation Engine
class SpriteManager {
    constructor() {
        this.images = {};
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.isLoaded = false;
        this.basePath = 'streets_of_fight_files/Streets of Fight files/';
    }

    loadImage(key, relativePath) {
        this.totalAssets++;
        return new Promise((resolve) => {
            const img = new Image();
            img.src = this.basePath + relativePath;
            img.onload = () => {
                this.images[key] = img;
                this.loadedAssets++;
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`Could not load image: ${relativePath}`);
                this.loadedAssets++;
                resolve(null);
            };
        });
    }

    async loadAllAssets(onProgress) {
        const loadPromises = [];

        // 1. Stage Assets
        loadPromises.push(this.loadImage('stage_back', 'Stage Layers/back.png'));
        loadPromises.push(this.loadImage('stage_fore', 'Stage Layers/fore.png'));
        loadPromises.push(this.loadImage('shadow', 'Sprites/shadow.png'));
        loadPromises.push(this.loadImage('prop_car', 'Stage Layers/props/car.png'));
        loadPromises.push(this.loadImage('prop_barrel', 'Stage Layers/props/barrel.png'));
        loadPromises.push(this.loadImage('prop_hydrant', 'Stage Layers/props/hydrant.png'));

        // Animated props
        loadPromises.push(this.loadImage('prop_sushi_1', 'Stage Layers/props/Sushi/sushi-1.png'));
        loadPromises.push(this.loadImage('prop_sushi_2', 'Stage Layers/props/Sushi/sushi-2.png'));
        loadPromises.push(this.loadImage('prop_eth_1', 'Stage Layers/props/Ethereum/ethereum-1.png'));
        loadPromises.push(this.loadImage('prop_eth_2', 'Stage Layers/props/Ethereum/ethereum-2.png'));
        loadPromises.push(this.loadImage('prop_banner_1', 'Stage Layers/props/banner-hor/banner-hor1.png'));
        loadPromises.push(this.loadImage('prop_banner_2', 'Stage Layers/props/banner-hor/banner-hor2.png'));

        // 2. Brawler Girl Frames
        // Idle (4)
        for (let i = 1; i <= 4; i++) {
            loadPromises.push(this.loadImage(`girl_idle_${i}`, `Sprites/Brawler-Girl/Idle/idle${i}.png`));
        }
        // Walk (10)
        for (let i = 1; i <= 10; i++) {
            loadPromises.push(this.loadImage(`girl_walk_${i}`, `Sprites/Brawler-Girl/Walk/walk${i}.png`));
        }
        // Jab (3)
        for (let i = 1; i <= 3; i++) {
            loadPromises.push(this.loadImage(`girl_jab_${i}`, `Sprites/Brawler-Girl/Jab/jab${i}.png`));
        }
        // Punch (3)
        for (let i = 1; i <= 3; i++) {
            loadPromises.push(this.loadImage(`girl_punch_${i}`, `Sprites/Brawler-Girl/Punch/punch${i}.png`));
        }
        // Kick (5)
        for (let i = 1; i <= 5; i++) {
            loadPromises.push(this.loadImage(`girl_kick_${i}`, `Sprites/Brawler-Girl/Kick/kick${i}.png`));
        }
        // Jump (4)
        for (let i = 1; i <= 4; i++) {
            loadPromises.push(this.loadImage(`girl_jump_${i}`, `Sprites/Brawler-Girl/Jump/jump${i}.png`));
        }
        // Jump Kick (3)
        for (let i = 1; i <= 3; i++) {
            loadPromises.push(this.loadImage(`girl_jump_kick_${i}`, `Sprites/Brawler-Girl/Jump_kick/jump_kick${i}.png`));
        }
        // Dive Kick (5)
        for (let i = 1; i <= 5; i++) {
            loadPromises.push(this.loadImage(`girl_dive_kick_${i}`, `Sprites/Brawler-Girl/Dive_kick/dive_kick${i}.png`));
        }
        // Hurt (2)
        for (let i = 1; i <= 2; i++) {
            loadPromises.push(this.loadImage(`girl_hurt_${i}`, `Sprites/Brawler-Girl/Hurt/hurt${i}.png`));
        }

        // 3. Enemy Punk Frames
        // Idle (4)
        for (let i = 1; i <= 4; i++) {
            loadPromises.push(this.loadImage(`punk_idle_${i}`, `Sprites/Enemy-Punk/Idle/idle${i}.png`));
        }
        // Walk (4)
        for (let i = 1; i <= 4; i++) {
            loadPromises.push(this.loadImage(`punk_walk_${i}`, `Sprites/Enemy-Punk/Walk/walk${i}.png`));
        }
        // Punch (3)
        for (let i = 1; i <= 3; i++) {
            loadPromises.push(this.loadImage(`punk_punch_${i}`, `Sprites/Enemy-Punk/Punch/punch${i}.png`));
        }
        // Kick (4)
        for (let i = 1; i <= 4; i++) {
            loadPromises.push(this.loadImage(`punk_kick_${i}`, `Sprites/Enemy-Punk/Kick/kick${i}.png`));
        }
        // Hurt (4)
        for (let i = 1; i <= 4; i++) {
            loadPromises.push(this.loadImage(`punk_hurt_${i}`, `Sprites/Enemy-Punk/Hurt/hurt${i}.png`));
        }

        // Monitor progress
        const checkInterval = setInterval(() => {
            const progress = this.totalAssets > 0 ? (this.loadedAssets / this.totalAssets) : 0;
            if (onProgress) onProgress(progress);
        }, 50);

        await Promise.all(loadPromises);
        clearInterval(checkInterval);
        if (onProgress) onProgress(1.0);
        this.isLoaded = true;
    }

    getImage(key) {
        return this.images[key] || null;
    }

    // Get array of images for an animation sequence
    getAnimationFrames(charType, actionName) {
        const frames = [];
        let prefix = charType === 'GIRL' ? 'girl_' : 'punk_';

        const mapCounts = {
            'GIRL': {
                'idle': 4,
                'walk': 10,
                'jab': 3,
                'punch': 3,
                'kick': 5,
                'jump': 4,
                'jump_kick': 3,
                'dive_kick': 5,
                'hurt': 2,
                'block': 1 // Use jab1 / idle frame as block
            },
            'PUNK': {
                'idle': 4,
                'walk': 4,
                'punch': 3,
                'kick': 4,
                'heavy_punch': 3,
                'dash_tackle': 3,
                'jump': 2,
                'jump_kick': 2,
                'hurt': 4,
                'block': 1
            }
        };

        const count = (mapCounts[charType] && mapCounts[charType][actionName]) || 1;

        for (let i = 1; i <= count; i++) {
            let key = `${prefix}${actionName}_${i}`;
            // Special mappings for punk actions that reuse or adapt frames
            if (charType === 'PUNK') {
                if (actionName === 'kick') key = `punk_kick_${i}`;
                if (actionName === 'jump_kick') key = `punk_kick_${i === 1 ? 3 : 4}`;
                if (actionName === 'heavy_punch') key = `punk_punch_${i}`;
                if (actionName === 'dash_tackle') key = `punk_punch_${i}`;
                if (actionName === 'jump') key = `punk_walk_${i === 1 ? 2 : 4}`;
                if (actionName === 'block') key = `punk_walk_3`;
            } else if (charType === 'GIRL' && actionName === 'block') {
                key = `girl_jab_1`;
            }

            const img = this.getImage(key);
            if (img) frames.push(img);
        }

        return frames;
    }
}

window.spriteManager = new SpriteManager();
