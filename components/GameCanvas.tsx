import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLORS,
  ENEMY_SPEED,
  GRID_HEIGHT,
  GRID_WIDTH,
  LEVELS,
  PLAYER_SPEED,
  SHOOT_COOLDOWN,
  TANK_SIZE,
  TILE_SIZE,
  PLAYER_BULLET_SPEED,
  ENEMY_BULLET_SPEED,
  BULLET_SIZE,
  PLAYER_MAX_HP,
  BOSS_HP,
  BOSS_SIZE,
  BOSS_SPEED,
  BOSS_SHOOT_COOLDOWN,
  BOSS_BULLET_SPEED,
  GLASSCANNON_COOLDOWN,
  GLASSCANNON_SIZE,
  GLASSCANNON_SPEED_FACTOR,
  BOSS_RAGE_SPEED_MULT,
  SALLY_SIZE,
  SALLY_HP,
  SALLY_SPEED,
  SALLY_BULLET_SPEED,
  SALLY_SNAKE_BULLET_SPEED,
  SALLY_LASER_COOLDOWN,
  SALLY_PRE_CHARGE,
  SALLY_CHARGE,
  SALLY_LASER_DURATION,
  SALLY_LASER_WIDTH,
  SALLY_LASER_TRACE_DURATION,
  SALLY_SHOTGUN_BURST_DELAY,
  SALLY_SHOTGUN_BULLET_COUNT,
  SALLY_PETRIFY_DURATION,
  SALLY_PHASE_4_BASE_SPEED,
  SALLY_BACKSTAB_DURATION,
  SALLY_BACKSTAB_COOLDOWN,
  SALLY_AWAKEN_DURATION,
  SALLY_MOON_DISC_SPEED,
  SALLY_MOON_DISC_COOLDOWN,
  SALLY_MOON_DISC_SIZE,
  SALLY_MOON_DISC_BOUNCES,
  BLOODSEEKER_HP,
  BLOODSEEKER_SIZE,
  BLOODSEEKER_BASE_SPEED,
  BLOODSEEKER_MAX_SPEED,
  BLOOD_POOL_DURATION,
  BLOOD_POOL_DROP_RATE,
  BLOODSEEKER_BITE_RANGE,
  BLOODSEEKER_PRE_BITE_DURATION,
  BLOODSEEKER_BITE_DURATION,
  BLOODSEEKER_BITE_COOLDOWN,
  BLOODSEEKER_DRIFT_DURATION,
  BLOODSEEKER_RETREAT_DURATION,
  BLOODSEEKER_HUNT_RADIUS,
  BLOODSEEKER_WIRE_TOLERANCE,
  BLOODSEEKER_RAGE_DURATION,
  BLOODSEEKER_MISSILE_SPEED,
  BLOODSEEKER_BIG_POOL_DURATION,
  BLOODSEEKER_BIG_POOL_COOLDOWN,
  BLOODSEEKER_BIG_POOL_RADIUS,
  BLOODSEEKER_TENTACLE_COUNT,
  BLOODSEEKER_TENTACLE_MAX_LENGTH
} from '../constants';
import {
  Direction,
  GameState,
  Tank,
  TileType,
  Bullet,
  Explosion,
} from '../types';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setEnemiesLeft: React.Dispatch<React.SetStateAction<number>>;
  level: number;
  gameSessionId: number;
  onPlayerDeath: () => void;
  estusUnlocked: boolean;
  estusCharges: number;
  setEstusCharges: React.Dispatch<React.SetStateAction<number>>;
  infiniteEstus: boolean;
  setPlayerHp: React.Dispatch<React.SetStateAction<number>>;
}

// Color Utility
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
};

const blendColors = (c1: string, c2: string, t: number) => {
    const rgb1 = hexToRgb(c1);
    const rgb2 = hexToRgb(c2);
    const r = rgb1.r + (rgb2.r - rgb1.r) * t;
    const g = rgb1.g + (rgb2.g - rgb1.g) * t;
    const b = rgb1.b + (rgb2.b - rgb1.b) * t;
    return rgbToHex(r, g, b);
};

const SALLY_APPEAR_DURATION = 120; // 2 seconds for portal rise

