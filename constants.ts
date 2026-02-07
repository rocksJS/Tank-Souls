import { TileType } from './types';

export const TILE_SIZE = 32;
export const GRID_WIDTH = 26; // Widened from 13
export const GRID_HEIGHT = 20; // Increased from 13 to make the game taller
export const CANVAS_WIDTH = GRID_WIDTH * TILE_SIZE;
export const CANVAS_HEIGHT = GRID_HEIGHT * TILE_SIZE;

export const PLAYER_SPEED = 2;
export const ENEMY_SPEED = 0.375;
export const PLAYER_BULLET_SPEED = 3.75;
export const ENEMY_BULLET_SPEED = 3.25;
export const TANK_SIZE = 28; 
export const BULLET_SIZE = 4;
export const SHOOT_COOLDOWN = 30; 

// Player Constants
export const PLAYER_MAX_HP = 3;

// Boss Constants
export const BOSS_SIZE = 48; // Bigger tank
export const BOSS_HP = 30;
export const BOSS_SPEED = 0.45; // Increased by 20% (0.375 * 1.2)
export const BOSS_SHOOT_COOLDOWN = 80; // Increased fire rate by another 50% (120 / 1.5)
// Updated: Boss bullet speed equals Player movement speed
export const BOSS_BULLET_SPEED = PLAYER_SPEED; 

// Sally Boss (Level 3) - Formerly Prophet
export const SALLY_SIZE = TANK_SIZE * 3.5; // ~98
export const SALLY_HP = 30; // REDUCED BY 50% (was 60)
export const SALLY_SPEED = 0.5;
export const SALLY_BULLET_SPEED = BOSS_BULLET_SPEED * 0.85; // Reduced by 15%
export const SALLY_SNAKE_BULLET_SPEED = SALLY_BULLET_SPEED * 0.5; // 50% of normal bullet

// Bloodseeker Boss (Level 4)
export const BLOODSEEKER_HP = 40;
export const BLOODSEEKER_SIZE = 40;
export const BLOODSEEKER_BASE_SPEED = 1.0;
export const BLOODSEEKER_MAX_SPEED = 3.5; // Very fast when low HP
export const BLOOD_POOL_DURATION = 150; // Reduced to 2.5 seconds (60fps * 2.5) -> Then explodes
export const BLOOD_POOL_DROP_RATE = 40; 
export const BLOODSEEKER_BITE_RANGE = 180; // Doubled (was 90)
export const BLOODSEEKER_PRE_BITE_DURATION = 72; // 1.2s
export const BLOODSEEKER_BITE_DURATION = 20; // Lunge duration
export const BLOODSEEKER_BITE_COOLDOWN = 90; // Reduced to 1.5 seconds (was 330)
export const BLOODSEEKER_DRIFT_DURATION = 90; // 1.5 seconds inertia
export const BLOODSEEKER_RETREAT_DURATION = 20; // 0.33s retreat
export const BLOODSEEKER_HUNT_RADIUS = 160; // Distance to maintain while circling
export const BLOODSEEKER_WIRE_TOLERANCE = 120; // 2 seconds allowed in wire before rage
export const BLOODSEEKER_RAGE_DURATION = 240; // 4 seconds speed buff
export const BLOODSEEKER_MISSILE_SPEED = PLAYER_BULLET_SPEED / 1.5; // 1.5x slower than player bullet
export const BLOODSEEKER_BIG_POOL_DURATION = 300; // 5 seconds
export const BLOODSEEKER_BIG_POOL_COOLDOWN = 480; // 8 seconds
export const BLOODSEEKER_BIG_POOL_RADIUS = 240; // 10x standard ~24 radius
export const BLOODSEEKER_TENTACLE_COUNT = 5;
export const BLOODSEEKER_TENTACLE_MAX_LENGTH = 100; // ~3 blocks

// Boss Phase 2 - Glasscannon Ability
export const GLASSCANNON_COOLDOWN = 12 * 60; // 12 seconds * 60 FPS
export const GLASSCANNON_SIZE = BULLET_SIZE * 3;
export const GLASSCANNON_SPEED_FACTOR = 0.5; // 50% of owner's bullet speed
export const BOSS_RAGE_SPEED_MULT = 3.0; // 3x speed in rage mode dashes

// Sally Mechanics
export const SALLY_AWAKEN_DURATION = 240; // 4 seconds (60fps)
export const SALLY_PETRIFY_DURATION = 480; // 8 seconds (60fps) - Phase 2
export const SALLY_PHASE_4_BASE_SPEED = 4.0;
export const SALLY_BACKSTAB_DURATION = 300; // 5 seconds stun (was 120/2s)
export const SALLY_BACKSTAB_COOLDOWN = 600; // 10 seconds cooldown (5s stun + 5s immunity)

