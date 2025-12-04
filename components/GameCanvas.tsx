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
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
    gameState, setGameState, setScore, setEnemiesLeft, level, gameSessionId, onPlayerDeath,
    estusUnlocked, estusCharges, setEstusCharges
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs
  const mapRef = useRef<TileType[][]>([]);
  const tileHpRef = useRef<number[][]>([]); // Track specific HP for tiles

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
  
  // Intro / Fog Refs
  const hasBossCraterRef = useRef<boolean>(false);
  
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

    // Explicitly set base and walls ONLY for Standard Levels (1 and 3)
    if (level === 1 || level === 3) {
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
    };
    enemiesRef.current = [];
    bulletsRef.current = [];
    explosionsRef.current = [];
    baseActiveRef.current = true;
    enemySpawnTimerRef.current = 0;
    // For level 2, we manage spawning manually
    enemiesToSpawnRef.current = level === 2 ? 0 : 20; 
    moveKeysRef.current = [];
    setScore(0);
    bossSpecialTimerRef.current = 0;
    bossDashTimerRef.current = 0;
    bossDashVectorRef.current = {x: 0, y: 0};
    hasBossCraterRef.current = false;

    // Spawn Boss Immediately for Level 2 (But Hidden initially)
    if (level === 2) {
         enemiesRef.current.push({
            x: (GRID_WIDTH / 2) * TILE_SIZE - BOSS_SIZE / 2,
            y: TILE_SIZE * 2, // Target landing spot
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
            introState: 'HIDDEN',
            introOffsetY: -300, // Start way above screen
            introTimer: 0,
            defenseBuffTimer: 0,
        });
        bossSpawnedRef.current = true;
    } else {
        bossSpawnedRef.current = false;
    }

  }, [setScore, level, setEnemiesLeft]);

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

      // Estus Healing Logic
      if (e.code === 'KeyR' && gameState === GameState.PLAYING) {
         if (estusUnlocked && estusChargesRef.current > 0) {
             const player = playerRef.current;
             if (!player.isDead && player.hp < player.maxHp) {
                 player.hp += 1;
                 setEstusCharges(prev => prev - 1); // Update parent state
                 estusChargesRef.current -= 1; // Update local ref immediately for debounce consistency if needed
                 
                 // Add heal visual effect
                 explosionsRef.current.push({ 
                    x: player.x, 
                    y: player.y, 
                    id: Math.random().toString(), 
                    stage: 20, // Reuse stage for duration
                    active: true,
                    type: 'heal'
                 });
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
  }, [estusUnlocked, gameState, setEstusCharges]);

  // Utility: AABB Collision
  const checkRectCollision = (r1: { x: number; y: number; width: number; height: number }, r2: { x: number; y: number; width: number; height: number }) => {
    return (
      r1.x < r2.x + r2.width &&
      r1.x + r1.width > r2.x &&
      r1.y < r2.y + r2.height &&
      r1.y + r1.height > r2.y
    );
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
  const checkMapCollision = (rect: { x: number; y: number; width: number; height: number }) => {
    const startX = Math.floor(rect.x / TILE_SIZE);
    const endX = Math.floor((rect.x + rect.width - 0.1) / TILE_SIZE);
    const startY = Math.floor(rect.y / TILE_SIZE);
    const endY = Math.floor((rect.y + rect.height - 0.1) / TILE_SIZE);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
          const tile = mapRef.current[y][x];
          // Fog does not collide
          if (
              tile === TileType.BRICK || 
              tile === TileType.BRICK_DAMAGED || 
              tile === TileType.BRICK_BROKEN || 
              tile === TileType.STEEL || 
              tile === TileType.STEEL_DAMAGED_1 || 
              tile === TileType.STEEL_DAMAGED_2 || 
              tile === TileType.STEEL_DAMAGED_3 || 
              tile === TileType.WATER || 
              tile === TileType.BASE
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
            tile === TileType.STEEL_DAMAGED_3
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
                    // To prevent lag, maybe only spawn a few or randomize
                    if (Math.random() > 0.7) { 
                        explosionsRef.current.push({
                            x: x * TILE_SIZE + TILE_SIZE/2,
                            y: y * TILE_SIZE + TILE_SIZE/2,
                            id: Math.random().toString(),
                            stage: 15,
                            active: true,
                            type: 'smoke'
                        });
                    }
                }
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
        let dx = 0;
        let dy = 0;
        let moved = false;
        let newDir = player.direction;
        const lastKey = moveKeysRef.current[moveKeysRef.current.length - 1];

        if (lastKey) {
            if (lastKey === 'ArrowUp' || lastKey === 'KeyW') { dy = -player.speed; newDir = Direction.UP; moved = true; }
            else if (lastKey === 'ArrowDown' || lastKey === 'KeyS') { dy = player.speed; newDir = Direction.DOWN; moved = true; }
            else if (lastKey === 'ArrowLeft' || lastKey === 'KeyA') { dx = -player.speed; newDir = Direction.LEFT; moved = true; }
            else if (lastKey === 'ArrowRight' || lastKey === 'KeyD') { dx = player.speed; newDir = Direction.RIGHT; moved = true; }
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
            if (!checkMapCollision({ ...player, x: nextX, y: nextY })) {
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
    if (level === 1 || level === 3) {
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
            
            // Manage Defense Buff Timer
            if (enemy.defenseBuffTimer && enemy.defenseBuffTimer > 0) {
                enemy.defenseBuffTimer--;
            }

            // --- BOSS COLLISION WITH PLAYER MECHANIC ---
            if (!player.isDead && enemy.introState === 'FIGHT') {
                if (checkRectCollision(enemy, player)) {
                    // Trigger Defense Buff
                    enemy.defenseBuffTimer = 600; // 10 seconds (60fps)
                    // Optional: Push/bounce logic could go here, but collision just overlaps for now
                }
            }

            // --- CINEMATIC LOGIC ---
            if (level === 2 && enemy.introState !== 'FIGHT') {
                const triggerLine = CANVAS_HEIGHT - (6 * TILE_SIZE);
                
                if (enemy.introState === 'HIDDEN') {
                    if (player.y < triggerLine) {
                        enemy.introState = 'FALLING';
                    }
                    return; // Skip rest of logic
                }
                
                if (enemy.introState === 'FALLING') {
                    // Animate falling
                    if (enemy.introOffsetY !== undefined) {
                        enemy.introOffsetY += 10; // Fall speed
                        if (enemy.introOffsetY >= 0) {
                            enemy.introOffsetY = 0;
                            enemy.introState = 'LANDING';
                            
                            // IMPACT
                            hasBossCraterRef.current = true; // Draw crater
                            explosionsRef.current.push({ 
                                x: enemy.x + enemy.width/2, 
                                y: enemy.y + enemy.height/2, 
                                id: Math.random().toString(), 
                                stage: 15, 
                                active: true,
                                type: 'impact' // Big explosion
                            });
                        }
                    }
                    return;
                }

                if (enemy.introState === 'LANDING') {
                    // Small delay before IDLE
                    enemy.introState = 'IDLE';
                    enemy.introTimer = 240; // 4 seconds * 60 fps
                    return;
                }

                if (enemy.introState === 'IDLE') {
                    if (enemy.introTimer && enemy.introTimer > 0) {
                        enemy.introTimer--;
                        // Smoke from tracks every few frames
                        if (enemy.introTimer % 10 === 0) {
                            explosionsRef.current.push({ 
                                x: enemy.x + Math.random() * enemy.width, 
                                y: enemy.y + enemy.height, // Bottom of tank
                                id: Math.random().toString(), 
                                stage: 10, 
                                active: true,
                                type: 'smoke'
                            });
                        }
                    } else {
                        enemy.introState = 'FIGHT';
                    }
                    return;
                }
            }
            // --- END CINEMATIC LOGIC ---

            // Skip AI if not fighting
            if (enemy.introState && enemy.introState !== 'FIGHT') return;


            const isEnraged = enemy.hp <= enemy.maxHp / 2;
            
            // Phase 2 Logic (Glasscannon + Chaotic Movement)
            if (isEnraged) {
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

            } else {
                // PHASE 1: Normal Slow Tracking
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

            // Boss Shooting (Cardinal + Diagonals)
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

    // --- Bullet Collision (Bullet vs Bullet) ---
    for (let i = 0; i < bulletsRef.current.length; i++) {
        for (let j = i + 1; j < bulletsRef.current.length; j++) {
            const b1 = bulletsRef.current[i];
            const b2 = bulletsRef.current[j];
            
            // Glasscannon ignores bullet collision (unstopabble)
            if (b1.variant === 'glasscannon' || b2.variant === 'glasscannon') continue;

            if (b1.active && b2.active && b1.owner !== b2.owner && checkRectCollision(b1, b2)) {
                b1.active = false;
                b2.active = false;
                const midX = (b1.x + b2.x) / 2;
                const midY = (b1.y + b2.y) / 2;
                explosionsRef.current.push({ x: midX - 10, y: midY - 10, id: Math.random().toString(), stage: 5, active: true, type: 'standard' });
            }
        }
    }

    // --- Bullets Logic ---
    bulletsRef.current.forEach(b => {
        if (!b.active) return;
        
        // Handle vector movement or direction movement
        if (b.variant === 'glasscannon') {
            // Homing logic: Update velocity to point towards player
             if (!player.isDead) {
                const bCx = b.x + b.width/2;
                const bCy = b.y + b.height/2;
                const pCx = player.x + player.width/2;
                const pCy = player.y + player.height/2;
                const angle = Math.atan2(pCy - bCy, pCx - bCx);
                b.vx = Math.cos(angle) * b.speed;
                b.vy = Math.sin(angle) * b.speed;
             }
             // Apply movement
             if (b.vx !== undefined && b.vy !== undefined) {
                 b.x += b.vx;
                 b.y += b.vy;
             }
        } else if (b.vx !== undefined && b.vy !== undefined) {
            b.x += b.vx;
            b.y += b.vy;
        } else {
            if (b.direction === Direction.UP) b.y -= b.speed;
            if (b.direction === Direction.DOWN) b.y += b.speed;
            if (b.direction === Direction.LEFT) b.x -= b.speed;
            if (b.direction === Direction.RIGHT) b.x += b.speed;
        }

        // Map Collision
        const mapHit = checkBulletMapCollision(b);
        if (mapHit.hit) {
            b.active = false;
            explosionsRef.current.push({ x: b.x - 10, y: b.y - 10, id: Math.random().toString(), stage: 5, active: true, type: 'standard' });
            if (mapHit.tileX >= 0) damageTile(mapHit.tileX, mapHit.tileY);
            if (!baseActiveRef.current) setGameState(GameState.GAME_OVER);
        }

        // Tank Collision
        if (b.active) {
            if (b.owner === 'player') {
                enemiesRef.current.forEach(e => {
                    // Larger collision box for glasscannon hit check against boss? No, glasscannon is boss bullet.
                    // Check if player bullet hit enemy
                    if (checkRectCollision(b, e)) {
                        b.active = false;
                        
                        // Invulnerable during Intro
                        if (e.introState && e.introState !== 'FIGHT') return;

                        // Damage Logic
                        let damage = 1;
                        // Boss Defense Buff Mechanic
                        if (e.type === 'boss' && e.defenseBuffTimer && e.defenseBuffTimer > 0) {
                            damage = 0.5; // 50% Damage Reduction
                            // Visual indication of block?
                            explosionsRef.current.push({ x: b.x - 5, y: b.y - 5, id: Math.random().toString(), stage: 3, active: true, type: 'smoke' }); // Grey smoke for "block"
                        }

                        e.hp -= damage;
                        
                        if (e.hp <= 0) {
                            e.isDead = true;
                            setScore(prev => prev + (e.type === 'boss' ? 20 : 1)); // Updated scoring here
                            setEnemiesLeft(prev => prev - 1);
                            explosionsRef.current.push({ x: e.x, y: e.y, id: Math.random().toString(), stage: 10, active: true, type: 'standard' });
                        } else {
                            // Hit effect
                            explosionsRef.current.push({ x: b.x - 5, y: b.y - 5, id: Math.random().toString(), stage: 3, active: true, type: 'standard' });
                        }
                    }
                });
            } else { // Enemy or Boss bullet
                if (!player.isDead && checkRectCollision(b, player)) {
                    b.active = false;
                    player.hp -= 1;
                    
                    if (player.hp <= 0) {
                         player.isDead = true;
                         explosionsRef.current.push({ x: player.x, y: player.y, id: Math.random().toString(), stage: 10, active: true, type: 'standard' });
                         setGameState(GameState.GAME_OVER);
                         onPlayerDeath();
                    } else {
                         // Small explosion on player hit to indicate damage
                         explosionsRef.current.push({ x: player.x, y: player.y, id: Math.random().toString(), stage: 5, active: true, type: 'standard' });
                    }
                }
            }
        }
    });

    // Check Victory
    const aliveEnemies = enemiesRef.current.filter(e => !e.isDead).length;
    // For level 1, checking spawn count. For level 2, just checking if Jugg is dead (since spawned is 0)
    const allDead = enemiesRef.current.length > 0 && enemiesRef.current.every(e => e.isDead);
    
    if (level === 1 || level === 3) {
        if (enemiesToSpawnRef.current === 0 && aliveEnemies === 0 && enemiesRef.current.length > 0 && allDead) {
            setGameState(GameState.VICTORY);
        }
    } else if (level === 2) {
        if (bossSpawnedRef.current && aliveEnemies === 0) {
             setGameState(GameState.VICTORY);
        }
    }

    bulletsRef.current = bulletsRef.current.filter(b => b.active);
    enemiesRef.current = enemiesRef.current.filter(e => !e.isDead);
    explosionsRef.current.forEach(e => e.stage--);
    explosionsRef.current = explosionsRef.current.filter(e => e.stage > 0);

  }, [gameState, setGameState, setScore, setEnemiesLeft, level, onPlayerDeath]);


  // Draw Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Map
    if (!mapRef.current || mapRef.current.length === 0) return;
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
            } else if (tile === TileType.FOG) {
                 // Fog Block Rendering
                 // Semi-transparent white/gray mist
                 ctx.fillStyle = 'rgba(220, 220, 220, 0.5)'; // Milky white
                 ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                 
                 // Add simple noise/texture
                 ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                 ctx.fillRect(px + 4, py + 4, TILE_SIZE/2, TILE_SIZE/2);
                 ctx.fillRect(px + TILE_SIZE/2 + 2, py + TILE_SIZE/2 + 2, TILE_SIZE/3, TILE_SIZE/3);
            }
        }
    }

    // Draw Boss Crater
    if (level === 2 && hasBossCraterRef.current) {
        const bossStartX = (GRID_WIDTH / 2) * TILE_SIZE - BOSS_SIZE / 2;
        const bossStartY = TILE_SIZE * 2; // Landing spot
        
        ctx.save();
        ctx.fillStyle = '#111'; // Dark crater
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.ellipse(bossStartX + BOSS_SIZE/2, bossStartY + BOSS_SIZE/2 + 10, BOSS_SIZE/1.5, BOSS_SIZE/4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Cracks from crater
        ctx.strokeStyle = '#222';
        ctx.beginPath();
        ctx.moveTo(bossStartX + BOSS_SIZE/2, bossStartY + BOSS_SIZE/2);
        ctx.lineTo(bossStartX - 20, bossStartY + 40);
        ctx.moveTo(bossStartX + BOSS_SIZE/2, bossStartY + BOSS_SIZE/2);
        ctx.lineTo(bossStartX + BOSS_SIZE + 20, bossStartY + 40);
        ctx.stroke();
        ctx.restore();
    }

    // Helper to draw Tank
    const drawTank = (tank: Tank, color: string, detailColor: string = '#333') => {
        let drawY = tank.y;
        
        // Handle Intro Vertical Offset
        if (tank.introOffsetY !== undefined) {
            drawY += tank.introOffsetY;
        }

        // Handle Pulsation (Intro Idle)
        let scale = 1;
        if (tank.introState === 'IDLE' && tank.introTimer) {
             // Pulse 
             scale = 1 + Math.sin(Date.now() / 100) * 0.05;
        }

        ctx.save();
        const cx = tank.x + tank.width / 2;
        const cy = drawY + tank.height / 2;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);

        ctx.fillStyle = color;
        ctx.fillRect(tank.x + 4, drawY + 4, tank.width - 8, tank.height - 8);
        ctx.fillStyle = '#000'; 
        if (tank.direction === Direction.UP || tank.direction === Direction.DOWN) {
            ctx.fillRect(tank.x, drawY, 6, tank.height);
            ctx.fillRect(tank.x + tank.width - 6, drawY, 6, tank.height);
            ctx.fillStyle = detailColor;
            for(let i=0; i<tank.height; i+=4) {
                ctx.fillRect(tank.x, drawY + i, 6, 2);
                ctx.fillRect(tank.x + tank.width - 6, drawY + i, 6, 2);
            }
        } else {
            ctx.fillRect(tank.x, drawY, tank.width, 6);
            ctx.fillRect(tank.x, drawY + tank.height - 6, tank.width, 6);
            ctx.fillStyle = detailColor;
            for(let i=0; i<tank.width; i+=4) {
                ctx.fillRect(tank.x + i, drawY, 2, 6);
                ctx.fillRect(tank.x + i, drawY + tank.height - 6, 2, 6);
            }
        }
        ctx.fillStyle = color;
        ctx.fillRect(tank.x + 8, drawY + 8, tank.width - 16, tank.height - 16);
        ctx.fillStyle = '#000';
        ctx.fillRect(tank.x + 12, drawY + 12, tank.width - 24, tank.height - 24);
        ctx.fillStyle = '#EEE'; 
        const centerX = tank.x + tank.width/2;
        const centerY = drawY + tank.height/2;
        const barrelWidth = tank.width > 32 ? 8 : 4; // Thicker barrel for boss
        const barrelLen = tank.width > 32 ? 22 : 14;
        
        if (tank.direction === Direction.UP) ctx.fillRect(centerX - barrelWidth/2, centerY - barrelLen, barrelWidth, barrelLen);
        else if (tank.direction === Direction.DOWN) ctx.fillRect(centerX - barrelWidth/2, centerY, barrelWidth, barrelLen);
        else if (tank.direction === Direction.LEFT) ctx.fillRect(centerX - barrelLen, centerY - barrelWidth/2, barrelLen, barrelWidth);
        else if (tank.direction === Direction.RIGHT) ctx.fillRect(centerX, centerY - barrelWidth/2, barrelLen, barrelWidth);

        ctx.restore();
    };

    if (!playerRef.current.isDead) {
        // Flash player if low health (1 HP)
        if (playerRef.current.hp > 1 || Math.floor(Date.now() / 100) % 2 === 0) {
            drawTank(playerRef.current, COLORS.PLAYER);
        }
    }

    // Draw Enemies (including Boss, but without health bar above)
    enemiesRef.current.forEach(e => {
        if (e.type === 'boss') {
            if (e.introState !== 'HIDDEN') {
                const isEnraged = e.hp <= e.maxHp / 2;
                const mainColor = isEnraged ? '#FF4500' : COLORS.BOSS; // Brighter red/orange when enraged
                const detailColor = isEnraged ? '#FFFF00' : COLORS.BOSS_DETAIL;
                drawTank(e, mainColor, detailColor);
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
            
        } else {
            ctx.fillStyle = COLORS.BULLET;
            ctx.beginPath();
            ctx.fillRect(b.x, b.y, b.width, b.height);
        }
    });

    explosionsRef.current.forEach(e => {
        if ((e as any).type === 'heal') {
            // Draw healing text
            ctx.fillStyle = '#00FF00'; // Green
            ctx.font = "12px 'Press Start 2P'";
            ctx.fillText("HEAL", e.x, e.y - (20 - e.stage));
        } else if ((e as any).type === 'smoke') {
            // Draw gray smoke
            ctx.fillStyle = `rgba(150, 150, 150, ${e.stage / 15})`; // Lighter smoke
            const size = (15 - e.stage) * 3;
            ctx.beginPath();
            ctx.arc(e.x, e.y, size, 0, Math.PI * 2);
            ctx.fill();
        } else if ((e as any).type === 'impact') {
            // Big impact explosion
            ctx.fillStyle = `rgba(50, 20, 0, ${e.stage / 15})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, (20 - e.stage) * 8, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = `rgba(255, 69, 0, ${e.stage / 10})`;
            const center = { x: e.x + 14, y: e.y + 14 };
            const size = (10 - e.stage) * 4;
            ctx.fillRect(center.x - size/2, center.y - size/2, size, size);
            ctx.fillStyle = `rgba(255, 255, 0, ${e.stage / 10})`;
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
        const isEnraged = boss.hp <= boss.maxHp / 2;
        const isDefended = boss.defenseBuffTimer && boss.defenseBuffTimer > 0;

        // Boss Name
        ctx.fillStyle = '#FFF';
        ctx.font = "16px 'Press Start 2P'";
        ctx.textAlign = 'center';
        ctx.fillText("JUGGERNAUT", CANVAS_WIDTH / 2, barY - 10);

        // Background
        ctx.fillStyle = '#330000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const hpPercent = boss.hp / boss.maxHp;
        
        // Color Logic
        const time = Date.now();
        const pulse = Math.abs(Math.sin(time / 200)); // 0 to 1
        
        if (isDefended) {
            // Steel / Silver Pulse for Defense
            const val = 100 + Math.floor(pulse * 155); // 100 to 255
            ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
            ctx.shadowColor = '#FFFFFF';
            ctx.shadowBlur = 10 + pulse * 5;
        } else if (isEnraged) {
            // Enraged Pulse
            const r = 255;
            const g = Math.floor(pulse * 150); // 0 to 150
            const b = 0;
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            // Fire Glow
            ctx.shadowColor = `rgb(255, ${Math.floor(pulse * 100)}, 0)`;
            ctx.shadowBlur = 10 + pulse * 10;
        } else {
            // Standard Red
            ctx.fillStyle = '#ff0000';
            ctx.shadowBlur = 0;
        }

        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
        ctx.shadowBlur = 0; // Reset shadow for border
        
        // Border
        ctx.strokeStyle = '#AAA';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

  }, [level]);

  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };
    if (gameState === GameState.PLAYING) animationFrameId = requestAnimationFrame(loop);
    else draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, update, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="bg-black"
    />
  );
};

export default GameCanvas;