const GameCanvas: React.FC<GameCanvasProps> = ({ 
    gameState, setGameState, setScore, setEnemiesLeft, level, gameSessionId, onPlayerDeath,
    estusUnlocked, estusCharges, setEstusCharges, infiniteEstus, setPlayerHp
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs
  const mapRef = useRef<TileType[][]>([]);
  const tileHpRef = useRef<number[][]>([]); // Track specific HP for tiles
  const godModeRef = useRef<boolean>(false); // CHEAT: Invincibility

  const spawnXTile = Math.floor(GRID_WIDTH / 2) - 2;
  const spawnX = spawnXTile * TILE_SIZE + (TILE_SIZE - TANK_SIZE) / 2;

  const playerRef = useRef<Tank>({
    x: spawnX,
    y: (GRID_HEIGHT - 1) * TILE_SIZE + (TILE_SIZE - TANK_SIZE) / 2,
    width: TANK_SIZE,
    height: TANK_SIZE,
    direction: Direction.UP,
    speed: PLAYER_SPEED,
    id: 'player',
    type: 'player',
    cooldown: 0,
    isDead: false,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    invulnerabilityTimer: 0
  });
  
  const enemiesRef = useRef<Tank[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const moveKeysRef = useRef<string[]>([]);
  const baseActiveRef = useRef<boolean>(true);
  const enemySpawnTimerRef = useRef<number>(0);
  const enemiesToSpawnRef = useRef<number>(20);
  const bossSpawnedRef = useRef<boolean>(false);
  const bossSpecialTimerRef = useRef<number>(0); // Timer for Glasscannon
  
  // Chaotic movement refs
  const bossDashTimerRef = useRef<number>(0);
  const bossDashVectorRef = useRef<{x: number, y: number}>({x: 0, y: 0});
  
  // Use a ref to track current charges inside the game loop to avoid stale closures,
  // but we also need to update the parent state.
  const estusChargesRef = useRef<number>(estusCharges);
  
  // Sync ref with prop
  useEffect(() => {
    estusChargesRef.current = estusCharges;
  }, [estusCharges]);

  // Helper: Reset Game
  const resetGame = useCallback(() => {
    // Select map
    const levelIndex = Math.max(0, Math.min(level - 1, LEVELS.length - 1));
    const layout = LEVELS[levelIndex];
    
    // Deep copy the map
    const newMap = JSON.parse(JSON.stringify(layout));
    
    // Initialize Tile HP Grid
    const newTileHp = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));

    // Explicitly set base and walls ONLY for Level 1
    if (level === 1) {
        const centerX = Math.floor(GRID_WIDTH / 2);
        const gridY = GRID_HEIGHT - 1;
        newMap[gridY][centerX] = TileType.BASE;
        newMap[gridY][centerX-1] = TileType.BRICK;
        newMap[gridY][centerX+1] = TileType.BRICK;
        newMap[gridY-1][centerX] = TileType.BRICK;
        newMap[gridY-1][centerX-1] = TileType.BRICK;
        newMap[gridY-1][centerX+1] = TileType.BRICK;
    } else if (level === 2) {
       // Level 2 Setup
       setEnemiesLeft(1); // Only JUGG left
    } else if (level === 3) {
       // Level 3 Setup - Sally
       setEnemiesLeft(1); // Only Sally left
    } else if (level === 4) {
       setEnemiesLeft(1); // BLOODSEEKER
    }

    // Set HP values based on map
    for(let y=0; y<GRID_HEIGHT; y++) {
        for(let x=0; x<GRID_WIDTH; x++) {
            if (newMap[y][x] === TileType.STEEL) {
                newTileHp[y][x] = 16;
            } else if (newMap[y][x] === TileType.BRICK) {
                newTileHp[y][x] = 1; // Bricks handle states differently in legacy, but let's init default
            }
        }
    }

    mapRef.current = newMap;
    tileHpRef.current = newTileHp;
    
    // Recalculate spawn
    const sX = (Math.floor(GRID_WIDTH / 2) - 2) * TILE_SIZE + (TILE_SIZE - TANK_SIZE) / 2;

    playerRef.current = {
      x: sX,
      y: (GRID_HEIGHT - 1) * TILE_SIZE + (TILE_SIZE - TANK_SIZE) / 2,
      width: TANK_SIZE,
      height: TANK_SIZE,
      direction: Direction.UP,
      speed: PLAYER_SPEED,
      id: 'player',
      type: 'player',
      cooldown: 0,
      isDead: false,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      invulnerabilityTimer: 0
    };
    // Sync UI HP
    setPlayerHp(PLAYER_MAX_HP);

    enemiesRef.current = [];
    bulletsRef.current = [];
    explosionsRef.current = [];
    baseActiveRef.current = true;
    enemySpawnTimerRef.current = 0;
    
    // Spawning Setup
    if (level === 1) {
        enemiesToSpawnRef.current = 20;
    } else {
        enemiesToSpawnRef.current = 0;
    }

    moveKeysRef.current = [];
    setScore(0);
    bossSpecialTimerRef.current = 0;
    bossDashTimerRef.current = 0;
    bossDashVectorRef.current = {x: 0, y: 0};

    // Spawn Boss Immediately for Level 2 (DORMANT state)
    if (level === 2) {
         enemiesRef.current.push({
            x: (GRID_WIDTH / 2) * TILE_SIZE - BOSS_SIZE / 2,
            y: TILE_SIZE * 2, // Starts at landing spot
            width: BOSS_SIZE,
            height: BOSS_SIZE,
            direction: Direction.DOWN,
            speed: BOSS_SPEED,
            id: 'JUGG',
            type: 'boss',
            cooldown: 0,
            isDead: false,
            hp: BOSS_HP,
            maxHp: BOSS_HP,
            introState: 'DORMANT', // Waiting for fog clear
            introOffsetY: 0,
            introTimer: 0,
            defenseBuffTimer: 0,
            hitsOnPlayer: 0, 
            bulletCollisionCount: 0,
            shotgunCooldown: 0,
        });
        bossSpawnedRef.current = true;
    } 
    // Spawn SALLY for Level 3
    else if (level === 3) {
        enemiesRef.current.push({
            x: (GRID_WIDTH / 2) * TILE_SIZE - SALLY_SIZE / 2,
            y: (GRID_HEIGHT / 2) * TILE_SIZE - SALLY_SIZE / 2, // Middle of screen
            width: SALLY_SIZE,
            height: SALLY_SIZE,
            direction: Direction.DOWN,
            speed: SALLY_SPEED,
            id: 'SALLY',
            type: 'boss',
            cooldown: 0,
            isDead: false,
            hp: SALLY_HP,
            maxHp: SALLY_HP,
            introState: 'DORMANT', // Start dormant for intro animation
            introOffsetY: 0,
            introTimer: 0,
            defenseBuffTimer: 0,
            specialState: 'IDLE',
            specialTimer: 0,
            aimAngle: 0,
            phase: 1,
            petrifyTimer: 0,
            stunTimer: 0,
            backstabCooldown: 0,
            snakeFireTimer: 0,
            moonDiscTimer: 0
        });
        bossSpawnedRef.current = true;
    }
    // Spawn BLOODSEEKER for Level 4
    else if (level === 4) {
        enemiesRef.current.push({
            x: (GRID_WIDTH / 2) * TILE_SIZE - BLOODSEEKER_SIZE / 2,
            y: (GRID_HEIGHT / 2) * TILE_SIZE - BLOODSEEKER_SIZE / 2,
            width: BLOODSEEKER_SIZE,
            height: BLOODSEEKER_SIZE,
            direction: Direction.DOWN,
            speed: BLOODSEEKER_BASE_SPEED,
            id: 'BLOODSEEKER',
            type: 'boss',
            cooldown: 0,
            isDead: false,
            hp: BLOODSEEKER_HP,
            maxHp: BLOODSEEKER_HP,
            introState: 'FIGHT', // Immediate fight
            introOffsetY: 0,
            introTimer: 0,
            bloodDropTimer: 0,
            biteState: 'IDLE',
            biteTimer: 0,
            wireHitTimer: 0,
            wireStayTimer: 0,
            driftVx: 0,
            driftVy: 0,
            driftTimer: 0,
            retreatTimer: 0,
            huntAngle: 0,
            rageTimer: 0,
            chaosTimer: 0,
            bigPoolTimer: 0,
            tentacles: [] // Initialize empty
        });
        bossSpawnedRef.current = true;
    }
    else {
        bossSpawnedRef.current = false;
    }

  }, [setScore, level, setEnemiesLeft, setPlayerHp]);

  useEffect(() => {
     resetGame();
  }, [gameSessionId, resetGame]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      const moveCodes = ['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'];
      if (moveCodes.includes(e.code)) {
         if (!moveKeysRef.current.includes(e.code)) {
             moveKeysRef.current.push(e.code);
         }
      }

      // RESTART LEVEL
      if (e.code === 'KeyR' && gameState === GameState.PLAYING) {
          resetGame();
          return;
      }

      // GOD MODE TOGGLE
      if (e.code === 'KeyJ' && gameState === GameState.PLAYING) {
          godModeRef.current = !godModeRef.current;
          // Visual feedback
          explosionsRef.current.push({
             x: playerRef.current.x + playerRef.current.width/2,
             y: playerRef.current.y + playerRef.current.height/2,
             id: Math.random().toString(),
             stage: 20,
             active: true,
             type: 'impact' // Simple pop
          });
          return;
      }

      // Estus Healing Logic (Updated for Infinite Use if Unlocked and Bone Active)
      if (e.code === 'KeyE' && gameState === GameState.PLAYING) {
         if (estusUnlocked) {
             const player = playerRef.current;
             if (!player.isDead && player.hp < player.maxHp) {
                 let healed = false;
                 if (infiniteEstus) {
                     // Infinite mode: No charge usage
                     player.hp += 1;
                     healed = true;
                 } else if (estusChargesRef.current > 0) {
                     // Normal mode: Consume charge
                     player.hp += 1;
                     setEstusCharges(prev => prev - 1); 
                     estusChargesRef.current -= 1; // Sync local ref immediately
                     healed = true;
                 }
                 
                 if (healed) {
                     setPlayerHp(player.hp); // Sync UI
                     explosionsRef.current.push({ 
                        x: player.x, 
                        y: player.y, 
                        id: Math.random().toString(), 
                        stage: 20, 
                        active: true, 
                        type: 'heal'
                     });
                 }
             }
         }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
      moveKeysRef.current = moveKeysRef.current.filter(k => k !== e.code);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [estusUnlocked, gameState, setEstusCharges, infiniteEstus, setPlayerHp, resetGame]);

  // Utility: AABB Collision
  const checkRectCollision = (r1: { x: number; y: number; width: number; height: number }, r2: { x: number; y: number; width: number; height: number }) => {
    return (
      r1.x < r2.x + r2.width &&
      r1.x + r1.width > r2.x &&
      r1.y < r2.y + r2.height &&
      r1.y + r1.height > r2.y
    );
  };

  // Utility: Laser Collision Check (Line segment to Circle approximate)
  const checkLaserCollision = (
    boss: Tank, 
    angle: number, 
    player: Tank, 
    laserWidth: number
  ): boolean => {
    // Laser start point (boss center)
    const bx = boss.x + boss.width / 2;
    const by = boss.y + boss.height / 2;
    
    // Laser end point (far off screen)
    const length = 1000;
    const lx = bx + Math.cos(angle) * length;
    const ly = by + Math.sin(angle) * length;
    
    // Player center and radius
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const radius = player.width / 2;
    
    // Vector AB (Laser)
    const abx = lx - bx;
    const aby = ly - by;
    
    // Vector AP (Boss to Player)
    const apx = px - bx;
    const apy = py - by;
    
    // Project AP onto AB (t = (AP . AB) / (AB . AB))
    const t = (apx * abx + apy * aby) / (abx * abx + aby * aby);
    
    // Find closest point on line segment
    let closestX, closestY;
    if (t < 0) {
        closestX = bx;
        closestY = by;
    } else if (t > 1) {
        closestX = lx;
        closestY = ly;
    } else {
        closestX = bx + t * abx;
        closestY = by + t * aby;
    }
    
    // Distance from closest point to player center
    const dx = px - closestX;
    const dy = py - closestY;
    const distSq = dx * dx + dy * dy;
    
    // Hit if distance is less than sum of radii (laser half-width + player radius)
    const minDist = radius + laserWidth / 2;
    return distSq < minDist * minDist;
  };

  // Utility: Damage Tile
  const damageTile = (x: number, y: number) => {
      if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
          const tile = mapRef.current[y][x];
          
          if (tile === TileType.BRICK) {
              mapRef.current[y][x] = TileType.BRICK_DAMAGED;
          } else if (tile === TileType.BRICK_DAMAGED) {
              mapRef.current[y][x] = TileType.BRICK_BROKEN;
          } else if (tile === TileType.BRICK_BROKEN) {
              mapRef.current[y][x] = TileType.EMPTY;
          } 
          // Steel is now indestructible, removed damage logic
      }
  };

  // Utility: Check Map Collision
  const checkMapCollision = (rect: { x: number; y: number; width: number; height: number }, entityType?: 'player' | 'boss' | 'enemy') => {
    const startX = Math.floor(rect.x / TILE_SIZE);
    const endX = Math.floor((rect.x + rect.width - 0.1) / TILE_SIZE);
    const startY = Math.floor(rect.y / TILE_SIZE);
    const endY = Math.floor((rect.y + rect.height - 0.1) / TILE_SIZE);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
          const tile = mapRef.current[y][x];
          
          // Special Case: Boss can walk through WIRE (to take damage)
          if (entityType === 'boss' && tile === TileType.WIRE) {
              continue; 
          }

          if (
              tile === TileType.BRICK || 
              tile === TileType.BRICK_DAMAGED || 
              tile === TileType.BRICK_BROKEN || 
              tile === TileType.STEEL || 
              tile === TileType.STEEL_DAMAGED_1 || 
              tile === TileType.STEEL_DAMAGED_2 || 
              tile === TileType.STEEL_DAMAGED_3 || 
              tile === TileType.WATER || 
              tile === TileType.BASE ||
              tile === TileType.WIRE 
            ) {
            return true;
          }
        } else {
            return true;
        }
      }
    }
    return false;
  };

  // Check collision for Boss specifically against Wire (for damage)
  const checkBossWireCollision = (boss: Tank): boolean => {
    const startX = Math.floor(boss.x / TILE_SIZE);
    const endX = Math.floor((boss.x + boss.width - 0.1) / TILE_SIZE);
    const startY = Math.floor(boss.y / TILE_SIZE);
    const endY = Math.floor((boss.y + boss.height - 0.1) / TILE_SIZE);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
          if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
              if (mapRef.current[y][x] === TileType.WIRE) {
                  return true;
              }
          }
      }
    }
    return false;
  };

  // Helper to check if player touched wire
  const checkWireDeath = (player: Tank) => {
    if (godModeRef.current) return false;

    const startX = Math.floor(player.x / TILE_SIZE);
    const endX = Math.floor((player.x + player.width - 0.1) / TILE_SIZE);
    const startY = Math.floor(player.y / TILE_SIZE);
    const endY = Math.floor((player.y + player.height - 0.1) / TILE_SIZE);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
          if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
              if (mapRef.current[y][x] === TileType.WIRE) {
                  return true;
              }
          }
      }
    }
    return false;
  };

  // Utility: Bullet Map Collision
  const checkBulletMapCollision = (bullet: Bullet): { hit: boolean; tileX: number; tileY: number } => {
    const centerX = bullet.x + bullet.width / 2;
    const centerY = bullet.y + bullet.height / 2;
    const tileX = Math.floor(centerX / TILE_SIZE);
    const tileY = Math.floor(centerY / TILE_SIZE);

    if (tileY >= 0 && tileY < GRID_HEIGHT && tileX >= 0 && tileX < GRID_WIDTH) {
        const tile = mapRef.current[tileY][tileX];
        if (
            tile === TileType.BRICK || 
            tile === TileType.BRICK_DAMAGED || 
            tile === TileType.BRICK_BROKEN ||
            tile === TileType.STEEL ||
            tile === TileType.STEEL_DAMAGED_1 || 
            tile === TileType.STEEL_DAMAGED_2 || 
            tile === TileType.STEEL_DAMAGED_3 ||
            tile === TileType.WIRE // Wire absorbs bullets
        ) {
             return { hit: true, tileX, tileY };
        }
        if (tile === TileType.BASE) {
             baseActiveRef.current = false;
             return { hit: true, tileX, tileY };
        }
    } else {
        if (centerX < 0 || centerX > CANVAS_WIDTH || centerY < 0 || centerY > CANVAS_HEIGHT) {
            return { hit: true, tileX: -1, tileY: -1 };
        }
    }
    return { hit: false, tileX: -1, tileY: -1 };
  }

  // Check and clear fog on player overlap
  const checkFogOverlap = (player: Tank) => {
    const startX = Math.floor(player.x / TILE_SIZE);
    const endX = Math.floor((player.x + player.width - 0.1) / TILE_SIZE);
    const startY = Math.floor(player.y / TILE_SIZE);
    const endY = Math.floor((player.y + player.height - 0.1) / TILE_SIZE);

    let hitFog = false;

    // First Check: Did we hit any fog tile?
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
          if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
              if (mapRef.current[y][x] === TileType.FOG) {
                  hitFog = true;
                  break;
              }
          }
      }
      if (hitFog) break;
    }

    // If we hit fog, clear ALL fog tiles on the map
    if (hitFog) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (mapRef.current[y][x] === TileType.FOG) {
                    mapRef.current[y][x] = TileType.EMPTY;
                    // Spawn smoke puff for effect on every cleared tile
                    if (Math.random() > 0.7) { 
                        explosionsRef.current.push({
                            x: x * TILE_SIZE + TILE_SIZE/2,
                            y: y * TILE_SIZE + TILE_SIZE/2,
                            id: Math.random().toString(),
                            stage: 23, 
                            active: true,
                            type: 'smoke'
                        });
                    }
                }
            }
        }

        // --- TRIGGER BOSS AWAKENING ---
        const boss = enemiesRef.current.find(e => e.type === 'boss');
        if (boss && boss.introState === 'DORMANT') {
            if (boss.id === 'SALLY') {
                // Level 3: Immediate Fight
                boss.introState = 'FIGHT';
                // Explosion to announce appearance
                explosionsRef.current.push({ 
                    x: boss.x + boss.width/2, 
                    y: boss.y + boss.height/2, 
                    id: Math.random().toString(), 
                    stage: 20, 
                    active: true, 
                    type: 'smoke' 
                });
            } else {
                // Level 2 (Juggernaut): Immediate appear sequence
                boss.introState = 'APPEARING';
                boss.introTimer = SALLY_APPEAR_DURATION; 
            }
        }
    }
  };

  // Update Loop
  const update = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    // --- Player Movement ---
    const player = playerRef.current;
    if (!player.isDead) {
        // Decrease invulnerability timer
        if (player.invulnerabilityTimer && player.invulnerabilityTimer > 0) {
            player.invulnerabilityTimer--;
        }

        // Calculate Move Speed (Effect of Big Blood Pool)
        let speedModifier = 1.0;
        // Check if player is inside any active Big Blood Pool
        const px = player.x + player.width/2;
        const py = player.y + player.height/2;
        
        for (const exp of explosionsRef.current) {
            if ((exp as any).type === 'big_blood_pool' && exp.active) {
                const dx = px - exp.x;
                const dy = py - exp.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < BLOODSEEKER_BIG_POOL_RADIUS) {
                    speedModifier = 0.75; // 25% Slow
                    break; 
                }
            }
        }

        const moveSpeed = player.speed * speedModifier;

        let dx = 0;
        let dy = 0;
        let moved = false;
        let newDir = player.direction;
        const lastKey = moveKeysRef.current[moveKeysRef.current.length - 1];

        if (lastKey) {
            if (lastKey === 'ArrowUp' || lastKey === 'KeyW') { dy = -moveSpeed; newDir = Direction.UP; moved = true; }
            else if (lastKey === 'ArrowDown' || lastKey === 'KeyS') { dy = moveSpeed; newDir = Direction.DOWN; moved = true; }
            else if (lastKey === 'ArrowLeft' || lastKey === 'KeyA') { dx = -moveSpeed; newDir = Direction.LEFT; moved = true; }
            else if (lastKey === 'ArrowRight' || lastKey === 'KeyD') { dx = moveSpeed; newDir = Direction.RIGHT; moved = true; }
        }

        if (moved) {
            if (player.direction !== newDir) {
                 const centerX = player.x + player.width / 2;
                 const centerY = player.y + player.height / 2;
                 if (newDir === Direction.UP || newDir === Direction.DOWN) {
                     const tileCol = Math.floor(centerX / TILE_SIZE);
                     const tileCenterX = tileCol * TILE_SIZE + TILE_SIZE/2;
                     if (Math.abs(centerX - tileCenterX) < 10) player.x = tileCenterX - player.width/2;
                 } else {
                     const tileRow = Math.floor(centerY / TILE_SIZE);
                     const tileCenterY = tileRow * TILE_SIZE + TILE_SIZE/2;
                     if (Math.abs(centerY - tileCenterY) < 10) player.y = tileCenterY - player.height/2;
                 }
                 player.direction = newDir;
            }

            const nextX = player.x + dx;
            const nextY = player.y + dy;
            
            // Check Wire Death
            if (checkWireDeath({...player, x: nextX, y: nextY})) {
                // Kill player
                player.hp = 0;
                setPlayerHp(0);
                player.isDead = true;
                setGameState(GameState.GAME_OVER);
                onPlayerDeath();
                explosionsRef.current.push({ x: player.x, y: player.y, id: Math.random().toString(), stage: 20, active: true, type: 'impact' });
            } 
            else if (!checkMapCollision({ ...player, x: nextX, y: nextY }, 'player')) {
                player.x = nextX;
                player.y = nextY;
                
                // Check Fog Interaction
                checkFogOverlap(player);
            }
        }

        // Shooting
        if (player.cooldown > 0) player.cooldown--;
        if (keysRef.current['Space'] && player.cooldown === 0) {
            bulletsRef.current.push({
                x: player.x + player.width / 2 - BULLET_SIZE / 2,
                y: player.y + player.height / 2 - BULLET_SIZE / 2,
                width: BULLET_SIZE,
                height: BULLET_SIZE,
                direction: player.direction,
                speed: PLAYER_BULLET_SPEED,
                owner: 'player',
                active: true,
                id: Math.random().toString(),
                variant: 'standard',
            });
            player.cooldown = SHOOT_COOLDOWN;
        }
    }

    // --- Enemy Spawning (Standard Levels) ---
    if (level === 1) { // Removed level 3 from standard spawning
        enemySpawnTimerRef.current++;
        if (enemySpawnTimerRef.current > 180 && enemiesRef.current.length < 4 && enemiesToSpawnRef.current > 0) {
            enemySpawnTimerRef.current = 0;
            const spawnPoints = [{x: 0, y: 0}, {x: Math.floor(GRID_WIDTH / 2) * TILE_SIZE, y: 0}, {x: (GRID_WIDTH - 1) * TILE_SIZE, y: 0}];
            const point = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
            const blocked = enemiesRef.current.some(e => checkRectCollision({...e}, {x: point.x, y: point.y, width: TANK_SIZE, height: TANK_SIZE})) || 
                            checkRectCollision(player, {x: point.x, y: point.y, width: TANK_SIZE, height: TANK_SIZE});
            
            if (!blocked) {
                enemiesRef.current.push({
                    x: point.x + (TILE_SIZE - TANK_SIZE)/2,
                    y: point.y + (TILE_SIZE - TANK_SIZE)/2,
                    width: TANK_SIZE,
                    height: TANK_SIZE,
                    direction: Direction.DOWN,
                    speed: ENEMY_SPEED,
                    id: Math.random().toString(),
                    type: 'enemy',
                    cooldown: 0,
                    isDead: false,
                    hp: 1,
                    maxHp: 1,
                });
                enemiesToSpawnRef.current--;
            }
        }
    }

    // --- Enemy AI ---
    enemiesRef.current.forEach(enemy => {
        // Boss Logic
        if (enemy.type === 'boss') {

            // --- BOSS INTRO LOGIC (Level 2 & 3) ---
            if (level === 2 || level === 3) {
                if (enemy.introState === 'DORMANT') {
                    // Waiting for fog to clear, logic handled in checkFogOverlap
                    return; 
                }
                
                // --- SALLY APPEARING ANIMATION (Level 2 Only uses this, Level 3 skips to Waiting) ---
                if (enemy.introState === 'APPEARING') {
                    if (enemy.introTimer && enemy.introTimer > 0) {
                        enemy.introTimer--;
                    } else {
                        enemy.introState = 'AWAKENING';
                        enemy.introTimer = SALLY_AWAKEN_DURATION; 
                    }
                    return;
                }

                // --- AWAKENING ANIMATION ---
                if (enemy.introState === 'AWAKENING') {
                    if (enemy.introTimer && enemy.introTimer > 0) {
                        enemy.introTimer--;
                        // Level 3 SALLY AWAKENING (Eye Glow -> Tentacle Move)
                        if (enemy.id === 'SALLY') {
                            // Phase 1 (0-2s): Eyes glow (Visuals in Draw)
                            // Phase 2 (2-4s): Tentacles move (Visuals in Draw)
                        } 
                        // Level 2 JUGGERNAUT AWAKENING
                        else {
                            const centerX = enemy.x + enemy.width / 2;
                            const centerY = enemy.y + enemy.height / 2;
                            if (enemy.introTimer % 3 === 0) {
                                 const angle = (enemy.introTimer / 5);
                                 const radius = 40;
                                 const px = centerX + Math.cos(angle) * radius;
                                 const py = centerY + Math.sin(angle) * radius;
                                 explosionsRef.current.push({
                                     x: px,
                                     y: py,
                                     id: Math.random().toString(),
                                     stage: 30, // Life
                                     active: true,
                                     type: 'boss_aura',
                                     vx: (centerX - px) * 0.05, // Suck in
                                     vy: (centerY - py) * 0.05
                                 });
                            }
                            // 2. Glitch Particles (Random squares)
                            if (Math.random() > 0.5) {
                                const range = 50;
                                const gx = centerX + (Math.random() - 0.5) * range;
                                const gy = centerY + (Math.random() - 0.5) * range;
                                const colors = ['#00FF00', '#FF00FF', '#00FFFF', '#FFFFFF'];
                                const color = colors[Math.floor(Math.random() * colors.length)];
                                explosionsRef.current.push({
                                    x: gx,
                                    y: gy,
                                    id: Math.random().toString(),
                                    stage: 5 + Math.floor(Math.random() * 5),
                                    active: true,
                                    type: 'glitch',
                                    color: color
                                });
                            }
                        }
                    } else {
                        // Start Fight
                        enemy.introState = 'FIGHT';
                        // Impact explosion on start
                        explosionsRef.current.push({ 
                            x: enemy.x + enemy.width/2, 
                            y: enemy.y + enemy.height/2, 
                            id: Math.random().toString(), 
                            stage: 20, 
                            active: true, 
                            type: 'impact'
                        });
                    }
                    return;
                }
            }
            // --- END BOSS INTRO ---
            
            // --- BLOODSEEKER LOGIC (Level 4) ---
            if (enemy.id === 'BLOODSEEKER') {
                if (!player.isDead) {
                    const centerX = enemy.x + enemy.width / 2;
                    const centerY = enemy.y + enemy.height / 2;
                    const pCenterX = player.x + player.width / 2;
                    const pCenterY = player.y + player.height / 2;

                    // PASSIVE POOL DROPPING
                    enemy.bloodDropTimer = (enemy.bloodDropTimer || 0) + 1;
                    if (enemy.bloodDropTimer > BLOOD_POOL_DROP_RATE) {
                        enemy.bloodDropTimer = 0;
                        if (Math.random() < 0.2) { // 20% chance every rate tick to drop pool if moving
                             explosionsRef.current.push({
                                 x: centerX,
                                 y: centerY,
                                 id: Math.random().toString(),
                                 stage: BLOOD_POOL_DURATION, 
                                 active: true,
                                 type: 'blood_pool'
                             });
                        }
                    }

                    // PHASE 2 LOGIC (HP < 50%)
                    const hpPercent = enemy.hp / enemy.maxHp;
                    const isPhase2 = hpPercent < 0.5;

                    if (isPhase2) {
                        // 1. BIG BLOOD POOL
                        if (enemy.bigPoolTimer === undefined) enemy.bigPoolTimer = 0;
                        
                        if (enemy.bigPoolTimer <= 0) {
                            // Cast Big Pool
                            explosionsRef.current.push({
                                x: pCenterX, // Center on player
                                y: pCenterY,
                                id: Math.random().toString(),
                                stage: BLOODSEEKER_BIG_POOL_DURATION, 
                                active: true,
                                type: 'big_blood_pool'
                            });
                            enemy.bigPoolTimer = BLOODSEEKER_BIG_POOL_COOLDOWN;
                            // Visual cue for casting
                            explosionsRef.current.push({ x: centerX, y: centerY, id: Math.random().toString(), stage: 20, active: true, type: 'boss_aura' });
                        } else {
                            enemy.bigPoolTimer--;
                        }

                        // 2. TENTACLES
                        if (!enemy.tentacles) enemy.tentacles = [];
                        
                        // Initialize tentacles if needed
                        if (enemy.tentacles.length === 0) {
                            for(let i=0; i<BLOODSEEKER_TENTACLE_COUNT; i++) {
                                enemy.tentacles.push({
                                    angle: (Math.PI * 2 / BLOODSEEKER_TENTACLE_COUNT) * i,
                                    targetAngle: 0,
                                    length: 0,
                                    maxLength: BLOODSEEKER_TENTACLE_MAX_LENGTH,
                                    wigglePhase: Math.random() * Math.PI * 2
                                });
                            }
                        }

                        // Update Tentacles
                        enemy.tentacles.forEach(tentacle => {
                            // Calculate angle to player
                            const angleToPlayer = Math.atan2(pCenterY - centerY, pCenterX - centerX);
                            // Bias tentacle towards player slightly + random wander
                            // Lerp angle
                            let diff = angleToPlayer - tentacle.angle;
                            while (diff < -Math.PI) diff += Math.PI * 2;
                            while (diff > Math.PI) diff -= Math.PI * 2;
                            
                            tentacle.angle += diff * 0.05; // Slow turn to player
                            tentacle.wigglePhase += 0.1;
                            const wiggle = Math.sin(tentacle.wigglePhase) * 0.5;
                            
                            // Pulse length
                            const targetLen = tentacle.maxLength * (0.8 + Math.sin(tentacle.wigglePhase * 0.5) * 0.2);
                            tentacle.length += (targetLen - tentacle.length) * 0.1;

                            // Collision Check (Tip of tentacle)
                            const tipX = centerX + Math.cos(tentacle.angle + wiggle) * tentacle.length;
                            const tipY = centerY + Math.sin(tentacle.angle + wiggle) * tentacle.length;
                            
                            // Check distance to player center
                            const dist = Math.sqrt((tipX - pCenterX)**2 + (tipY - pCenterY)**2);
                            if (dist < player.width) { // Hit
                                 if (!godModeRef.current && (!player.invulnerabilityTimer || player.invulnerabilityTimer <= 0)) {
                                      player.hp -= 1;
                                      setPlayerHp(player.hp);
                                      player.invulnerabilityTimer = 30;
                                      explosionsRef.current.push({ x: player.x, y: player.y, id: Math.random().toString(), stage: 10, active: true, type: 'impact' });
                                      if (player.hp <= 0) {
                                          player.isDead = true;
                                          setGameState(GameState.GAME_OVER);
                                          onPlayerDeath();
                                      }
                                 }
                            }
                        });
                    }

                    // WIRE DAMAGE LOGIC & TOLERANCE
                    if (enemy.wireHitTimer && enemy.wireHitTimer > 0) {
                        enemy.wireHitTimer--;
                    } 
                    
                    if (checkBossWireCollision(enemy)) {
                        // Take damage logic
                        if (!enemy.wireHitTimer) {
                            enemy.hp -= 1; 
                            enemy.wireHitTimer = 30; // 0.5s invulnerability
                            explosionsRef.current.push({ x: centerX, y: centerY, id: Math.random().toString(), stage: 5, active: true, type: 'impact' });
                            if (enemy.hp <= 0) {
                                enemy.isDead = true;
                                setScore(prev => prev + 2000);
                                setGameState(GameState.VICTORY);
                            }
                        }

                        // Tolerance / Rage Logic
                        enemy.wireStayTimer = (enemy.wireStayTimer || 0) + 1;
                        
                        // If stays too long, trigger Rage Buff
                        if (enemy.wireStayTimer > BLOODSEEKER_WIRE_TOLERANCE) {
                            enemy.rageTimer = BLOODSEEKER_RAGE_DURATION;
                            enemy.wireStayTimer = 0; // Reset
                            
                            // Visual cue for buff activation
                            explosionsRef.current.push({ x: centerX, y: centerY, id: Math.random().toString(), stage: 30, active: true, type: 'boss_aura' });
                            
                            // Spawn Projectiles Ring
                            const ringCount = 12;
                            for (let i = 0; i < ringCount; i++) {
                                const angle = (Math.PI * 2 / ringCount) * i;
                                bulletsRef.current.push({
                                    x: centerX,
                                    y: centerY,
                                    width: BULLET_SIZE,
                                    height: BULLET_SIZE,
                                    direction: Direction.DOWN,
                                    speed: PLAYER_BULLET_SPEED,
                                    owner: 'boss',
                                    active: true,
                                    id: Math.random().toString(),
                                    vx: Math.cos(angle) * PLAYER_BULLET_SPEED,
                                    vy: Math.sin(angle) * PLAYER_BULLET_SPEED,
                                    variant: 'red_snake'
                                });
                            }
                        }

                    } else {
                        // Not in wire, reset tolerance timer
                        enemy.wireStayTimer = 0;
                    }

                    // RAGE BUFF LOGIC
                    let currentSpeed = 0;
                    // 1. Calculate Base Speed based on HP
                    const missingHpPercent = 1.0 - hpPercent;
                    const baseSpeed = (BLOODSEEKER_BASE_SPEED + (BLOODSEEKER_MAX_SPEED - BLOODSEEKER_BASE_SPEED) * missingHpPercent);
                    
                    if (enemy.rageTimer && enemy.rageTimer > 0) {
                        enemy.rageTimer--;
                        currentSpeed = baseSpeed * 2.0; // 2x Speed
                        // Visual effect
                        if (enemy.rageTimer % 5 === 0) {
                             explosionsRef.current.push({ x: centerX, y: centerY, id: Math.random().toString(), stage: 10, active: true, type: 'saliva' });
                        }
                    } else {
                        currentSpeed = baseSpeed * 0.8; // Normal hunting speed
                    }

                    // STATE MACHINE: ATTACK LOGIC
                    if (!enemy.biteState) enemy.biteState = 'IDLE';

                    // COOLDOWN
                    if (enemy.biteState === 'COOLDOWN') {
                        enemy.biteTimer = (enemy.biteTimer || 0) - 1;
                        if (enemy.biteTimer <= 0) {
                            enemy.biteState = 'IDLE';
                        }
                    }

                    // IDLE (HUNTING/CIRCLING + CAUTION)
                    if (enemy.biteState === 'IDLE') {
                        const dist = Math.sqrt(Math.pow(centerX - pCenterX, 2) + Math.pow(centerY - pCenterY, 2));
                        
                        // Attack Trigger
                        if (dist < BLOODSEEKER_BITE_RANGE) {
                            enemy.biteState = 'PRE_BITE';
                            enemy.biteTimer = BLOODSEEKER_PRE_BITE_DURATION;
                            // Reset Drift for attack stability
                            enemy.driftTimer = 0;
                        } else {
                            // HUNTING MOVEMENT
                            
                            // 1. Calculate Base Movement Vector (Psychopath/Chaotic)
                            if (!enemy.chaosTimer) enemy.chaosTimer = 0;
                            enemy.chaosTimer--;
                            if (enemy.chaosTimer <= 0) {
                                enemy.chaosTimer = 10 + Math.random() * 20; 
                                const angleToPlayer = Math.atan2(pCenterY - centerY, pCenterX - centerX);
                                const randomOffset = (Math.random() - 0.5) * (Math.PI / 1.5); 
                                enemy.huntAngle = angleToPlayer + randomOffset;
                            }
                            
                            let moveAngle = enemy.huntAngle || 0;
                            let moveDx = Math.cos(moveAngle) * currentSpeed;
                            let moveDy = Math.sin(moveAngle) * currentSpeed;

                            // 2. CAUTION LOGIC (Phase 2 Only)
                            if (isPhase2) {
                                // A. Avoid WIRE tiles
                                // Scan 5x5 grid around boss center
                                const tileX = Math.floor(centerX / TILE_SIZE);
                                const tileY = Math.floor(centerY / TILE_SIZE);
                                let repulseX = 0;
                                let repulseY = 0;
                                
                                for(let ry = -2; ry <= 2; ry++) {
                                    for(let rx = -2; rx <= 2; rx++) {
                                        const ty = tileY + ry;
                                        const tx = tileX + rx;
                                        if (ty >= 0 && ty < GRID_HEIGHT && tx >= 0 && tx < GRID_WIDTH) {
                                            if (mapRef.current[ty][tx] === TileType.WIRE) {
                                                // Vector from wire center to boss
                                                const wx = tx * TILE_SIZE + TILE_SIZE/2;
                                                const wy = ty * TILE_SIZE + TILE_SIZE/2;
                                                const dx = centerX - wx;
                                                const dy = centerY - wy;
                                                const distSq = dx*dx + dy*dy;
                                                if (distSq < 10000 && distSq > 0) { // Within range
                                                    const force = 2000 / distSq; // Inverse square law
                                                    repulseX += dx * force;
                                                    repulseY += dy * force;
                                                }
                                            }
                                        }
                                    }
                                }

                                // B. Avoid Player if too close (Caution)
                                if (dist < 120) {
                                    const pdx = centerX - pCenterX;
                                    const pdy = centerY - pCenterY;
                                    repulseX += pdx * 0.05;
                                    repulseY += pdy * 0.05;
                                }

                                // Blend Repulsion into Movement
                                moveDx += repulseX;
                                moveDy += repulseY;
                                
                                // Cap speed
                                const totalSpeed = Math.sqrt(moveDx*moveDx + moveDy*moveDy);
                                if (totalSpeed > currentSpeed) {
                                    const scale = currentSpeed / totalSpeed;
                                    moveDx *= scale;
                                    moveDy *= scale;
                                }
                            }

                            // Apply movement with collision check
                            // Remove 'boss' flag to respect WIRE as solid during hunting/caution
                            let moved = false;
                            
                            // Check X
                            if (!checkMapCollision({...enemy, x: enemy.x + moveDx})) {
                                enemy.x += moveDx;
                                moved = true;
                            } else {
                                moveDx = 0;
                            }
                            
                            // Check Y
                            if (!checkMapCollision({...enemy, y: enemy.y + moveDy})) {
                                enemy.y += moveDy;
                                moved = true;
                            } else {
                                moveDy = 0;
                            }

                            if (moved) {
                                // Update visual direction based on primary movement axis
                                if (Math.abs(moveDx) > Math.abs(moveDy)) {
                                    enemy.direction = moveDx > 0 ? Direction.RIGHT : Direction.LEFT;
                                } else {
                                    enemy.direction = moveDy > 0 ? Direction.DOWN : Direction.UP;
                                }
                            }
                        }
                    }

                    // PRE_BITE (SHAKING & ALIGNING)
                    if (enemy.biteState === 'PRE_BITE') {
                        enemy.biteTimer = (enemy.biteTimer || 0) - 1;
                        
                        // Face the player
                        const angle = Math.atan2(pCenterY - centerY, pCenterX - centerX);
                        const cos = Math.cos(angle);
                        const sin = Math.sin(angle);
                        
                        if (Math.abs(cos) > Math.abs(sin)) {
                            enemy.direction = cos > 0 ? Direction.RIGHT : Direction.LEFT;
                        } else {
                            enemy.direction = sin > 0 ? Direction.DOWN : Direction.UP;
                        }

                        // Align to Player Axis Logic (To prevent missing stationary player)
                        // If facing Horizontal (Left/Right), align Y
                        const alignSpeed = 1.0;
                        if (enemy.direction === Direction.LEFT || enemy.direction === Direction.RIGHT) {
                            if (Math.abs(centerY - pCenterY) > 2) {
                                const alignDy = pCenterY > centerY ? alignSpeed : -alignSpeed;
                                if (!checkMapCollision({...enemy, y: enemy.y + alignDy}, 'boss')) {
                                    enemy.y += alignDy;
                                }
                            }
                        } 
                        // If facing Vertical (Up/Down), align X
                        else {
                            if (Math.abs(centerX - pCenterX) > 2) {
                                const alignDx = pCenterX > centerX ? alignSpeed : -alignSpeed;
                                if (!checkMapCollision({...enemy, x: enemy.x + alignDx}, 'boss')) {
                                    enemy.x += alignDx;
                                }
                            }
                        }

                        if (enemy.biteTimer <= 0) {
                            enemy.biteState = 'BITING';
                            enemy.biteTimer = BLOODSEEKER_BITE_DURATION;
                            // INERTIA SETUP: Start fast dash
                            const dashSpeed = 9.0;
                            if (enemy.direction === Direction.UP) { enemy.driftVx = 0; enemy.driftVy = -dashSpeed; }
                            else if (enemy.direction === Direction.DOWN) { enemy.driftVx = 0; enemy.driftVy = dashSpeed; }
                            else if (enemy.direction === Direction.LEFT) { enemy.driftVx = -dashSpeed; enemy.driftVy = 0; }
                            else if (enemy.direction === Direction.RIGHT) { enemy.driftVx = dashSpeed; enemy.driftVy = 0; }
                        }
                    }

                    // BITING (LUNGE)
                    else if (enemy.biteState === 'BITING') {
                        // Lunge forward fast - USE DRIFT VECTOR for direction
                        const dx = enemy.driftVx || 0;
                        const dy = enemy.driftVy || 0;
                        
                        // INERTIA LOGIC: use 'boss' type to IGNORE wire/hazards and keep moving (potentially taking damage)
                        // This allows the boss to be baited into wire.
                        if (!checkMapCollision({...enemy, x: enemy.x + dx, y: enemy.y + dy}, 'boss')) {
                            enemy.x += dx;
                            enemy.y += dy;
                        } else {
                             // Hit wall? Stop bite state early, move to recovery
                             enemy.biteTimer = 0;
                        }

                        // Spawn Particles (Saliva/Rage)
                        if (enemy.biteTimer && enemy.biteTimer % 4 === 0) {
                             const px = centerX + (Math.random() - 0.5) * 20;
                             const py = centerY + (Math.random() - 0.5) * 20;
                             explosionsRef.current.push({
                                 x: px, y: py,
                                 id: Math.random().toString(),
                                 stage: 15,
                                 active: true,
                                 type: 'saliva', // new type
                                 vx: (Math.random() - 0.5),
                                 vy: (Math.random() - 0.5)
                             });
                        }

                        enemy.biteTimer = (enemy.biteTimer || 0) - 1;
                        if (enemy.biteTimer <= 0) {
                            // Transition to RECOVERY (Slide) instead of direct retreat
                            enemy.biteState = 'RECOVERY';
                            // Reuse retreat timer as recovery timer
                            enemy.retreatTimer = 15; // Slide for 15 frames
                        }
                    }

                    // RECOVERY (INERTIA SLIDE)
                    else if (enemy.biteState === 'RECOVERY') {
                         if (enemy.retreatTimer && enemy.retreatTimer > 0) {
                             enemy.retreatTimer--;
                             
                             // Apply friction
                             const friction = 0.85;
                             enemy.driftVx = (enemy.driftVx || 0) * friction;
                             enemy.driftVy = (enemy.driftVy || 0) * friction;
                             
                             const dx = enemy.driftVx;
                             const dy = enemy.driftVy;
                             
                             // Keep moving if significant speed
                             if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                                 // Still ignore wire, but respect walls
                                 if (!checkMapCollision({...enemy, x: enemy.x + dx, y: enemy.y + dy}, 'boss')) {
                                     enemy.x += dx;
                                     enemy.y += dy;
                                 }
                             }
                         } else {
                             // Slide done, now retreat
                             enemy.biteState = 'RETREAT';
                             enemy.retreatTimer = BLOODSEEKER_RETREAT_DURATION;
                         }
                    }

                    // RETREAT (BACK AWAY)
                    else if (enemy.biteState === 'RETREAT') {
                        enemy.retreatTimer = (enemy.retreatTimer || 0) - 1;
                        
                        // Move away from player
                        const angleAway = Math.atan2(centerY - pCenterY, centerX - pCenterX);
                        const retreatSpeed = 2.5;
                        const dx = Math.cos(angleAway) * retreatSpeed;
                        const dy = Math.sin(angleAway) * retreatSpeed;
                        
                        let moved = false;
                        // Use 'boss' type to ignore wire damage during urgent retreat
                        if (!checkMapCollision({...enemy, x: enemy.x + dx}, 'boss')) {
                            enemy.x += dx;
                            moved = true;
                        }
                        if (!checkMapCollision({...enemy, y: enemy.y + dy}, 'boss')) {
                            enemy.y += dy;
                            moved = true;
                        }

                        // Apply slide inertia logic from earlier (if moved)
                        if (moved) {
                             if (Math.abs(dx) > Math.abs(dy)) {
                                enemy.driftVx = dx; enemy.driftVy = 0;
                             } else {
                                enemy.driftVx = 0; enemy.driftVy = dy;
                             }
                             enemy.driftTimer = BLOODSEEKER_DRIFT_DURATION;
                        }

                        if (enemy.retreatTimer <= 0) {
                            enemy.biteState = 'COOLDOWN';
                            enemy.biteTimer = BLOODSEEKER_BITE_COOLDOWN;
                        }
                    }

                    // INERTIA (SLIDING - GENERAL)
                    // Only apply drift if not attacking
                    if (enemy.biteState !== 'PRE_BITE' && enemy.biteState !== 'BITING' && enemy.biteState !== 'RECOVERY') {
                        if (enemy.driftTimer && enemy.driftTimer > 0) {
                            enemy.driftTimer--;
                            const ratio = enemy.driftTimer / BLOODSEEKER_DRIFT_DURATION;
                            const slideX = (enemy.driftVx || 0) * ratio;
                            const slideY = (enemy.driftVy || 0) * ratio;
                            
                            // Use 'boss' type to avoid getting stuck on wire during drift
                            if (!checkMapCollision({...enemy, x: enemy.x + slideX, y: enemy.y + slideY}, 'boss')) {
                                enemy.x += slideX;
                                enemy.y += slideY;
                            }
                        }
                    }
                }
                
                // Melee Collision with Player handled in generic boss section
                // NO SHOOTING for Bloodseeker
                return; 
            }
            // --- END BLOODSEEKER ---

            // SALLY SPECIALS: FIRE AURA & LASER & MOON DISCS
            if (enemy.id === 'SALLY' && !enemy.isDead) {
                
                // IMPORTANT: Block ALL Action if not in FIGHT mode
                if (enemy.introState !== 'FIGHT') return;

                // BACKSTAB & STUN LOGIC
                if (enemy.backstabCooldown && enemy.backstabCooldown > 0) enemy.backstabCooldown--;
                
                // Check if player is behind Sally to trigger Petrify Stun
                if (!player.isDead && enemy.phase !== 4 && (!enemy.stunTimer || enemy.stunTimer <= 0) && (!enemy.backstabCooldown || enemy.backstabCooldown <= 0)) {
                    let isBehind = false;
                    const bx = enemy.x + enemy.width/2;
                    const by = enemy.y + enemy.height/2;
                    const px = player.x + player.width/2;
                    const py = player.y + player.height/2;
                    
                    // Simple "Behind" check based on facing direction
                    if (enemy.direction === Direction.DOWN) { if (py < by - 10 && Math.abs(px - bx) < enemy.width) isBehind = true; }
                    else if (enemy.direction === Direction.UP) { if (py > by + 10 && Math.abs(px - bx) < enemy.width) isBehind = true; }
                    else if (enemy.direction === Direction.LEFT) { if (px > bx + 10 && Math.abs(py - by) < enemy.height) isBehind = true; }
                    else if (enemy.direction === Direction.RIGHT) { if (px < bx - 10 && Math.abs(py - by) < enemy.height) isBehind = true; }
                    
                    // Trigger Stun if very close behind
                    if (isBehind) {
                         const dist = Math.sqrt((px-bx)*(px-bx) + (py-by)*(py-by));
                         if (dist < enemy.width * 1.5) { // Close range
                             enemy.stunTimer = SALLY_BACKSTAB_DURATION;
                             enemy.backstabCooldown = SALLY_BACKSTAB_COOLDOWN;
                             explosionsRef.current.push({ x: enemy.x, y: enemy.y, id: Math.random().toString(), stage: 20, active: true, type: 'smoke' }); // Stone dust
                         }
                    }
                }

                if (enemy.stunTimer && enemy.stunTimer > 0) {
                    enemy.stunTimer--;
                    // STUNNED STATE - DO NOTHING
                    return; 
                }

                // SNAKE TURRETS LOGIC (Every second, small chance to fire red bullet)
                // 60 checks per second (approx)
                if (enemy.phase !== 2 && enemy.introState === 'FIGHT') { // Not while petrified/phase 2
                    // Every 60 frames, run chance
                    enemy.snakeFireTimer = (enemy.snakeFireTimer || 0) + 1;
                    if (enemy.snakeFireTimer >= 60) {
                        enemy.snakeFireTimer = 0;
                        const numSnakes = 12;
                        const chance = 0.01; // 1%
                        
                        // Loop through hairs
                        for(let i=0; i<numSnakes; i++) {
                            if (Math.random() < chance) {
                                // Fire Red Bullet
                                const radius = enemy.width/2;
                                const baseAngle = Math.PI/2 + (Math.PI / (numSnakes-1)) * i;
                                
                                // Approximate snake head position
                                let rotation = 0;
                                if (enemy.specialState && enemy.specialState !== 'IDLE' && enemy.aimAngle !== undefined) rotation = enemy.aimAngle;
                                else if (enemy.phase === 4 && enemy.vx && enemy.vy) rotation = Math.atan2(enemy.vy, enemy.vx);
                                else {
                                    if(enemy.direction === Direction.RIGHT) rotation = 0;
                                    else if(enemy.direction === Direction.DOWN) rotation = Math.PI / 2;
                                    else if(enemy.direction === Direction.LEFT) rotation = Math.PI;
                                    else if(enemy.direction === Direction.UP) rotation = -Math.PI / 2;
                                }

                                const angle = rotation + baseAngle;
                                const sx = (enemy.x + enemy.width/2) + Math.cos(angle) * radius * 1.2;
                                const sy = (enemy.y + enemy.height/2) + Math.sin(angle) * radius * 1.2;
                                
                                // Aim at player
                                const px = player.x + player.width/2;
                                const py = player.y + player.height/2;
                                const fireAngle = Math.atan2(py - sy, px - sx);
                                
                                bulletsRef.current.push({
                                    x: sx,
                                    y: sy,
                                    width: BULLET_SIZE * 1.5,
                                    height: BULLET_SIZE * 1.5,
                                    direction: Direction.DOWN, // N/A
                                    speed: SALLY_SNAKE_BULLET_SPEED,
                                    owner: 'boss',
                                    active: true,
                                    id: Math.random().toString(),
                                    vx: Math.cos(fireAngle) * SALLY_SNAKE_BULLET_SPEED,
                                    vy: Math.sin(fireAngle) * SALLY_SNAKE_BULLET_SPEED,
                                    variant: 'red_snake'
                                });
                            }
                        }
                    }
                }

                // --- SALLY PHASE LOGIC ---
                const hpPercent = enemy.hp / enemy.maxHp;
                if (!enemy.phase) enemy.phase = 1;

                // Check Phase Transitions
                if (hpPercent <= 0.25 && enemy.phase < 4) {
                    enemy.phase = 4;
                    // Init Phase 4 Physics (Arc/Bounce)
                    const angle = Math.random() * Math.PI * 2;
                    enemy.vx = Math.cos(angle) * SALLY_PHASE_4_BASE_SPEED;
                    enemy.vy = Math.sin(angle) * SALLY_PHASE_4_BASE_SPEED;
                    enemy.specialState = 'IDLE'; 
                    explosionsRef.current.push({ x: enemy.x, y: enemy.y, id: Math.random().toString(), stage: 30, active: true, type: 'impact' });
                } else if (hpPercent <= 0.50 && enemy.phase < 3) {
                    enemy.phase = 3;
                    explosionsRef.current.push({ x: enemy.x, y: enemy.y, id: Math.random().toString(), stage: 20, active: true, type: 'glitch', color: '#FF0000' });
                } else if (hpPercent <= 0.75 && enemy.phase < 2) {
                    enemy.phase = 2;
                    // Phase 2 Start: Stone smoke
                    explosionsRef.current.push({ x: enemy.x, y: enemy.y, id: Math.random().toString(), stage: 30, active: true, type: 'smoke' });
                }

                // Emit Fire Particles (except in Phase 2)
                if (enemy.phase !== 2 && Math.random() > 0.3 && enemy.introState === 'FIGHT') {
                     const cx = enemy.x + enemy.width/2;
                     const cy = enemy.y + enemy.height/2;
                     const angle = Math.random() * Math.PI * 2;
                     const dist = enemy.width / 1.5; // Orbit
                     const type = enemy.phase === 4 ? 'glitch' : 'fire'; // Glitch in Phase 4
                     
                     explosionsRef.current.push({
                         x: cx + Math.cos(angle) * dist,
                         y: cy + Math.sin(angle) * dist,
                         id: Math.random().toString(),
                         stage: 20 + Math.floor(Math.random() * 10),
                         active: true,
                         type: type as any,
                         vx: (Math.random() - 0.5) * 0.5,
                         vy: -1 - Math.random(), // Float up
                     });
                }

                // --- SALLY PHASE 4: MADNESS & EATING ---
                if (enemy.phase === 4 && enemy.introState === 'FIGHT') {
                    // (Logic same as previous Phase 4 implementation)
                    const vx = enemy.vx || 0;
                    const vy = enemy.vy || 0;
                    let nextX = enemy.x + vx;
                    let nextY = enemy.y + vy;
                    const accelerate = 1.05;
                    const maxSpeed = SALLY_PHASE_4_BASE_SPEED * 2.5;

                    let bounced = false;
                    if (nextX < 0 || nextX + enemy.width > CANVAS_WIDTH || checkMapCollision({...enemy, x: nextX, y: enemy.y})) {
                        enemy.vx = -vx * accelerate;
                        if (Math.abs(enemy.vx) > maxSpeed) enemy.vx = Math.sign(enemy.vx) * maxSpeed;
                        nextX = enemy.x + enemy.vx;
                        bounced = true;
                    } else {
                        enemy.x = nextX;
                    }

                    if (nextY < 0 || nextY + enemy.height > CANVAS_HEIGHT || checkMapCollision({...enemy, x: enemy.x, y: nextY})) {
                        enemy.vy = -vy * accelerate;
                        if (Math.abs(enemy.vy) > maxSpeed) enemy.vy = Math.sign(enemy.vy) * maxSpeed;
                        nextY = enemy.y + enemy.vy;
                        bounced = true;
                    } else {
                        enemy.y = nextY;
                    }
                    
                    if (bounced) {
                        explosionsRef.current.push({ x: enemy.x + enemy.width/2, y: enemy.y + enemy.height/2, id: Math.random().toString(), stage: 10, active: true, type: 'impact' });
                    }

                    if (!player.isDead) {
                        const ex = enemy.x + enemy.width/2;
                        const ey = enemy.y + enemy.height/2;
                        const px = player.x + player.width/2;
                        const py = player.y + player.height/2;
                        
                        const angleToPlayer = Math.atan2(py - ey, px - ex);
                        const steerStrength = 0.15; 
                        
                        if (enemy.vx !== undefined && enemy.vy !== undefined) {
                            enemy.vx += Math.cos(angleToPlayer) * steerStrength;
                            enemy.vy += Math.sin(angleToPlayer) * steerStrength;
                        }
                        
                        // BOSS VS PLAYER COLLISION
                        if (checkRectCollision(enemy, player)) {
                            if (godModeRef.current) {
                                // God Mode: No damage
                            } else if (player.invulnerabilityTimer && player.invulnerabilityTimer > 0) {
                                // Hit during invulnerability: do nothing
                            } else {
                                player.hp = 0;
                                setPlayerHp(0); // Sync UI
                                player.isDead = true;
                                setGameState(GameState.GAME_OVER);
                                onPlayerDeath();
                                explosionsRef.current.push({ x: player.x, y: player.y, id: Math.random().toString(), stage: 20, active: true, type: 'impact' });
                            }
                        }
                    }
                    return; 
                }

                // --- SALLY PHASE 1, 2, 3: MOVEMENT & ATTACKS ---
                if (enemy.introState === 'FIGHT') {
                    // Special State Reset if entering Phase 2 (to stop laser)
                    if (enemy.phase === 2 && enemy.specialState !== 'IDLE') {
                        enemy.specialState = 'IDLE';
                        enemy.specialTimer = 0;
                    }

                    // --- MOVEMENT LOGIC ---
                    if (!player.isDead) {
                        // PHASE 3: MIRRORED
                        if (enemy.phase === 3) {
                            const lastKey = moveKeysRef.current[moveKeysRef.current.length - 1];
                            let dx = 0;
                            let dy = 0;
                            // Increased Speed in Phase 3
                            const speed = enemy.speed * 1.6; 

                            if (lastKey === 'ArrowUp' || lastKey === 'KeyW') { dy = speed; enemy.direction = Direction.DOWN; }
                            else if (lastKey === 'ArrowDown' || lastKey === 'KeyS') { dy = -speed; enemy.direction = Direction.UP; }
                            else if (lastKey === 'ArrowLeft' || lastKey === 'KeyA') { dx = speed; enemy.direction = Direction.RIGHT; }
                            else if (lastKey === 'ArrowRight' || lastKey === 'KeyD') { dx = -speed; enemy.direction = Direction.LEFT; }
                            
                            if (dx !== 0 && !checkMapCollision({...enemy, x: enemy.x + dx})) enemy.x += dx;
                            if (dy !== 0 && !checkMapCollision({...enemy, y: enemy.y + dy})) enemy.y += dy;
                        } 
                        // PHASE 1 & 2: TRACKING
                        else {
                            const centerX = enemy.x + enemy.width / 2;
                            const centerY = enemy.y + enemy.height / 2;
                            const pCenterX = player.x + player.width / 2;
                            const pCenterY = player.y + player.height / 2;
                            
                            // Phase 2 is Slowed
                            const moveSpeed = (enemy.phase === 2) ? enemy.speed * 0.75 : enemy.speed;

                            // Jitter (Phase 1 Only)
                            let jitterX = 0;
                            let jitterY = 0;
                            if (enemy.phase === 1 && Math.random() < 0.2) { 
                                const jerkAmt = 4;
                                if (enemy.direction === Direction.UP || enemy.direction === Direction.DOWN) {
                                    jitterX = (Math.random() - 0.5) * jerkAmt;
                                } else {
                                    jitterY = (Math.random() - 0.5) * jerkAmt;
                                }
                            }

                            if (Math.abs(centerX - pCenterX) > 10) {
                                 const dx = pCenterX > centerX ? moveSpeed : -moveSpeed;
                                 if (!checkMapCollision({...enemy, x: enemy.x + dx + jitterX, y: enemy.y + jitterY})) {
                                     enemy.x += dx + jitterX;
                                     enemy.y += jitterY;
                                     enemy.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
                                 }
                            }
                            if (Math.abs(centerY - pCenterY) > 10) {
                                 const dy = pCenterY > centerY ? moveSpeed : -moveSpeed;
                                 if (!checkMapCollision({...enemy, y: enemy.y + dy + jitterY, x: enemy.x + jitterX})) {
                                     enemy.y += dy + jitterY;
                                     enemy.x += jitterX;
                                     enemy.direction = dy > 0 ? Direction.DOWN : Direction.UP;
                                 }
                            }
                        }
                    }

                    // --- ATTACK LOGIC ---
                    
                    // PHASE 2: MOON DISCS (Independent cooldown)
                    if (enemy.phase === 2) {
                        enemy.moonDiscTimer = (enemy.moonDiscTimer || 0) - 1;
                        if (enemy.moonDiscTimer <= 0) {
                            enemy.moonDiscTimer = SALLY_MOON_DISC_COOLDOWN;
                            // Fire Disc
                            const eCx = enemy.x + enemy.width / 2;
                            const eCy = enemy.y + enemy.height / 2;
                            const pCx = player.x + player.width / 2;
                            const pCy = player.y + player.height / 2;
                            const angle = Math.atan2(pCy - eCy, pCx - eCx);
                            
                            bulletsRef.current.push({
                                x: eCx - SALLY_MOON_DISC_SIZE/2,
                                y: eCy - SALLY_MOON_DISC_SIZE/2,
                                width: SALLY_MOON_DISC_SIZE,
                                height: SALLY_MOON_DISC_SIZE,
                                direction: Direction.DOWN, // Irrelevant
                                speed: SALLY_MOON_DISC_SPEED,
                                owner: 'boss',
                                active: true,
                                id: Math.random().toString(),
                                vx: Math.cos(angle) * SALLY_MOON_DISC_SPEED,
                                vy: Math.sin(angle) * SALLY_MOON_DISC_SPEED,
                                variant: 'moon_disc',
                                bounceCount: SALLY_MOON_DISC_BOUNCES
                            });
                        }
                    } 
                    // PHASE 1 & 3: LASER (Phase 3) OR SHOTGUN (Phase 1)
                    else {
                        if (enemy.specialState === 'IDLE' || !enemy.specialState) {
                            if (enemy.specialTimer === undefined) enemy.specialTimer = SALLY_LASER_COOLDOWN;
                            
                            if (enemy.specialTimer > 0) {
                                enemy.specialTimer--;
                            } else {
                                // Start Attack - Laser Phase 3+, Shotgun Phase 1
                                if (enemy.phase && enemy.phase >= 3) {
                                     enemy.specialState = 'PRE_CHARGE';
                                     enemy.specialTimer = SALLY_PRE_CHARGE;
                                } else {
                                     enemy.specialState = 'SHOTGUN';
                                     enemy.specialTimer = 0;
                                     enemy.burstCount = 0;
                                }
                            }
                        } else if (enemy.specialState === 'PRE_CHARGE') {
                            if (enemy.specialTimer && enemy.specialTimer > 0) {
                                enemy.specialTimer--;
                            } else {
                                enemy.specialState = 'CHARGING';
                                enemy.specialTimer = SALLY_CHARGE;
                                if (!player.isDead) {
                                    const ecx = enemy.x + enemy.width/2;
                                    const ecy = enemy.y + enemy.height/2;
                                    const pcx = player.x + player.width/2;
                                    const pcy = player.y + player.height/2;
                                    enemy.aimAngle = Math.atan2(pcy - ecy, pcx - ecx);
                                }
                            }
                        } else if (enemy.specialState === 'CHARGING') {
                            if (enemy.specialTimer && enemy.specialTimer > 0) {
                                enemy.specialTimer--;
                            } else {
                                enemy.specialState = 'FIRING';
                                enemy.specialTimer = SALLY_LASER_DURATION;
                            }
                        } else if (enemy.specialState === 'FIRING') {
                            if (!player.isDead && checkLaserCollision(enemy, enemy.aimAngle || 0, player, SALLY_LASER_WIDTH)) {
                                if (enemy.specialTimer && enemy.specialTimer % 10 === 0) {
                                    if (godModeRef.current) {
                                        // God Mode
                                    } else if (player.invulnerabilityTimer && player.invulnerabilityTimer > 0) {
                                        // Invulnerable
                                    } else {
                                        player.hp -= 1;
                                        setPlayerHp(player.hp); // Sync UI
                                        player.invulnerabilityTimer = 30; // 0.5s invulnerability
                                        if (player.hp <= 0) {
                                             player.isDead = true;
                                             explosionsRef.current.push({ x: player.x, y: player.y, id: Math.random().toString(), stage: 10, active: true, type: 'standard' });
                                             setGameState(GameState.GAME_OVER);
                                             onPlayerDeath();
                                        } else {
                                             explosionsRef.current.push({ x: player.x, y: player.y, id: Math.random().toString(), stage: 5, active: true, type: 'standard' });
                                        }
                                    }
                                }
                            }

                            if (enemy.specialTimer && enemy.specialTimer > 0) {
                                enemy.specialTimer--;
                            } else {
                                explosionsRef.current.push({ 
                                     x: enemy.x + enemy.width/2, 
                                     y: enemy.y + enemy.height/2, 
                                     id: Math.random().toString(), 
                                     stage: SALLY_LASER_TRACE_DURATION, 
                                     active: true, 
                                     type: 'laser_trace',
                                     angle: enemy.aimAngle 
                                });
                                // PHASE 3: Loop back to IDLE after Laser
                                // PHASE 1 (If it ever got here): Logic would be different, but Phase 1 uses SHOTGUN path
                                enemy.specialState = 'IDLE'; 
                                enemy.specialTimer = SALLY_LASER_COOLDOWN;
                            }
                        } else if (enemy.specialState === 'SHOTGUN') {
                            if (enemy.specialTimer && enemy.specialTimer > 0) {
                                enemy.specialTimer--;
                            } else {
                                if (enemy.burstCount !== undefined && enemy.burstCount >= 3) {
                                     enemy.specialState = 'IDLE';
                                     enemy.specialTimer = SALLY_LASER_COOLDOWN;
                                } else {
                                     const bCx = enemy.x + enemy.width / 2;
                                     const bCy = enemy.y + enemy.height / 2;
                                     const pCx = player.x + player.width / 2;
                                     const pCy = player.y + player.height / 2;
                                     const baseAngle = Math.atan2(pCy - bCy, pCx - bCx);
                                     
                                     for (let k = 0; k < SALLY_SHOTGUN_BULLET_COUNT; k++) {
                                         const spread = (Math.random() - 0.5) * ((Math.PI / 2.5) * 0.85); 
                                         const angle = baseAngle + spread;
                                         bulletsRef.current.push({
                                             x: bCx - BULLET_SIZE / 2,
                                             y: bCy - BULLET_SIZE / 2,
                                             width: BULLET_SIZE,
                                             height: BULLET_SIZE,
                                             direction: Direction.DOWN,
                                             speed: SALLY_BULLET_SPEED,
                                             owner: 'boss',
                                             active: true,
                                             id: Math.random().toString(),
                                             vx: Math.cos(angle) * SALLY_BULLET_SPEED,
                                             vy: Math.sin(angle) * SALLY_BULLET_SPEED,
                                             variant: 'standard'
                                         });
                                     }
                                     explosionsRef.current.push({ x: bCx, y: bCy, id: Math.random().toString(), stage: 10, active: true, type: 'impact' });
                                     
                                     enemy.burstCount = (enemy.burstCount || 0) + 1;
                                     enemy.specialTimer = SALLY_SHOTGUN_BURST_DELAY;
                                }
                            }
                        }
                    }
                }

                // Skip generic boss logic for Sally
                return;
            } // END SALLY LOGIC

            // Manage Defense Buff Timer
            if (enemy.defenseBuffTimer && enemy.defenseBuffTimer > 0) {
                enemy.defenseBuffTimer--;
            }

            // Manage Shotgun Cooldown (Juggernaut Passive)
            if (enemy.shotgunCooldown && enemy.shotgunCooldown > 0) {
                enemy.shotgunCooldown--;
            }

            // --- BOSS COLLISION WITH PLAYER MECHANIC ---
            if (!player.isDead && enemy.introState === 'FIGHT') {
                if (checkRectCollision(enemy, player)) {
                    if (godModeRef.current) {
                        // God Mode
                    } else if (player.invulnerabilityTimer && player.invulnerabilityTimer > 0) {
                        // Invulnerable
                    } else {
                        // Collision Damage
                        player.hp -= 1;
                        setPlayerHp(player.hp);
                        player.invulnerabilityTimer = 30; // 0.5s Invulnerability
                        explosionsRef.current.push({ x: player.x, y: player.y, id: Math.random().toString(), stage: 5, active: true, type: 'impact' });
                        if (player.hp <= 0) {
                            player.isDead = true;
                            setGameState(GameState.GAME_OVER);
                            onPlayerDeath();
                        }
                    }
                    
                    // Juggernaut Buff logic (only for JUGGERNAUT)
                    if (enemy.id === 'JUGG') enemy.defenseBuffTimer = 600; 
                }
            }

            // Skip AI if not fighting
            if (enemy.introState && enemy.introState !== 'FIGHT') return;

            const isEnraged = enemy.hp <= enemy.maxHp / 2;
            
            // Phase 2 Logic (Glasscannon + Chaotic Movement) - ONLY FOR JUGGERNAUT (Level 2)
            if (isEnraged && level === 2) {
                 // 1. Ability Logic
                 bossSpecialTimerRef.current++;
                 if (bossSpecialTimerRef.current >= GLASSCANNON_COOLDOWN) {
                     // Fire Glasscannon
                     const eCx = enemy.x + enemy.width / 2;
                     const eCy = enemy.y + enemy.height / 2;
                     const pCx = player.x + player.width / 2;
                     const pCy = player.y + player.height / 2;
                     
                     // Initial vector towards player
                     const angle = Math.atan2(pCy - eCy, pCx - eCx);
                     
                     bulletsRef.current.push({
                        x: eCx - GLASSCANNON_SIZE / 2, // Larger hitbox
                        y: eCy - GLASSCANNON_SIZE / 2,
                        width: GLASSCANNON_SIZE, // Use width as length for collision approx, but draw as spear
                        height: GLASSCANNON_SIZE / 3, // Thinner width
                        direction: Direction.DOWN, // Irrelevant for free movement
                        speed: BOSS_BULLET_SPEED * GLASSCANNON_SPEED_FACTOR, 
                        owner: 'boss',
                        active: true,
                        id: Math.random().toString(),
                        vx: Math.cos(angle) * (BOSS_BULLET_SPEED * GLASSCANNON_SPEED_FACTOR),
                        vy: Math.sin(angle) * (BOSS_BULLET_SPEED * GLASSCANNON_SPEED_FACTOR),
                        variant: 'glasscannon'
                    });
                    
                    bossSpecialTimerRef.current = 0;
                 }

                 // 2. Chaotic Movement Logic (Dashes)
                 bossDashTimerRef.current--;
                 if (bossDashTimerRef.current <= 0) {
                     // Reset Dash Timer (Short unpredictable bursts)
                     bossDashTimerRef.current = 20 + Math.random() * 30; // 20-50 frames

                     if (!player.isDead) {
                        const centerX = enemy.x + enemy.width / 2;
                        const centerY = enemy.y + enemy.height / 2;
                        const pCenterX = player.x + player.width / 2;
                        const pCenterY = player.y + player.height / 2;
                        
                        // Calculate angle to player
                        let angle = Math.atan2(pCenterY - centerY, pCenterX - centerX);
                        
                        // Add Chaos (Random Noise between -60 and +60 degrees)
                        const noise = (Math.random() - 0.5) * (Math.PI / 1.5); 
                        angle += noise;

                        // Burst Speed
                        const dashSpeed = enemy.speed * BOSS_RAGE_SPEED_MULT;
                        bossDashVectorRef.current = {
                            x: Math.cos(angle) * dashSpeed,
                            y: Math.sin(angle) * dashSpeed
                        };

                        // Visual Direction Update based on dominant axis
                        if (Math.abs(bossDashVectorRef.current.x) > Math.abs(bossDashVectorRef.current.y)) {
                            enemy.direction = bossDashVectorRef.current.x > 0 ? Direction.RIGHT : Direction.LEFT;
                        } else {
                            enemy.direction = bossDashVectorRef.current.y > 0 ? Direction.DOWN : Direction.UP;
                        }
                     }
                 }

                 // Apply Chaotic Vector Movement with sliding
                 const vx = bossDashVectorRef.current.x;
                 const vy = bossDashVectorRef.current.y;
                 
                 // Try X
                 if (!checkMapCollision({...enemy, x: enemy.x + vx})) {
                     enemy.x += vx;
                 }
                 // Try Y
                 if (!checkMapCollision({...enemy, y: enemy.y + vy})) {
                     enemy.y += vy;
                 }

            } else if (level !== 4) { // Not Bloodseeker
                // PHASE 1: Normal Slow Tracking (JUGGERNAUT)
                if (!player.isDead) {
                    const centerX = enemy.x + enemy.width / 2;
                    const centerY = enemy.y + enemy.height / 2;
                    const pCenterX = player.x + player.width / 2;
                    const pCenterY = player.y + player.height / 2;
                    
                    // Horizontal Approach
                    if (Math.abs(centerX - pCenterX) > 10) {
                         const dx = pCenterX > centerX ? enemy.speed : -enemy.speed;
                         if (!checkMapCollision({...enemy, x: enemy.x + dx})) {
                             enemy.x += dx;
                             enemy.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
                         }
                    }
                    // Vertical Approach
                    if (Math.abs(centerY - pCenterY) > 10) {
                         const dy = pCenterY > centerY ? enemy.speed : -enemy.speed;
                         if (!checkMapCollision({...enemy, y: enemy.y + dy})) {
                             enemy.y += dy;
                             // Bias visual direction to vertical if moving vertically
                             enemy.direction = dy > 0 ? Direction.DOWN : Direction.UP;
                         }
                    }
                }
            }

            // Boss Shooting (Cardinal + Diagonals) - ONLY FOR JUGGERNAUT
            if (enemy.id !== 'BLOODSEEKER') {
                if (enemy.cooldown > 0) enemy.cooldown--;
                else {
                    // Determine cardinal direction
                    const pCx = player.x + player.width / 2;
                    const pCy = player.y + player.height / 2;
                    const eCx = enemy.x + enemy.width / 2;
                    const eCy = enemy.y + enemy.height / 2;

                    let fireDir = Direction.DOWN;
                    let baseAngle = Math.PI / 2; // Default Down

                    if (Math.abs(pCx - eCx) > Math.abs(pCy - eCy)) {
                        if (pCx > eCx) {
                             fireDir = Direction.RIGHT;
                             baseAngle = 0;
                        } else {
                             fireDir = Direction.LEFT;
                             baseAngle = Math.PI;
                        }
                    } else {
                        if (pCy > eCy) {
                            fireDir = Direction.DOWN;
                            baseAngle = Math.PI / 2;
                        } else {
                            fireDir = Direction.UP;
                            baseAngle = -Math.PI / 2;
                        }
                    }

                    // Fire 3 bullets: Center, -45deg, +45deg (Fan shot)
                    const angles = [baseAngle, baseAngle - Math.PI/4, baseAngle + Math.PI/4];
                    
                    angles.forEach(angle => {
                         bulletsRef.current.push({
                            x: eCx - BULLET_SIZE / 2,
                            y: eCy - BULLET_SIZE / 2,
                            width: BULLET_SIZE,
                            height: BULLET_SIZE,
                            direction: fireDir,
                            speed: BOSS_BULLET_SPEED,
                            owner: 'boss',
                            active: true,
                            id: Math.random().toString(),
                            vx: Math.cos(angle) * BOSS_BULLET_SPEED,
                            vy: Math.sin(angle) * BOSS_BULLET_SPEED,
                            variant: 'standard'
                        });
                    });
                    
                    enemy.cooldown = BOSS_SHOOT_COOLDOWN;
                }
            }

        } else {
            // Standard Enemy Logic
            let dx = 0;
            let dy = 0;
            if (enemy.direction === Direction.UP) dy = -enemy.speed;
            if (enemy.direction === Direction.DOWN) dy = enemy.speed;
            if (enemy.direction === Direction.LEFT) dx = -enemy.speed;
            if (enemy.direction === Direction.RIGHT) dx = enemy.speed;

            const nextX = enemy.x + dx;
            const nextY = enemy.y + dy;
            const potentialRect = { ...enemy, x: nextX, y: nextY };

            let collided = checkMapCollision(potentialRect);
            if (!collided) {
                collided = enemiesRef.current.some(e => e.id !== enemy.id && checkRectCollision(potentialRect, e)) ||
                            (!player.isDead && checkRectCollision(potentialRect, player));
            }

            if (collided || Math.random() < 0.02) {
                const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
                enemy.direction = dirs[Math.floor(Math.random() * dirs.length)];
            } else {
                enemy.x = nextX;
                enemy.y = nextY;
            }

            if (enemy.cooldown > 0) enemy.cooldown--;
            else if (Math.random() < 0.03) {
                bulletsRef.current.push({
                    x: enemy.x + enemy.width / 2 - BULLET_SIZE / 2,
                    y: enemy.y + enemy.height / 2 - BULLET_SIZE / 2,
                    width: BULLET_SIZE,
                    height: BULLET_SIZE,
                    direction: enemy.direction,
                    speed: ENEMY_BULLET_SPEED,
                    owner: 'enemy',
                    active: true,
                    id: Math.random().toString(),
                    variant: 'standard'
                });
                enemy.cooldown = SHOOT_COOLDOWN * 2;
            }
        }
    });

    // --- Bullet Updates ---
    bulletsRef.current.forEach(bullet => {
        if (!bullet.active) return;

        // --- HOMING MISSILE LOGIC ---
        if (bullet.homing && !playerRef.current.isDead) {
            const bx = bullet.x + bullet.width/2;
            const by = bullet.y + bullet.height/2;
            const px = playerRef.current.x + playerRef.current.width/2;
            const py = playerRef.current.y + playerRef.current.height/2;
            
            // Calculate angle to target
            const targetAngle = Math.atan2(py - by, px - bx);
            
            // Simple Steering (Set Velocity directly to target for aggressive homing as per req)
            const speed = bullet.speed; // Uses its own speed property now
            
            // Just update velocity to point to player
            bullet.vx = Math.cos(targetAngle) * speed;
            bullet.vy = Math.sin(targetAngle) * speed;
        }

        // Handle Moon Disc Bouncing (Special Physics)
        if (bullet.variant === 'moon_disc' && bullet.vx !== undefined && bullet.vy !== undefined) {
            // Predict X movement
            const nextX = bullet.x + bullet.vx;
            // Check collisions at nextX, current Y
            let hitX = false;
            if (nextX < 0 || nextX > CANVAS_WIDTH || checkMapCollision({...bullet, x: nextX, y: bullet.y})) {
                hitX = true;
            }

            if (hitX) {
                bullet.vx = -bullet.vx; // Reflect
                bullet.bounceCount = (bullet.bounceCount || 0) - 1;
            } else {
                bullet.x = nextX;
            }

            // Predict Y movement
            const nextY = bullet.y + bullet.vy;
            let hitY = false;
            if (nextY < 0 || nextY > CANVAS_HEIGHT || checkMapCollision({...bullet, x: bullet.x, y: nextY})) {
                hitY = true;
            }

            if (hitY) {
                bullet.vy = -bullet.vy; // Reflect
                bullet.bounceCount = (bullet.bounceCount || 0) - 1;
            } else {
                bullet.y = nextY;
            }

            // ADDED: Player Collision Check
            if (bullet.owner === 'boss' && !playerRef.current.isDead) {
                if (checkRectCollision(bullet, playerRef.current)) {
                     if (godModeRef.current) {
                         // God Mode: No damage
                         bullet.active = false;
                         explosionsRef.current.push({ x: bullet.x, y: bullet.y, id: Math.random().toString(), stage: 5, active: true, type: 'impact' });
                         return;
                     }

                     // Check invulnerability
                     if (playerRef.current.invulnerabilityTimer && playerRef.current.invulnerabilityTimer > 0) {
                         // Invulnerable: Ignore or Absorb
                         bullet.active = false;
                         explosionsRef.current.push({ x: bullet.x, y: bullet.y, id: Math.random().toString(), stage: 5, active: true, type: 'impact' });
                         return;
                     }

                     bullet.active = false;
                     explosionsRef.current.push({ x: bullet.x, y: bullet.y, id: Math.random().toString(), stage: 5, active: true, type: 'impact' });
                     playerRef.current.hp -= 1;
                     setPlayerHp(playerRef.current.hp); // Sync UI
                     playerRef.current.invulnerabilityTimer = 30; // 0.5s Invulnerability
                     if (playerRef.current.hp <= 0) {
                         playerRef.current.isDead = true;
                         setGameState(GameState.GAME_OVER);
                         onPlayerDeath();
                         explosionsRef.current.push({ x: playerRef.current.x, y: playerRef.current.y, id: Math.random().toString(), stage: 20, active: true, type: 'standard' });
                     }
                     return; 
                }
            }

            if ((bullet.bounceCount || 0) < 0) {
                bullet.active = false;
                explosionsRef.current.push({ x: bullet.x, y: bullet.y, id: Math.random().toString(), stage: 5, active: true, type: 'impact' });
            }
            return; // Skip standard bullet logic
        }

        // Standard Movement
        if (bullet.vx !== undefined && bullet.vy !== undefined) {
             bullet.x += bullet.vx;
             bullet.y += bullet.vy;
        } else {
             if (bullet.direction === Direction.UP) bullet.y -= bullet.speed;
             else if (bullet.direction === Direction.DOWN) bullet.y += bullet.speed;
             else if (bullet.direction === Direction.LEFT) bullet.x -= bullet.speed;
             else if (bullet.direction === Direction.RIGHT) bullet.x += bullet.speed;
        }

        // Screen Bounds (Standard bullets die)
        if (bullet.x < 0 || bullet.x > CANVAS_WIDTH || bullet.y < 0 || bullet.y > CANVAS_HEIGHT) {
            bullet.active = false;
            return;
        }

        // Map Collision
        const { hit, tileX, tileY } = checkBulletMapCollision(bullet);
        if (hit) {
            bullet.active = false;
            // Explosion at impact
            explosionsRef.current.push({
                 x: bullet.x + bullet.width/2,
                 y: bullet.y + bullet.height/2,
                 id: Math.random().toString(),
                 stage: 5,
                 active: true,
                 type: 'impact'
            });
            
            if (tileX >= 0 && tileY >= 0) {
                 damageTile(tileX, tileY);
                 // If base hit
                 if (!baseActiveRef.current) {
                      setGameState(GameState.GAME_OVER);
                 }
            }
            return;
        }

        // Entity Collision
        if (bullet.owner === 'player') {
            // Vs Enemies
            for (const enemy of enemiesRef.current) {
                if (checkRectCollision(bullet, enemy)) {
                    bullet.active = false;
                    // Explosion
                    explosionsRef.current.push({ x: bullet.x, y: bullet.y, id: Math.random().toString(), stage: 5, active: true, type: 'impact' });
                    
                    if (enemy.introState && enemy.introState !== 'FIGHT') {
                        // Invulnerable during specific non-fight states
                    } else {
                        let damage = 1;
                        // Boss defense
                        if (enemy.defenseBuffTimer && enemy.defenseBuffTimer > 0) damage = 0.5;
                        
                        // SALLY PHASE 2 DEFENSE (Petrified)
                        if (enemy.id === 'SALLY' && enemy.phase === 2) damage = 0.25; 

                        // Backstab bonus for Sally
                        if (enemy.stunTimer && enemy.stunTimer > 0) damage *= 2;

                        enemy.hp -= damage;
                        if (enemy.hp <= 0) {
                            enemy.isDead = true;
                            setScore(prev => prev + (enemy.type === 'boss' ? 1000 : 100));
                            explosionsRef.current.push({ x: enemy.x + enemy.width/2, y: enemy.y + enemy.height/2, id: Math.random().toString(), stage: 20, active: true, type: 'standard' });
                        }
                    }
                    return;
                }
            }
        } else {
            // Vs Player
            if (!player.isDead && checkRectCollision(bullet, player)) {
                bullet.active = false;
                 explosionsRef.current.push({ x: bullet.x, y: bullet.y, id: Math.random().toString(), stage: 5, active: true, type: 'impact' });
                 
                 if (godModeRef.current) {
                     return;
                 }

                 // Check Invulnerability
                 if (player.invulnerabilityTimer && player.invulnerabilityTimer > 0) {
                     return;
                 }
                 
                 player.hp -= 1;
                 setPlayerHp(player.hp); // Sync UI
                 player.invulnerabilityTimer = 30; // 0.5s Invulnerability

                 if (player.hp <= 0) {
                     player.isDead = true;
                     setGameState(GameState.GAME_OVER);
                     onPlayerDeath();
                     explosionsRef.current.push({ x: player.x, y: player.y, id: Math.random().toString(), stage: 20, active: true, type: 'standard' });
                 }
                 return;
            }
        }
    });
    
    // Filter dead bullets and enemies
    bulletsRef.current = bulletsRef.current.filter(b => b.active);
    enemiesRef.current = enemiesRef.current.filter(e => !e.isDead);

    // --- Explosion Updates ---
    explosionsRef.current.forEach(exp => {
      exp.stage--;
      if (exp.vx) exp.x += exp.vx;
      if (exp.vy) exp.y += exp.vy;
      
      // BLOOD POOL EXPLOSION LOGIC (End of life)
      if ((exp as any).type === 'blood_pool') {
          if (exp.stage === 1) { // About to die
              // Spawn Homing Missiles (6 small ones)
              const missileCount = 6; 
              const angleStep = (Math.PI * 2) / missileCount;
              
              for (let i=0; i<missileCount; i++) {
                  const angle = i * angleStep;
                  bulletsRef.current.push({
                        x: exp.x,
                        y: exp.y,
                        width: BULLET_SIZE / 2, // Half size
                        height: BULLET_SIZE / 2,
                        direction: Direction.DOWN,
                        speed: BLOODSEEKER_MISSILE_SPEED, // Slower speed
                        owner: 'boss',
                        active: true,
                        id: Math.random().toString(),
                        vx: Math.cos(angle) * BLOODSEEKER_MISSILE_SPEED,
                        vy: Math.sin(angle) * BLOODSEEKER_MISSILE_SPEED,
                        variant: 'red_snake',
                        homing: true
                  });
              }
              // Visual POP
              explosionsRef.current.push({ x: exp.x, y: exp.y, id: Math.random().toString(), stage: 20, active: true, type: 'impact' });
          }
      }

      // BIG BLOOD POOL END LOGIC (Damage on expiry)
      if ((exp as any).type === 'big_blood_pool') {
          if (exp.stage === 1) {
              // EXPLODE
              explosionsRef.current.push({ x: exp.x, y: exp.y, id: Math.random().toString(), stage: 30, active: true, type: 'impact' }); // Big impact visual
              
              if (!playerRef.current.isDead) {
                  const px = playerRef.current.x + playerRef.current.width/2;
                  const py = playerRef.current.y + playerRef.current.height/2;
                  const dx = px - exp.x;
                  const dy = py - exp.y;
                  const dist = Math.sqrt(dx*dx + dy*dy);
                  
                  if (dist < BLOODSEEKER_BIG_POOL_RADIUS) {
                       if (!godModeRef.current && (!playerRef.current.invulnerabilityTimer || playerRef.current.invulnerabilityTimer <= 0)) {
                          playerRef.current.hp -= 1;
                          setPlayerHp(playerRef.current.hp);
                          playerRef.current.invulnerabilityTimer = 30;
                          if (playerRef.current.hp <= 0) {
                              playerRef.current.isDead = true;
                              setGameState(GameState.GAME_OVER);
                              onPlayerDeath();
                          }
                       }
                  }
              }
          }
      }

      // BLOOD POOL COLLISION CHECK (Still hurts while active)
      if ((exp as any).type === 'blood_pool' && exp.active && !playerRef.current.isDead) {
          // Circle collision with player rect
          const poolRadius = 24; // Increased from 16
          // Player rect center
          const pCx = playerRef.current.x + playerRef.current.width/2;
          const pCy = playerRef.current.y + playerRef.current.height/2;
          
          const dx = pCx - exp.x;
          const dy = pCy - exp.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < poolRadius + playerRef.current.width/2) {
              // Hit
              if (!godModeRef.current && (!playerRef.current.invulnerabilityTimer || playerRef.current.invulnerabilityTimer <= 0)) {
                  playerRef.current.hp -= 1;
                  setPlayerHp(playerRef.current.hp);
                  playerRef.current.invulnerabilityTimer = 30; // 0.5s invulnerability
                  if (playerRef.current.hp <= 0) {
                      playerRef.current.isDead = true;
                      setGameState(GameState.GAME_OVER);
                      onPlayerDeath();
                  }
              }
          }
      }

      if (exp.stage <= 0) exp.active = false;
    });
    explosionsRef.current = explosionsRef.current.filter(e => e.active);

    // --- Check Level Clear ---
    if (enemiesToSpawnRef.current === 0 && enemiesRef.current.length === 0) {
         setGameState(GameState.VICTORY);
    }
    
    setEnemiesLeft(enemiesToSpawnRef.current + enemiesRef.current.length);

  }, [gameState, level, onPlayerDeath, setEnemiesLeft, setGameState, setScore, setPlayerHp]);

  // --- Draw Function ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Map
    if (!mapRef.current || mapRef.current.length === 0) return;
    
    // Time variable for fog animation
    const time = Date.now() / 1000;

    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const tile = mapRef.current[y][x];
            if (tile === TileType.EMPTY) continue;
            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;
            
            if (tile === TileType.BRICK || tile === TileType.BRICK_DAMAGED || tile === TileType.BRICK_BROKEN) {
                ctx.fillStyle = '#000';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = COLORS.BRICK;
                const rH = TILE_SIZE / 4;
                const bW = TILE_SIZE / 2;
                let visibleBricks = [0, 1, 2, 3, 4, 5, 6, 7];
                if (tile === TileType.BRICK_DAMAGED) visibleBricks = [0, 1, 3, 4, 6, 7];
                else if (tile === TileType.BRICK_BROKEN) visibleBricks = [0, 7, 3, 4];
                let brickIdx = 0;
                for (let row = 0; row < 4; row++) {
                    const yPos = py + row * rH;
                    if (visibleBricks.includes(brickIdx)) ctx.fillRect(px + 1, yPos + 1, bW - 2, rH - 2);
                    brickIdx++;
                    if (visibleBricks.includes(brickIdx)) ctx.fillRect(px + bW + 1, yPos + 1, bW - 2, rH - 2);
                    brickIdx++;
                }
            } else if (
                tile === TileType.STEEL || 
                tile === TileType.STEEL_DAMAGED_1 || 
                tile === TileType.STEEL_DAMAGED_2 || 
                tile === TileType.STEEL_DAMAGED_3
            ) {
                // Base Steel Block
                ctx.fillStyle = COLORS.STEEL;
                ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                ctx.strokeStyle = '#FFF';
                ctx.strokeRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12);

                // Cracks Overlay
                ctx.fillStyle = '#000';
                
                if (tile === TileType.STEEL_DAMAGED_1) {
                    // Slight Cracks
                    ctx.fillRect(px + 10, py + 10, 4, 12);
                    ctx.fillRect(px + 20, py + 15, 6, 2);
                } else if (tile === TileType.STEEL_DAMAGED_2) {
                    // Medium Cracks
                    ctx.fillRect(px + 8, py + 8, 4, 16);
                    ctx.fillRect(px + 18, py + 12, 8, 4);
                    ctx.fillRect(px + 12, py + 22, 10, 2);
                } else if (tile === TileType.STEEL_DAMAGED_3) {
                    // Heavy Damage
                    ctx.fillRect(px + 6, py + 6, 6, 20);
                    ctx.fillRect(px + 16, py + 10, 10, 6);
                    ctx.fillRect(px + 10, py + 20, 14, 4);
                    ctx.fillRect(px + 24, py + 6, 4, 8);
                }

            } else if (tile === TileType.WATER) {
                ctx.fillStyle = COLORS.WATER;
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            } else if (tile === TileType.GRASS) {
                ctx.fillStyle = COLORS.GRASS;
                ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            } else if (tile === TileType.BASE) {
                const isActive = baseActiveRef.current;
                const c = isActive ? COLORS.BASE : '#555';
                ctx.fillStyle = c;
                ctx.fillRect(px + 8, py + 8, 16, 16);
                ctx.fillRect(px + 2, py + 12, 6, 12);
                ctx.fillRect(px + 24, py + 12, 6, 12);
                ctx.fillRect(px + 12, py + 2, 8, 6);
                if (!isActive) {
                     ctx.fillStyle = '#000';
                     ctx.fillRect(px + 6, py + 6, 4, 4);
                     ctx.fillRect(px + 22, py + 6, 4, 4);
                     ctx.fillRect(px + 6, py + 22, 4, 4);
                     ctx.fillRect(px + 22, py + 22, 4, 4);
                }
            } else if (tile === TileType.WIRE) {
                // Barbed Wire rendering
                ctx.fillStyle = '#222';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                
                // Draw X patterns
                ctx.strokeStyle = COLORS.WIRE;
                ctx.lineWidth = 2;
                ctx.beginPath();
                // Cross 1
                ctx.moveTo(px + 4, py + 4);
                ctx.lineTo(px + TILE_SIZE - 4, py + TILE_SIZE - 4);
                ctx.moveTo(px + TILE_SIZE - 4, py + 4);
                ctx.lineTo(px + 4, py + TILE_SIZE - 4);
                
                // Mini barbs
                ctx.moveTo(px, py + TILE_SIZE/2);
                ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE/2);
                
                ctx.stroke();
            } else if (tile === TileType.FOG) {
                 // Fog Block Rendering with Loop Animation
                 ctx.save();
                 // Clip to tile
                 ctx.beginPath();
                 ctx.rect(px, py, TILE_SIZE, TILE_SIZE);
                 ctx.clip();

                 // Base mist
                 ctx.fillStyle = 'rgba(220, 220, 220, 0.3)';
                 ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                 
                 // Moving Mist Puffs
                 const driftSpeed = 10;
                 const drift = (time * driftSpeed) % TILE_SIZE;
                 const driftY = (time * (driftSpeed * 0.5)) % TILE_SIZE;

                 ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                 
                 // Puff 1
                 const p1x = px + drift;
                 const p1y = py + driftY;
                 ctx.beginPath();
                 ctx.arc(p1x, p1y, TILE_SIZE/1.5, 0, Math.PI * 2);
                 ctx.fill();

                 // Wrap Puff 1
                 ctx.beginPath();
                 ctx.arc(p1x - TILE_SIZE, p1y - TILE_SIZE, TILE_SIZE/1.5, 0, Math.PI * 2);
                 ctx.fill();

                 // Puff 2 (Offset)
                 const p2x = px + TILE_SIZE - drift;
                 const p2y = py + (driftY + TILE_SIZE/2) % TILE_SIZE;
                 ctx.beginPath();
                 ctx.arc(p2x, p2y, TILE_SIZE/2, 0, Math.PI * 2);
                 ctx.fill();

                 ctx.restore();
            }
        }
    }


    // Helper to draw Medusa (Sally Boss)
    const drawMedusa = (tank: Tank) => {
        const cx = tank.x + tank.width / 2;
        const cy = tank.y + tank.height / 2;
        const radius = tank.width / 2;
        
        // Phase 2: Stone / Petrification look
        const isPetrified = tank.phase === 2;
        const isStunned = tank.stunTimer && tank.stunTimer > 0;
        // Phase 4: Terrifying / Scary look
        const isScary = tank.phase === 4;
        
        // Appearing State (Rift)
        const isAppearing = tank.introState === 'APPEARING';

        ctx.save();
        ctx.translate(cx, cy);

        // Rotation: If aiming, look at target. Else look in move direction.
        // Phase 4: Spin or look at movement vector
        let rotation = 0;
        
        if (isAppearing) {
            rotation = 0; // Face right/default during summon
        } else if (isScary) {
            // In Phase 4, look in movement direction (velocity)
            if (tank.vx !== undefined && tank.vy !== undefined) {
                rotation = Math.atan2(tank.vy, tank.vx);
            }
        } else if (tank.specialState && tank.specialState !== 'IDLE' && tank.aimAngle !== undefined) {
            rotation = tank.aimAngle;
        } else {
            // Map Direction enum to radians
            switch(tank.direction) {
                case Direction.RIGHT: rotation = 0; break;
                case Direction.DOWN: rotation = Math.PI / 2; break;
                case Direction.LEFT: rotation = Math.PI; break;
                case Direction.UP: rotation = -Math.PI / 2; break;
            }
        }
        
        // Rotate so 0 (Right) aligns with the drawing orientation
        ctx.rotate(rotation);

        // Shake effect when charging/firing
        if (tank.specialState === 'CHARGING' || tank.specialState === 'FIRING' || isScary) {
             const shakeAmt = isScary ? 3 : 2;
             ctx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
        }

        // --- Snakes (Hair) ---
        const time = Date.now() / 200;
        const numSnakes = 12;
        
        for (let i = 0; i < numSnakes; i++) {
            const baseAngle = Math.PI/2 + (Math.PI / (numSnakes-1)) * i;
            
            // Wiggle logic
            let wiggleOffset = Math.sin(time * 3 + i) * 0.2;
            if (isScary) wiggleOffset = Math.sin(time * 10 + i) * 0.4; // Violent wiggle
            if (isPetrified || isStunned) wiggleOffset = 0; // Frozen
            
            const currentAngle = baseAngle + wiggleOffset;
            
            // INCREASED HAIR LENGTH (radius * 1.2 instead of 0.8)
            const len = radius * 1.2; 
            const sx = Math.cos(currentAngle) * (radius * 0.6);
            const sy = Math.sin(currentAngle) * (radius * 0.6);
            const ex = Math.cos(currentAngle) * (radius + len);
            const ey = Math.sin(currentAngle) * (radius + len);

            // COLOR LOGIC
            let snakeColor = '#2E8B57'; // Normal Green
            if (isPetrified || isStunned) snakeColor = '#555';
            else if (isScary) snakeColor = '#1a0500';

            ctx.strokeStyle = snakeColor;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            // Quadratic curve for snake shape
            const cpX = Math.cos(currentAngle + wiggleOffset) * (radius + len/2);
            const cpY = Math.sin(currentAngle + wiggleOffset) * (radius + len/2);
            ctx.quadraticCurveTo(cpX, cpY, ex, ey);
            ctx.stroke();
            
            // Head
            let headColor = '#006400';
            if (isPetrified || isStunned) headColor = '#444';
            else if (isScary) headColor = '#330000';

            ctx.fillStyle = headColor;
            ctx.beginPath();
            ctx.arc(ex, ey, 3, 0, Math.PI*2);
            ctx.fill();
        }

        // --- Face Base ---
        let faceColor = '#8FBC8F'; // Default green
        if (isPetrified || isStunned) faceColor = '#777'; // Stone
        else if (isScary) faceColor = '#2F4F4F'; // Dark Slate (Scary)
        else if (tank.specialState === 'CHARGING') faceColor = '#6B8E23'; 

        ctx.fillStyle = faceColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 0.7, radius * 0.65, 0, 0, Math.PI*2);
        ctx.fill();
        
        // --- Facial Features (Oriented to face Right) ---
        
        // Eyes
        let eyeColor = '#FF0000'; // Default Red
        let eyeGlow = 0;
        
        if (isPetrified || isStunned) { eyeColor = '#555'; eyeGlow = 0; }
        else if (isScary) { eyeColor = '#FF0000'; eyeGlow = 30; }
        else if (tank.specialState === 'CHARGING' || tank.specialState === 'FIRING') { eyeColor = '#FF0000'; eyeGlow = 20; }
        
        ctx.fillStyle = eyeColor;
        ctx.shadowColor = eyeColor;
        ctx.shadowBlur = eyeGlow;

        // Eyes position relative to center (facing right)
        ctx.beginPath();
        // Scary eyes might be larger or slanted
        if (isScary) {
            ctx.ellipse(radius * 0.3, -radius * 0.25, 7, 10, -0.2, 0, Math.PI*2); // Angry slant
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(radius * 0.3, radius * 0.25, 7, 10, 0.2, 0, Math.PI*2); // Angry slant
            ctx.fill();
        } else {
            ctx.ellipse(radius * 0.3, -radius * 0.25, 5, 8, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(radius * 0.3, radius * 0.25, 5, 8, 0, 0, Math.PI*2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;

        // Mouth
        let mouthColor = '#004d00';
        if (isPetrified || isStunned) mouthColor = '#333';

        ctx.strokeStyle = mouthColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (isScary) {
            // Scream mouth
            ctx.fillStyle = '#000';
            ctx.ellipse(radius * 0.4, 0, 10, 15, 0, 0, Math.PI*2);
            ctx.fill();
            // Teeth
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.moveTo(radius * 0.4, -15);
            ctx.lineTo(radius * 0.45, -5);
            ctx.lineTo(radius * 0.35, -5);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(radius * 0.4, 15);
            ctx.lineTo(radius * 0.45, 5);
            ctx.lineTo(radius * 0.35, 5);
            ctx.fill();
        } else if (tank.specialState === 'FIRING') {
            // Open mouth (O shape)
            ctx.fillStyle = '#330000';
            ctx.ellipse(radius * 0.4, 0, 8, 12, 0, 0, Math.PI*2);
            ctx.fill();
        } else {
            // Angry Mouth (Line)
            ctx.moveTo(radius * 0.4, -radius * 0.15);
            ctx.quadraticCurveTo(radius * 0.5, 0, radius * 0.4, radius * 0.15);
            ctx.stroke();
        }

        ctx.restore();
    };

    // Helper to draw Tank
    const drawTank = (tank: Tank, color: string, detailColor: string = '#333') => {
        let drawY = tank.y;
        let drawX = tank.x;
        
        // Handle Intro (DORMANT state: Boss is invisible/in shadows until fog lifts)
        if (tank.introState === 'DORMANT') {
            return; // Invisible when dormant (covered by fog)
        }

        // --- APPEARING ANIMATION (Portal Rise) ---
        if (tank.introState === 'APPEARING') {
            const timeLeft = tank.introTimer || 0;
            const progress = 1 - (timeLeft / SALLY_APPEAR_DURATION); // 0 to 1
            
            // Draw Portal/Void on ground
            ctx.save();
            ctx.translate(drawX + tank.width/2, drawY + tank.height/2);
            ctx.scale(progress, progress); // Portal grows
            ctx.beginPath();
            ctx.ellipse(0, 0, tank.width * 0.8, tank.height * 0.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#1a001a'; // Dark void
            ctx.fill();
            ctx.strokeStyle = '#4b0082'; // Indigo glow
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            // Adjust Tank drawing parameters for rising effect
            ctx.globalAlpha = progress; // Fade in
            const riseOffset = (1 - progress) * 20; // Rise from below (20px)
            drawY += riseOffset;
        }

        // --- SALLY SPECIAL RENDER ---
        if (tank.id === 'SALLY') {
            // Draw Tank Chassis under Medusa
            // Reuse standard tank drawing logic but specialized color
            const isPetrified = tank.phase === 2;
            const isStunned = tank.stunTimer && tank.stunTimer > 0;

            let chassisColor = (tank.phase === 4 ? '#220000' : '#4b5320'); // Dark red or olive
            if (isPetrified || isStunned) chassisColor = '#555';

            ctx.save();
            // Translate for tank chassis
            const cx = drawX + tank.width / 2;
            const cy = drawY + tank.height / 2;
            ctx.translate(cx, cy);
            
            // Rotate chassis if moving
            // In Phase 4, rotate to movement
            let chassisRot = 0;
            if (tank.phase === 4 && tank.vx !== undefined && tank.vy !== undefined) {
                 chassisRot = Math.atan2(tank.vy, tank.vx) + Math.PI/2; 
                 ctx.rotate(chassisRot - Math.PI/2); 
            } else {
                 // Standard Axis Aligned rotation based on direction
                 if(tank.direction === Direction.RIGHT) chassisRot = 0;
                 else if(tank.direction === Direction.DOWN) chassisRot = Math.PI / 2;
                 else if(tank.direction === Direction.LEFT) chassisRot = Math.PI;
                 else if(tank.direction === Direction.UP) chassisRot = -Math.PI / 2;
                 
                 ctx.rotate(chassisRot);
            }

            // Simple chassis rect (drawn as if facing RIGHT because we rotate)
            // Original code drew vertically, let's adapt standard shape to rotate
            // Base shape (horizontal)
            ctx.fillStyle = chassisColor;
            ctx.fillRect(-tank.width/2 + 2, -tank.height/2 + 2, tank.width - 4, tank.height - 4);
            
            // Treads (Top and Bottom when facing right)
            ctx.fillStyle = '#111';
            ctx.fillRect(-tank.width/2, -tank.height/2, tank.width, 6);
            ctx.fillRect(-tank.width/2, tank.height/2 - 6, tank.width, 6);
            
            ctx.restore();

            // Draw Head
            drawMedusa(tank);
            
            // DRAW LASER BEAM (Needs global coords, so we draw it here after Medusa returns context)
            if (tank.specialState === 'FIRING' && tank.aimAngle !== undefined) {
                 const cx = tank.x + tank.width/2;
                 const cy = tank.y + tank.height/2;
                 const length = 1000;
                 const lx = cx + Math.cos(tank.aimAngle) * length;
                 const ly = cy + Math.sin(tank.aimAngle) * length;
                 
                 ctx.save();
                 ctx.shadowColor = '#FF0000';
                 ctx.shadowBlur = 30;
                 ctx.beginPath();
                 ctx.moveTo(cx, cy);
                 ctx.lineTo(lx, ly);
                 ctx.lineWidth = SALLY_LASER_WIDTH + Math.random() * 4;
                 ctx.strokeStyle = '#FF0000';
                 ctx.globalAlpha = 0.8 + Math.random() * 0.2;
                 ctx.stroke();
                 
                 // Core
                 ctx.beginPath();
                 ctx.moveTo(cx, cy);
                 ctx.lineTo(lx, ly);
                 ctx.lineWidth = SALLY_LASER_WIDTH / 3;
                 ctx.strokeStyle = '#FFFFFF';
                 ctx.stroke();
                 ctx.restore();
            }
            
            // Reset Alpha from APPEARING
            if (tank.introState === 'APPEARING') {
                ctx.globalAlpha = 1;
            }
            return;
        }

        // --- BLOODSEEKER RENDER ---
        if (tank.id === 'BLOODSEEKER') {
            const cx = drawX + tank.width / 2;
            const cy = drawY + tank.height / 2;
            
            ctx.save();
            ctx.translate(cx, cy);
            
            // Rotation based on movement direction
            let rot = 0;
            switch(tank.direction) {
                case Direction.RIGHT: rot = 0; break;
                case Direction.DOWN: rot = Math.PI/2; break;
                case Direction.LEFT: rot = Math.PI; break;
                case Direction.UP: rot = -Math.PI/2; break;
            }
            ctx.rotate(rot);
            
            // Intense shake if preparing bite OR if in rage mode
            if (tank.biteState === 'PRE_BITE' || (tank.rageTimer && tank.rageTimer > 0)) {
                // Heavier shake
                ctx.translate((Math.random()-0.5)*4, (Math.random()-0.5)*4);
            }
            
            // Body (Aggressive Red Shape)
            ctx.fillStyle = '#8B0000'; // Dark Red
            // Flash white if hit OR if in Rage
            const hitFlash = tank.wireHitTimer && tank.wireHitTimer > 0;
            const rageFlash = tank.rageTimer && tank.rageTimer > 0;
            
            if (hitFlash && Math.floor(Date.now() / 50) % 2 === 0) {
                ctx.fillStyle = '#FFFFFF';
            } else if (rageFlash) {
                // Pulse bright red in rage
                const pulse = Math.floor(Date.now() / 100) % 2 === 0;
                ctx.fillStyle = pulse ? '#FF0000' : '#8B0000';
            }

            // Main body
            ctx.fillRect(-tank.width/2, -tank.height/2 + 4, tank.width, tank.height - 8);
            
            // Treads
            ctx.fillStyle = '#220000'; // Almost black red
            ctx.fillRect(-tank.width/2, -tank.height/2, tank.width, 6); // Top tread
            ctx.fillRect(-tank.width/2, tank.height/2 - 6, tank.width, 6); // Bottom tread
            
            // Spikes (Melee Weapon) on the front (Right side in local space)
            // THESE ARE THE "GREY FANGS/TEETH"
            ctx.fillStyle = '#C0C0C0'; // Silver
            ctx.beginPath();
            // Spike 1
            ctx.moveTo(tank.width/2, -10);
            ctx.lineTo(tank.width/2 + 15, -5);
            ctx.lineTo(tank.width/2, 0);
            // Spike 2
            ctx.lineTo(tank.width/2 + 20, 0); // Big center spike
            ctx.lineTo(tank.width/2, 5);
            // Spike 3
            ctx.lineTo(tank.width/2 + 15, 10);
            ctx.lineTo(tank.width/2, 10);
            ctx.fill();
            
            // Turret (Non-functional but visual)
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(-5, 0, 12, 0, Math.PI*2);
            ctx.fill();
            
            // Blood Splatter Decor on Tank
            ctx.fillStyle = '#500000';
            ctx.beginPath();
            ctx.arc(5, 5, 4, 0, Math.PI*2);
            ctx.arc(-8, -4, 3, 0, Math.PI*2);
            ctx.fill();

            // MOUTH ANIMATION (JAW)
            // Positioned at front (x > tank.width/2), larger than boss
            if (tank.biteState === 'PRE_BITE' || tank.biteState === 'BITING') {
                const jawSize = tank.width * 1.2; 
                const jawOffset = tank.width/2; 
                const jawOpenAmount = tank.biteState === 'PRE_BITE' ? 20 + Math.sin(Date.now()/50)*5 : 25; // Wiggle or Wide open

                ctx.save();
                ctx.translate(jawOffset, 0); // Move to front

                // Draw Upper Jaw
                ctx.fillStyle = '#111'; // Inner Mouth
                ctx.strokeStyle = '#8B0000'; // Flesh Rim
                ctx.lineWidth = 2;
                
                ctx.save();
                ctx.rotate(-Math.PI/8); // Tilt up slightly
                ctx.translate(0, -jawOpenAmount/2);
                
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(jawSize, -10); // Long snout
                ctx.lineTo(jawSize - 5, 5);
                ctx.lineTo(0, 5);
                ctx.fill(); ctx.stroke();
                
                // Upper Teeth
                ctx.fillStyle = '#EEE';
                for(let t=0; t<5; t++) {
                    const tx = 10 + t * 8;
                    ctx.beginPath(); ctx.moveTo(tx, 5); ctx.lineTo(tx+3, 15); ctx.lineTo(tx+6, 5); ctx.fill();
                }
                ctx.restore();

                // Draw Lower Jaw
                ctx.save();
                ctx.rotate(Math.PI/8); // Tilt down slightly
                ctx.translate(0, jawOpenAmount/2);
                
                ctx.fillStyle = '#111'; 
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(jawSize, 10); 
                ctx.lineTo(jawSize - 5, -5);
                ctx.lineTo(0, -5);
                ctx.fill(); ctx.stroke();

                // Lower Teeth
                ctx.fillStyle = '#EEE';
                for(let t=0; t<5; t++) {
                    const tx = 12 + t * 8;
                    ctx.beginPath(); ctx.moveTo(tx, -5); ctx.lineTo(tx+3, -15); ctx.lineTo(tx+6, -5); ctx.fill();
                }
                ctx.restore();

                ctx.restore();
            }

            ctx.restore();
            return;
        }

        // Handle Pulsation (Intro Idle)
        let scale = 1;

        ctx.save();
        const cx = drawX + tank.width / 2;
        const cy = drawY + tank.height / 2;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);

        ctx.fillStyle = color;
        ctx.fillRect(drawX + 4, drawY + 4, tank.width - 8, tank.height - 8);
        ctx.fillStyle = '#000'; 
        if (tank.direction === Direction.UP || tank.direction === Direction.DOWN) {
            ctx.fillRect(drawX, drawY, 6, tank.height);
            ctx.fillRect(drawX + tank.width - 6, drawY, 6, tank.height);
            ctx.fillStyle = detailColor;
            for(let i=0; i<tank.height; i+=4) {
                ctx.fillRect(drawX, drawY + i, 6, 2);
                ctx.fillRect(drawX + tank.width - 6, drawY + i, 6, 2);
            }
        } else {
            ctx.fillRect(drawX, drawY, tank.width, 6);
            ctx.fillRect(drawX, drawY + tank.height - 6, tank.width, 6);
            ctx.fillStyle = detailColor;
            for(let i=0; i<tank.width; i+=4) {
                ctx.fillRect(drawX + i, drawY, 2, 6);
                ctx.fillRect(drawX + i, drawY + tank.height - 6, 2, 6);
            }
        }
        ctx.fillStyle = color;
        ctx.fillRect(drawX + 8, drawY + 8, tank.width - 16, tank.height - 16);
        ctx.fillStyle = '#000';
        ctx.fillRect(drawX + 12, drawY + 12, tank.width - 24, tank.height - 24);
        ctx.fillStyle = '#EEE'; 
        const centerX = drawX + tank.width/2;
        const centerY = drawY + tank.height/2;
        const barrelWidth = tank.width > 32 ? 8 : 4; // Thicker barrel for boss
        const barrelLen = tank.width > 32 ? 22 : 14;
        
        if (tank.direction === Direction.UP) ctx.fillRect(centerX - barrelWidth/2, centerY - barrelLen, barrelWidth, barrelLen);
        else if (tank.direction === Direction.DOWN) ctx.fillRect(centerX - barrelWidth/2, centerY, barrelWidth, barrelLen);
        else if (tank.direction === Direction.LEFT) ctx.fillRect(centerX - barrelLen, centerY - barrelWidth/2, barrelLen, barrelWidth);
        else if (tank.direction === Direction.RIGHT) ctx.fillRect(centerX, centerY - barrelWidth/2, barrelLen, barrelWidth);

        ctx.restore();
        
        // Reset Shadow
        ctx.shadowBlur = 0;
    };

    if (!playerRef.current.isDead) {
        // Flash player if low health (1 HP) or Invulnerable (blink fast)
        // If invulnerable, flicker every 4 frames (2 on, 2 off)
        const isInvulnerable = playerRef.current.invulnerabilityTimer && playerRef.current.invulnerabilityTimer > 0;
        const shouldDraw = isInvulnerable 
                           ? Math.floor(playerRef.current.invulnerabilityTimer / 2) % 2 === 0
                           : (playerRef.current.hp > 1 || Math.floor(Date.now() / 100) % 2 === 0);

        if (shouldDraw) {
            drawTank(playerRef.current, COLORS.PLAYER);
            
            // Draw God Mode Text if active
            if (godModeRef.current) {
                ctx.fillStyle = '#FFD700'; // Gold
                ctx.font = "10px 'Press Start 2P'";
                ctx.textAlign = 'center';
                ctx.fillText("GOD", playerRef.current.x + TANK_SIZE/2, playerRef.current.y - 8);
            }
        }
    }

    // Draw Enemies (including Boss, but without health bar above)
    enemiesRef.current.forEach(e => {
        if (e.type === 'boss') {
            const isEnraged = e.hp <= e.maxHp / 2;
            const mainColor = isEnraged ? '#FF4500' : COLORS.BOSS; // Brighter red/orange when enraged
            const detailColor = isEnraged ? '#FFFF00' : COLORS.BOSS_DETAIL;
            drawTank(e, mainColor, detailColor);
            
            // --- BLOODSEEKER TENTACLES RENDER ---
            if (e.id === 'BLOODSEEKER' && e.tentacles) {
                const cx = e.x + e.width/2;
                const cy = e.y + e.height/2;
                
                // Draw behind boss (but function order is tricky, so we draw on top here for visibility or modify layering)
                // Let's draw them here.
                ctx.save();
                ctx.strokeStyle = '#500000'; // Dark blood red
                ctx.lineWidth = 6;
                ctx.lineCap = 'round';
                
                e.tentacles.forEach(t => {
                    const tx = cx + Math.cos(t.angle + Math.sin(t.wigglePhase)*0.2) * t.length;
                    const ty = cy + Math.sin(t.angle + Math.sin(t.wigglePhase)*0.2) * t.length;
                    
                    // Bezier curve for organic look
                    const midX = (cx + tx) / 2 + Math.cos(t.wigglePhase * 1.5) * 10;
                    const midY = (cy + ty) / 2 + Math.sin(t.wigglePhase * 1.5) * 10;
                    
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.quadraticCurveTo(midX, midY, tx, ty);
                    ctx.stroke();
                    
                    // Tip
                    ctx.fillStyle = '#8B0000';
                    ctx.beginPath();
                    ctx.arc(tx, ty, 4, 0, Math.PI * 2);
                    ctx.fill();
                });
                
                ctx.restore();
            }

        } else {
            drawTank(e, COLORS.ENEMY);
        }
    });

    bulletsRef.current.forEach(b => {
        if (b.variant === 'glasscannon') {
            // Draw Spear
            ctx.fillStyle = '#FF0000'; // Red
            
            // Calculate rotation for drawing
            const angle = Math.atan2(b.vy || 0, b.vx || 0);
            const cx = b.x + b.width / 2;
            const cy = b.y + b.height / 2;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            
            // Draw Spear Shape (Triangular/Long) relative to center
            const length = b.width; // 12
            const width = b.height; // 4
            
            ctx.beginPath();
            // Arrowhead/Spear tip
            ctx.moveTo(length/2, 0); 
            ctx.lineTo(-length/2, -width/2);
            ctx.lineTo(-length/2 + 2, 0); // Indent
            ctx.lineTo(-length/2, width/2);
            ctx.closePath();
            ctx.fill();
            
            // Glow effect
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 10;
            ctx.stroke();

            ctx.restore();
            
        } else if (b.variant === 'red_snake') {
            // Draw Small Red Orb
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(b.x + b.width/2, b.y + b.height/2, b.width/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 5;
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else if (b.variant === 'moon_disc') {
            // Draw Moon Disc
            ctx.fillStyle = '#E0F7FA'; // Pale Cyan/White
            const cx = b.x + b.width/2;
            const cy = b.y + b.height/2;
            
            ctx.save();
            ctx.shadowColor = '#00FFFF';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(cx, cy, b.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Crescent effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(cx - 2, cy - 2, b.width/2 - 1, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        } else {
            ctx.fillStyle = COLORS.BULLET;
            ctx.beginPath();
            ctx.fillRect(b.x, b.y, b.width, b.height);
        }
    });

    explosionsRef.current.forEach(exp => {
        if ((exp as any).type === 'heal') {
            // Draw healing text
            ctx.fillStyle = '#00FF00'; // Green
            ctx.font = "12px 'Press Start 2P'";
            ctx.fillText("HEAL", exp.x, exp.y - (20 - exp.stage));
        } else if ((exp as any).type === 'smoke') {
            // Draw gray smoke
            ctx.fillStyle = `rgba(150, 150, 150, ${exp.stage / 23})`; // Slower fade (divide by maxStage)
            const size = (23 - exp.stage) * 2; // Adjusted size growth for longer duration
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, Math.max(0, size), 0, Math.PI * 2);
            ctx.fill();
        } else if ((exp as any).type === 'saliva') {
            // New Saliva Particle
            ctx.fillStyle = `rgba(200, 200, 200, ${exp.stage / 15})`;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if ((exp as any).type === 'boss_aura') {
            // Boss Aura Particles
            const alpha = exp.stage / 30;
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`; // Black core
            ctx.beginPath();
            const size = (30 - exp.stage)/2;
            ctx.arc(exp.x, exp.y, Math.max(0, size), 0, Math.PI * 2);
            ctx.fill();
            // Red Outline
            ctx.strokeStyle = `rgba(200, 0, 0, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        } else if ((exp as any).type === 'blood_pool') {
            // Blood Pool - Pulsating red circle
            const lifeRatio = exp.stage / BLOOD_POOL_DURATION; // 1.0 -> 0.0
            const alpha = lifeRatio < 0.2 ? lifeRatio * 5 : 0.8; // Fade out at end
            const pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
            
            // Bigger pools as requested
            const sizeMult = 1.5;

            ctx.fillStyle = `rgba(139, 0, 0, ${alpha})`; // Dark Red
            ctx.beginPath();
            ctx.ellipse(exp.x, exp.y, 16 * pulse * sizeMult, 12 * pulse * sizeMult, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner brighter pool
            ctx.fillStyle = `rgba(200, 0, 0, ${alpha})`;
            ctx.beginPath();
            ctx.ellipse(exp.x, exp.y, 10 * pulse * sizeMult, 7 * pulse * sizeMult, 0, 0, Math.PI * 2);
            ctx.fill();

        } else if ((exp as any).type === 'big_blood_pool') {
            // BIG Blood Pool (Phase 2 Ultimate)
            const lifeRatio = exp.stage / BLOODSEEKER_BIG_POOL_DURATION; 
            const alpha = lifeRatio < 0.1 ? lifeRatio * 8 : 0.6; // Fade out at end, base opacity 0.6
            const pulse = 1 + Math.sin(Date.now() / 300) * 0.05;
            
            const radius = BLOODSEEKER_BIG_POOL_RADIUS * pulse;

            // Dark Maroon Outer
            ctx.fillStyle = `rgba(60, 0, 0, ${alpha})`; 
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner swirling
            ctx.fillStyle = `rgba(100, 0, 0, ${alpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, radius * 0.8, 0, Math.PI * 2);
            ctx.fill();

            // Bubbles
            if (Math.random() > 0.5) {
                 const angle = Math.random() * Math.PI * 2;
                 const dist = Math.random() * radius * 0.8;
                 const bx = exp.x + Math.cos(angle) * dist;
                 const by = exp.y + Math.sin(angle) * dist;
                 ctx.fillStyle = `rgba(200, 50, 50, ${alpha})`;
                 ctx.beginPath();
                 ctx.arc(bx, by, Math.random() * 8, 0, Math.PI * 2);
                 ctx.fill();
            }

        } else if ((exp as any).type === 'fire') {
            // Fire Particles (Sally)
            const alpha = exp.stage / 30;
            // Gradient from Yellow -> Orange -> Red
            const lifeRatio = exp.stage / 30; // 1.0 -> 0.0
            if (lifeRatio > 0.7) ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`; // Yellow
            else if (lifeRatio > 0.3) ctx.fillStyle = `rgba(255, 140, 0, ${alpha})`; // Orange
            else ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`; // Red
            
            const size = (30 - exp.stage)/3 + 2;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, Math.max(0, size), 0, Math.PI * 2);
            ctx.fill();
        } else if ((exp as any).type === 'glitch') {
            // Glitch Rectangles
            ctx.fillStyle = (exp as any).color || '#00FF00';
            const size = (exp.stage / 5) * 20; // Scale with life
            ctx.fillRect(exp.x, exp.y, size, size/4);
        } else if ((exp as any).type === 'impact') {
            // Big impact explosion
            ctx.fillStyle = `rgba(50, 20, 0, ${exp.stage / 15})`;
            const size = (20 - exp.stage) * 8;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, Math.max(0, size), 0, Math.PI * 2);
            ctx.fill();
        } else if ((exp as any).type === 'laser_trace') {
            // Laser Trace (Fading Red Line)
            const alpha = exp.stage / SALLY_LASER_TRACE_DURATION;
            const cx = exp.x;
            const cy = exp.y;
            const length = 1000;
            const angle = (exp as any).angle || 0;
            const lx = cx + Math.cos(angle) * length;
            const ly = cy + Math.sin(angle) * length;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(lx, ly);
            ctx.lineWidth = SALLY_LASER_WIDTH;
            ctx.strokeStyle = `rgba(255, 0, 0, ${alpha * 0.5})`; // Fading Red
            ctx.stroke();
            
            // Core
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(lx, ly);
            ctx.lineWidth = 2;
            ctx.strokeStyle = `rgba(255, 100, 100, ${alpha * 0.8})`;
            ctx.stroke();
            ctx.restore();
        } else {
            // Generic Explosion Square fallback
            ctx.fillStyle = `rgba(255, 69, 0, ${exp.stage / 10})`;
            const center = { x: exp.x + 14, y: exp.y + 14 };
            const size = (10 - exp.stage) * 4;
            ctx.fillRect(center.x - size/2, center.y - size/2, size, size);
            ctx.fillStyle = `rgba(255, 255, 0, ${exp.stage / 10})`;
            const innerSize = size / 2;
            ctx.fillRect(center.x - innerSize/2, center.y - innerSize/2, innerSize, innerSize);
        }
    });

    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (mapRef.current[y][x] === TileType.GRASS) {
                 const px = x * TILE_SIZE;
                 const py = y * TILE_SIZE;
                 ctx.fillStyle = `rgba(0, 100, 0, 0.7)`;
                 ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    const boss = enemiesRef.current.find(e => e.type === 'boss');

    // Draw Boss HUD if Boss Exists and is Active (Fighting)
    if (boss && boss.introState === 'FIGHT') {
        // Bar dimensions
        const barWidth = CANVAS_WIDTH * 0.6;
        const barHeight = 16;
        const barX = (CANVAS_WIDTH - barWidth) / 2;
        const barY = 30; // Top of screen
        
        // Determine Color based on Phase
        let fillColor = '#8B0000';
        const time = Date.now();
        
        if (boss.id === 'SALLY') {
            switch (boss.phase) {
                case 1:
                    fillColor = '#8B0000';
                    break;
                case 2: // Petrified
                    fillColor = '#78909C'; // Stone Blue-Grey
                    // Slow pulse to white
                    const p2 = (Math.sin(time * 0.005) + 1) / 2; // 0 to 1
                    fillColor = blendColors('#78909C', '#B0BEC5', p2 * 0.5);
                    break;
                case 3: // Laser (Purple)
                    fillColor = '#800080';
                    // Fast Pulse
                    const p3 = (Math.sin(time * 0.015) + 1) / 2;
                    fillColor = blendColors('#800080', '#FF00FF', p3 * 0.7);
                    break;
                case 4: // Frenzy (Red/Black)
                    // Strobe
                    fillColor = Math.floor(time / 50) % 2 === 0 ? '#FF0000' : '#220000';
                    break;
                default:
                    fillColor = '#8B0000';
            }
        } else if (boss.id === 'BLOODSEEKER') {
             const hpRatio = boss.hp / boss.maxHp;
             // Pulse faster when low HP
             const pulseSpeed = 200 + hpRatio * 800;
             const isRed = Math.floor(time / pulseSpeed) % 2 === 0;
             fillColor = isRed ? '#8B0000' : '#FF0000';
        } else {
             // Juggernaut
             const isEnraged = boss.hp <= boss.maxHp / 2;
             fillColor = isEnraged ? '#FF4500' : '#8B0000';
        }
        
        // Override for generic defense buff (if not phase 2 sally which covers it)
        if (boss.defenseBuffTimer && boss.defenseBuffTimer > 0 && boss.phase !== 2) {
             fillColor = '#555555';
        }
        
        // Draw Health Bar Background
        ctx.fillStyle = '#000000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Draw Health Bar Fill
        const hpPercent = Math.max(0, boss.hp / boss.maxHp);
        ctx.fillStyle = fillColor;
        ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * hpPercent, barHeight - 4);
        
        // Draw Border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Draw Boss Name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        let bossName = 'JUGGERNAUT';
        if (boss.id === 'SALLY') bossName = 'MEDUSA';
        else if (boss.id === 'BLOODSEEKER') bossName = 'BLOODSEEKER';
        
        ctx.fillText(bossName, CANVAS_WIDTH / 2, barY - 10);
    }
  }, [gameState]);

  useEffect(() => {
    let animationId: number;
    const loop = () => {
      update();
      draw();
      animationId = window.requestAnimationFrame(loop);
    };
    
    if (gameState === GameState.PLAYING || gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) {
        loop();
    } else {
        draw(); // Draw once for menu background
    }

    return () => window.cancelAnimationFrame(animationId);
  }, [update, draw, gameState]);

  return (
    <canvas 
        ref={canvasRef} 
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT}
        className="block bg-black image-pixelated"
        style={{ imageRendering: 'pixelated' }}
    />
  );
};

export default GameCanvas;