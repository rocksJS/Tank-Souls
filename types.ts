
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

export interface Tank extends Entity {
  type: 'player' | 'enemy' | 'boss';
  cooldown: number;
  isDead: boolean;
  hp: number;
  maxHp: number;
}

export interface Bullet extends Entity {
  owner: 'player' | 'enemy' | 'boss';
  active: boolean;
  vx?: number; // Velocity X for free-angle movement
  vy?: number; // Velocity Y for free-angle movement
  variant?: 'standard' | 'glasscannon'; // New variant for special attacks
}

export interface Explosion extends Position {
  id: string;
  stage: number; // For animation
  active: boolean;
}

export type GameMap = TileType[][];

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  SHOP = 'SHOP',
}