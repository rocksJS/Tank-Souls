
export enum Direction {
  UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3,
}

export enum TileType {
  EMPTY = 0,
  BRICK = 1,
  STEEL = 2,
  WATER = 3,
  GRASS = 4,
  BASE = 5,
  BRICK_DAMAGED = 6, // 2 hits left
  BRICK_BROKEN = 7,  // 1 hit left
  STEEL_DAMAGED_1 = 8, // 12-15 HP (Light cracks)
  STEEL_DAMAGED_2 = 9, // 8-11 HP (Medium cracks)
  STEEL_DAMAGED_3 = 10, // 1-7 HP (Heavy damage)
  FOG = 11, // New Fog Block
  WIRE = 12, // Barbed Wire (Kills player)
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity extends Position {
  width: number;
  height: number;
  direction: Direction;
  speed: number;
  id: string;
}

export interface Tentacle {
  angle: number;       // Current angle relative to boss
  targetAngle: number; // Where it wants to point (towards player)
  length: number;      // Current extension
  maxLength: number;   // Max reach
  wigglePhase: number; // For chaotic movement animation
}

export interface Tank extends Entity {
  type: 'player' | 'enemy' | 'boss';
  cooldown: number;
  isDead: boolean;
  hp: number;
  maxHp: number;
  // Boss Intro Specifics
  introState?: 'HIDDEN' | 'FALLING' | 'LANDING' | 'IDLE' | 'FIGHT' | 'DORMANT' | 'APPEARING' | 'AWAKENING' | 'WAITING_FOR_HIT';
  introOffsetY?: number; // For falling animation
  introTimer?: number;
  // Boss Mechanics
  defenseBuffTimer?: number; // Frames remaining for 50% damage reduction
  hitsOnPlayer?: number; // Legacy tracking
  bulletCollisionCount?: number; // Counts bullet-vs-bullet collisions
  shotgunCooldown?: number; // Cooldown for passive ability
  
  // Sally (formerly Prophet) Boss Specials
  specialState?: 'IDLE' | 'PRE_CHARGE' | 'CHARGING' | 'FIRING' | 'SHOTGUN';
  specialTimer?: number;
  aimAngle?: number;
  burstCount?: number; // For shotgun bursts
  
  // Sally Phases
  phase?: 1 | 2 | 3 | 4;
  petrifyTimer?: number; // Phase 2 Invulnerability (Deprecated/Modified usage)
  vx?: number; // Phase 4 Physics X
  vy?: number; // Phase 4 Physics Y
  
  // New Sally Mechanics
  stunTimer?: number; // General stun (Backstab)
  backstabCooldown?: number; // Timer before she can be backstabbed again
  snakeFireTimer?: number; // Timer for snake hair firing
  moonDiscTimer?: number; // Timer for Phase 2 attack
  
  // Bloodseeker Mechanics
  bloodDropTimer?: number; // Timer for dropping blood pools
  biteState?: 'IDLE' | 'PRE_BITE' | 'BITING' | 'COOLDOWN' | 'RETREAT';
  biteTimer?: number;
  wireHitTimer?: number; // Invulnerability specifically from wire damage
  wireStayTimer?: number; // How long boss has been standing in wire
  rageTimer?: number; // Speed boost and aggression after wire trap
  driftVx?: number; // Inertia X
  driftVy?: number; // Inertia Y
  driftTimer?: number; // How long drift lasts
  retreatTimer?: number; // Timer for retreating after attack
  huntAngle?: number; // Angle for circling the player
  chaosTimer?: number; // Timer for chaotic movement direction change
  bigPoolTimer?: number; // Cooldown for Phase 2 Big Pool ability
  tentacles?: Tentacle[]; // Phase 2 Tentacles

  // Player Mechanics
  invulnerabilityTimer?: number; // Frames of invincibility (0.5s = 30 frames)
}

export interface Bullet extends Entity {
  owner: 'player' | 'enemy' | 'boss';
  active: boolean;
  vx?: number; // Velocity X for free-angle movement
  vy?: number; // Velocity Y for free-angle movement
  variant?: 'standard' | 'glasscannon' | 'red_snake' | 'moon_disc'; // New variant for special attacks
  bounceCount?: number; // For moon_disc
  homing?: boolean; // For Bloodseeker blood missiles
  homingTurnRate?: number; // How fast it turns
}

export interface Explosion extends Position {
  id: string;
  stage: number; // For animation
  active: boolean;
  type?: 'standard' | 'heal' | 'smoke' | 'impact' | 'boss_aura' | 'glitch' | 'fire' | 'laser_trace' | 'portal' | 'blood_pool' | 'saliva' | 'big_blood_pool';
  vx?: number;
  vy?: number;
  color?: string;
  angle?: number; // For laser trace
}

export type GameMap = TileType[][];

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  SHOP = 'SHOP',
}
