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
  type: 'player' | 'enemy';
  cooldown: number;
  isDead: boolean;
}

export interface Bullet extends Entity {
  owner: 'player' | 'enemy';
  active: boolean;
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
}