// Sally Laser Ability
export const SALLY_LASER_COOLDOWN = 180; // 3 seconds between cycles
export const SALLY_PRE_CHARGE = 6; // 0.1 seconds
export const SALLY_CHARGE = 78; // 1.3 seconds
export const SALLY_LASER_DURATION = 30; // 0.5 seconds firing
export const SALLY_LASER_WIDTH = 16; 
export const SALLY_LASER_TRACE_DURATION = 120; // 2 seconds

// Sally Shotgun Ability
export const SALLY_SHOTGUN_BURST_DELAY = 12; // 0.2 seconds between bursts
export const SALLY_SHOTGUN_BULLET_COUNT = 15; // REDUCED BY 25% (was 20)

// Sally Phase 2 Moon Disc
export const SALLY_MOON_DISC_SPEED = 2.1; // Reduced by 40% (was 3.5)
export const SALLY_MOON_DISC_COOLDOWN = 90; // 1.5 seconds
export const SALLY_MOON_DISC_SIZE = 8;
export const SALLY_MOON_DISC_BOUNCES = 2; // Bounces 2 times then disappears

export const COLORS = {
  BACKGROUND: '#000000',
  BRICK: '#808080', // Gray Stone/Brick
  STEEL: '#888888', // Old steel
  WATER: '#0044CC',
  GRASS: '#006400',
  BASE: '#DAA520', // Golden
  PLAYER: '#FFD700', // Gold (Chosen Undead)
  ENEMY: '#A9A9A9', // Silver/Hollows
  BOSS: '#8B0000', // Dark Red
  BOSS_DETAIL: '#FF0000',
  BULLET: '#FFFFFF',
  WIRE: '#CCCCCC', // Light gray for wire
};

// Level 1: Standard layout (Extended height)
const LEVEL_1 = [
  // Top section (filled cavity)
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 2, 0, 1, 0, 0, 1, 0, 2, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // Original layout below
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 2, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 2, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0],
  [0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 2, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 2, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Helper to create empty row filled with value
const row = (val: number) => Array(GRID_WIDTH).fill(val);
// Helper to create pillar row: fog everywhere except pillars at 4,5 and 20,21
const pillarRow = (val: number, pillarVal: number) => {
    const r = Array(GRID_WIDTH).fill(val);
    r[4] = pillarVal; r[5] = pillarVal;
    r[20] = pillarVal; r[21] = pillarVal;
    return r;
};

// Level 2: Boss Arena with Fog Blocks
// Rows 0-15 filled with Fog (11) where empty, covering top AND bottom pillars
const LEVEL_2 = [
    row(11), row(11),
    pillarRow(11, 2), pillarRow(11, 2),
    row(11), row(11), row(11), row(11),
    row(11), row(11), row(11), row(11),
    row(11), row(11), row(11), row(11),
    pillarRow(11, 2), pillarRow(11, 2),
    row(0), row(0) // Removed Fog from bottom 2 rows
];

// Level 3: Sally Arena (Filled with Fog for intro, except bottom)
const LEVEL_3 = [];
for(let y = 0; y < GRID_HEIGHT; y++) {
  if (y >= GRID_HEIGHT - 2) {
      LEVEL_3.push(row(0)); // Removed Fog from bottom 2 rows
  } else {
      LEVEL_3.push(row(11)); // Filled with FOG (11)
  }
}

// Level 4: Barbed Wire Arena (Wire on sides, 4 Steel pillars in center)
const LEVEL_4 = [];
const WIRE = 12;
const STEEL = 2;
const FOG = 11;

for(let y = 0; y < GRID_HEIGHT; y++) {
    const r = Array(GRID_WIDTH).fill(FOG); // Start with FOG
    
    // Wire on sides (Outer Walls)
    r[0] = WIRE;
    r[GRID_WIDTH - 1] = WIRE;

    // Clear Fog at bottom for player spawn area
    if (y >= GRID_HEIGHT - 2) {
        for(let x = 1; x < GRID_WIDTH - 1; x++) {
            r[x] = 0;
        }
    }

    // 4 Central Pillars (Steel 2x2 blocks)
    // Pillar X: 10,11 and 14,15
    if (y === 7 || y === 8 || y === 12 || y === 13) {
        r[10] = STEEL; r[11] = STEEL;
        r[14] = STEEL; r[15] = STEEL;
        
        // Add Wire Traps Flanking the Pillars (For baiting)
        // Left of Left Pillar
        r[7] = WIRE; 
        // Right of Right Pillar
        r[18] = WIRE; 
    }

    LEVEL_4.push(r);
}

export const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4];