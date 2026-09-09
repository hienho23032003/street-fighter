const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const kickDir = 'streets_of_fight_files/Streets of Fight files/Sprites/Enemy-Punk/Kick';
if (!fs.existsSync(kickDir)) fs.mkdirSync(kickDir, { recursive: true });

const idle1 = PNG.sync.read(fs.readFileSync('streets_of_fight_files/Streets of Fight files/Sprites/Enemy-Punk/Idle/idle1.png'));
const punch2 = PNG.sync.read(fs.readFileSync('streets_of_fight_files/Streets of Fight files/Sprites/Enemy-Punk/Punch/punch2.png'));
const walk2 = PNG.sync.read(fs.readFileSync('streets_of_fight_files/Streets of Fight files/Sprites/Enemy-Punk/Walk/walk2.png'));

// Palette mapping from existing sprite
// Skin: rgb(240, 150, 100), Vest: rgb(180, 50, 30), Jeans: rgb(50, 100, 160), Boot: rgb(120, 70, 40), Outline: rgb(20, 10, 20)
function clonePng(source) {
    const png = new PNG({ width: source.width, height: source.height });
    source.data.copy(png.data);
    return png;
}

function setPixel(png, x, y, r, g, b, a = 255) {
    if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
    const idx = (png.width * y + x) << 2;
    png.data[idx] = r;
    png.data[idx + 1] = g;
    png.data[idx + 2] = b;
    png.data[idx + 3] = a;
}

function clearBox(png, x1, y1, x2, y2) {
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            setPixel(png, x, y, 0, 0, 0, 0);
        }
    }
}

// Colors from Punk
const C_OUTLINE = [30, 20, 25];
const C_JEANS_DARK = [35, 75, 125];
const C_JEANS_LIGHT = [60, 115, 175];
const C_BOOT_DARK = [90, 55, 30];
const C_BOOT_LIGHT = [150, 90, 45];
const C_SKIN = [225, 140, 95];

// Generate Frame 1: Knee Chambering
const k1 = clonePng(idle1);
// Clear lower front leg and draw lifted knee
clearBox(k1, 28, 42, 45, 62);
// Standing back leg
for (let y = 44; y <= 62; y++) {
    for (let x = 45; x <= 53; x++) {
        const isOutline = (x === 45 || x === 53 || y === 62);
        const col = y > 53 ? (isOutline ? C_OUTLINE : C_BOOT_LIGHT) : (isOutline ? C_OUTLINE : C_JEANS_LIGHT);
        setPixel(k1, x, y, col[0], col[1], col[2]);
    }
}
// Lifted bent knee
for (let y = 35; y <= 48; y++) {
    for (let x = 32; x <= 44; x++) {
        if (x + y > 70 && x - y < 4) {
            const isOutline = (x === 32 || y === 35 || y === 48);
            const col = isOutline ? C_OUTLINE : C_JEANS_LIGHT;
            setPixel(k1, x, y, col[0], col[1], col[2]);
        }
    }
}
// Lifted boot tucked
for (let y = 46; y <= 54; y++) {
    for (let x = 36; x <= 43; x++) {
        const isOutline = (x === 36 || x === 43 || y === 54);
        const col = isOutline ? C_OUTLINE : C_BOOT_LIGHT;
        setPixel(k1, x, y, col[0], col[1], col[2]);
    }
}

// Generate Frame 2: Mid Kick Extension
const k2 = clonePng(idle1);
// Lean torso slightly right
clearBox(k2, 20, 38, 55, 62);
// Supporting leg planted
for (let y = 42; y <= 62; y++) {
    for (let x = 47; x <= 56; x++) {
        const isOutline = (x === 47 || x === 56 || y === 62);
        const col = y > 54 ? (isOutline ? C_OUTLINE : C_BOOT_LIGHT) : (isOutline ? C_OUTLINE : C_JEANS_LIGHT);
        setPixel(k2, x, y, col[0], col[1], col[2]);
    }
}
// Extending thigh & knee
for (let y = 38; y <= 46; y++) {
    for (let x = 28; x <= 48; x++) {
        const isOutline = (y === 38 || y === 46);
        const col = isOutline ? C_OUTLINE : C_JEANS_LIGHT;
        setPixel(k2, x, y, col[0], col[1], col[2]);
    }
}
// Extending shin & boot forward
for (let y = 36; y <= 45; y++) {
    for (let x = 18; x <= 30; x++) {
        const isOutline = (x === 18 || y === 36 || y === 45);
        const col = isOutline ? C_OUTLINE : (x < 24 ? C_BOOT_LIGHT : C_JEANS_LIGHT);
        setPixel(k2, x, y, col[0], col[1], col[2]);
    }
}

// Generate Frame 3: Full Extended Kick (Apex impact!)
const k3 = clonePng(punch2);
// Replace punch arm with extended kicking leg
clearBox(k3, 10, 32, 60, 62);
// Supporting leg back & grounded
for (let y = 42; y <= 62; y++) {
    for (let x = 48; x <= 58; x++) {
        const isOutline = (x === 48 || x === 58 || y === 62);
        const col = y > 54 ? (isOutline ? C_OUTLINE : C_BOOT_LIGHT) : (isOutline ? C_OUTLINE : C_JEANS_LIGHT);
        setPixel(k3, x, y, col[0], col[1], col[2]);
    }
}
// Extended horizontal leg from hip to boot tip
for (let y = 34; y <= 42; y++) {
    for (let x = 12; x <= 50; x++) {
        const isOutline = (y === 34 || y === 42 || x === 12);
        let col = isOutline ? C_OUTLINE : C_JEANS_LIGHT;
        if (x < 22) col = isOutline ? C_OUTLINE : C_BOOT_LIGHT; // Boot front
        setPixel(k3, x, y, col[0], col[1], col[2]);
    }
}
// Heavy boot heel/toe shape
for (let y = 32; y <= 44; y++) {
    for (let x = 10; x <= 20; x++) {
        if (x + y < 58 && y - x < 30) {
            const isOutline = (x === 10 || y === 32 || y === 44);
            const col = isOutline ? C_OUTLINE : C_BOOT_DARK;
            setPixel(k3, x, y, col[0], col[1], col[2]);
        }
    }
}

// Generate Frame 4: Recovery / Foot Lowering
const k4 = clonePng(walk2);

fs.writeFileSync(path.join(kickDir, 'kick1.png'), PNG.sync.write(k1));
fs.writeFileSync(path.join(kickDir, 'kick2.png'), PNG.sync.write(k2));
fs.writeFileSync(path.join(kickDir, 'kick3.png'), PNG.sync.write(k3));
fs.writeFileSync(path.join(kickDir, 'kick4.png'), PNG.sync.write(k4));

console.log('Successfully generated 4 authentic pixel-art kick frames in:', kickDir);
