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

export const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3];