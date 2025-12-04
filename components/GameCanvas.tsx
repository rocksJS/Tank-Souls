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
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, setScore, setEnemiesLeft, level, gameSessionId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs (to avoid re-render loops and ensure sync in game loop)
  // Initialize with empty grid, updated in resetGame
  const mapRef = useRef<TileType[][]>([]);
  
  // Calculate dynamic spawn X based on grid width.
  const spawnXTile = Math.floor(GRID_WIDTH / 2) - 2;
  const spawnX = spawnXTile * TILE_SIZE + (TILE_SIZE - TANK_SIZE) / 2;

  const playerRef = useRef<Tank>({
    x: spawnX,
    y: 12 * TILE_SIZE + (TILE_SIZE - TANK_SIZE) / 2,
    width: TANK_SIZE,
    height: TANK_SIZE,
    direction: Direction.UP,
    speed: PLAYER_SPEED,
    id: 'player',
    type: 'player',
    cooldown: 0,
    isDead: false,
  });
  const enemiesRef = useRef<Tank[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const baseActiveRef = useRef<boolean>(true);
  const enemySpawnTimerRef = useRef<number>(0);
  const enemiesToSpawnRef = useRef<number>(20); // Track how many enemies still need to spawn

  // Helper: Reset Game
  const resetGame = useCallback(() => {
    // Select map based on level index (0-based)
    const levelIndex = Math.max(0, Math.min(level - 1, LEVELS.length - 1));
    const layout = LEVELS[levelIndex];
    
    // Deep copy the map
    const newMap = JSON.parse(JSON.stringify(layout));
    
    // Explicitly set base and walls ONLY for Level 1
    if (level === 1) {
        const centerX = Math.floor(GRID_WIDTH / 2);
        const gridY = GRID_HEIGHT - 1;
        
        // Base structure
        newMap[gridY][centerX] = TileType.BASE;
        newMap[gridY][centerX-1] = TileType.BRICK;
        newMap[gridY][centerX+1] = TileType.BRICK;
        newMap[gridY-1][centerX] = TileType.BRICK;
        newMap[gridY-1][centerX-1] = TileType.BRICK;
        newMap[gridY-1][centerX+1] = TileType.BRICK;
    }

    mapRef.current = newMap;
    
    // Recalculate spawn for reset
    const sX = (Math.floor(GRID_WIDTH / 2) - 2) * TILE_SIZE + (TILE_SIZE - TANK_SIZE) / 2;

    playerRef.current = {
      x: sX,
      y: 12 * TILE_SIZE + (TILE_SIZE - TANK_SIZE) / 2,
      width: TANK_SIZE,
      height: TANK_SIZE,
      direction: Direction.UP,
      speed: PLAYER_SPEED,
      id: 'player',
      type: 'player',
      cooldown: 0,
      isDead: false,
    };
    enemiesRef.current = [];
    bulletsRef.current = [];
    explosionsRef.current = [];
    baseActiveRef.current = true;
    enemySpawnTimerRef.current = 0;
    enemiesToSpawnRef.current = 20;
    setScore(0);
  }, [setScore, level]);

  // Trigger reset only when gameSessionId changes (or level which implies new session usually)
  useEffect(() => {
     resetGame();
  }, [gameSessionId, resetGame]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Utility: AABB Collision
  const checkRectCollision = (r1: { x: number; y: number; width: number; height: number }, r2: { x: number; y: number; width: number; height: number }) => {
    return (
      r1.x < r2.x + r2.width &&
      r1.x + r1.width > r2.x &&
      r1.y < r2.y + r2.height &&
      r1.y + r1.height > r2.y
    );
  };

  // Utility: Damage a specific tile
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
      }
  };

  // Utility: Check collision with static map tiles
  const checkMapCollision = (rect: { x: number; y: number; width: number; height: number }) => {
    // Convert pixels to grid coordinates range
    const startX = Math.floor(rect.x / TILE_SIZE);
    const endX = Math.floor((rect.x + rect.width - 0.1) / TILE_SIZE); // -0.1 to avoid edge cases
    const startY = Math.floor(rect.y / TILE_SIZE);
    const endY = Math.floor((rect.y + rect.height - 0.1) / TILE_SIZE);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
          const tile = mapRef.current[y][x];
          if (
              tile === TileType.BRICK || 
              tile === TileType.BRICK_DAMAGED || 
              tile === TileType.BRICK_BROKEN || 
              tile === TileType.STEEL || 
              tile === TileType.WATER || 
              tile === TileType.BASE
            ) {
            return true;
          }
        } else {
            // Out of bounds is collision
            return true;
        }
      }
    }
    return false;
  };

  // Utility: Check bullet hitting map
  const checkBulletMapCollision = (bullet: Bullet): { hit: boolean; tileX: number; tileY: number } => {
    const centerX = bullet.x + bullet.width / 2;
    const centerY = bullet.y + bullet.height / 2;
    const tileX = Math.floor(centerX / TILE_SIZE);
    const tileY = Math.floor(centerY / TILE_SIZE);

    if (tileY >= 0 && tileY < GRID_HEIGHT && tileX >= 0 && tileX < GRID_WIDTH) {
        const tile = mapRef.current[tileY][tileX];
        if (tile === TileType.BRICK || tile === TileType.BRICK_DAMAGED || tile === TileType.BRICK_BROKEN) {
             return { hit: true, tileX, tileY };
        }
        if (tile === TileType.STEEL) {
             return { hit: true, tileX: -1, tileY: -1 }; // Hit but no destroy
        }
        if (tile === TileType.BASE) {
             baseActiveRef.current = false;
             return { hit: true, tileX, tileY };
        }
    } else {
        // Wall boundaries
        if (centerX < 0 || centerX > CANVAS_WIDTH || centerY < 0 || centerY > CANVAS_HEIGHT) {
            return { hit: true, tileX: -1, tileY: -1 };
        }
    }
    return { hit: false, tileX: -1, tileY: -1 };
  }

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

        if (keysRef.current['ArrowUp'] || keysRef.current['KeyW']) { dy = -player.speed; newDir = Direction.UP; moved = true; }
        else if (keysRef.current['ArrowDown'] || keysRef.current['KeyS']) { dy = player.speed; newDir = Direction.DOWN; moved = true; }
        else if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) { dx = -player.speed; newDir = Direction.LEFT; moved = true; }
        else if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) { dx = player.speed; newDir = Direction.RIGHT; moved = true; }

        if (moved) {
            // Snap to axis if turning
            if (player.direction !== newDir) {
                 // Simple snapping logic to align with tiles
                 const centerX = player.x + player.width / 2;
                 const centerY = player.y + player.height / 2;
                 
                 // If moving vertically, snap X to nearest tile center
                 if (newDir === Direction.UP || newDir === Direction.DOWN) {
                     const tileCol = Math.floor(centerX / TILE_SIZE);
                     // Check if close enough to center to snap
                     const tileCenterX = tileCol * TILE_SIZE + TILE_SIZE/2;
                     if (Math.abs(centerX - tileCenterX) < 10) {
                         player.x = tileCenterX - player.width/2;
                     }
                 }
                 // If moving horizontally, snap Y
                 else {
                     const tileRow = Math.floor(centerY / TILE_SIZE);
                     const tileCenterY = tileRow * TILE_SIZE + TILE_SIZE/2;
                     if (Math.abs(centerY - tileCenterY) < 10) {
                         player.y = tileCenterY - player.height/2;
                     }
                 }
                 player.direction = newDir;
            }

            const nextX = player.x + dx;
            const nextY = player.y + dy;
            
            // Check collision
            if (!checkMapCollision({ ...player, x: nextX, y: nextY })) {
                player.x = nextX;
                player.y = nextY;
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
                speed: PLAYER_BULLET_SPEED, // Specific speed
                owner: 'player',
                active: true,
                id: Math.random().toString(),
            });
            player.cooldown = SHOOT_COOLDOWN;
        }
    }

    // --- Enemy Spawning ---
    enemySpawnTimerRef.current++;
    if (enemySpawnTimerRef.current > 180 && enemiesRef.current.length < 4 && enemiesToSpawnRef.current > 0) {
        enemySpawnTimerRef.current = 0;
        // Updated spawn points for wider grid
        const spawnPoints = [
            {x: 0, y: 0}, 
            {x: Math.floor(GRID_WIDTH / 2) * TILE_SIZE, y: 0}, 
            {x: (GRID_WIDTH - 1) * TILE_SIZE, y: 0}
        ];
        const point = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        
        // Check if spawn point blocked
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
            });
            enemiesToSpawnRef.current--;
        }
    }

    // --- Enemy AI ---
    enemiesRef.current.forEach(enemy => {
        let dx = 0;
        let dy = 0;
        if (enemy.direction === Direction.UP) dy = -enemy.speed;
        if (enemy.direction === Direction.DOWN) dy = enemy.speed;
        if (enemy.direction === Direction.LEFT) dx = -enemy.speed;
        if (enemy.direction === Direction.RIGHT) dx = enemy.speed;

        const nextX = enemy.x + dx;
        const nextY = enemy.y + dy;
        const potentialRect = { ...enemy, x: nextX, y: nextY };

        // Check map collision OR other enemy collision
        let collided = checkMapCollision(potentialRect);
        if (!collided) {
             collided = enemiesRef.current.some(e => e.id !== enemy.id && checkRectCollision(potentialRect, e)) ||
                        (!player.isDead && checkRectCollision(potentialRect, player));
        }

        if (collided || Math.random() < 0.02) {
             // Change direction
             const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
             enemy.direction = dirs[Math.floor(Math.random() * dirs.length)];
        } else {
             enemy.x = nextX;
             enemy.y = nextY;
        }

        // Enemy Shoot
        if (enemy.cooldown > 0) enemy.cooldown--;
        else if (Math.random() < 0.03) {
             bulletsRef.current.push({
                x: enemy.x + enemy.width / 2 - BULLET_SIZE / 2,
                y: enemy.y + enemy.height / 2 - BULLET_SIZE / 2,
                width: BULLET_SIZE,
                height: BULLET_SIZE,
                direction: enemy.direction,
                speed: ENEMY_BULLET_SPEED, // Specific speed
                owner: 'enemy',
                active: true,
                id: Math.random().toString(),
            });
            enemy.cooldown = SHOOT_COOLDOWN * 2;
        }
    });

    // --- Bullet Collision (Bullet vs Bullet) ---
    for (let i = 0; i < bulletsRef.current.length; i++) {
        for (let j = i + 1; j < bulletsRef.current.length; j++) {
            const b1 = bulletsRef.current[i];
            const b2 = bulletsRef.current[j];
            
            // Check collision between opposing bullets (or any bullets if physics desired)
            // Typically Player vs Enemy bullets collide
            if (b1.active && b2.active && b1.owner !== b2.owner && checkRectCollision(b1, b2)) {
                b1.active = false;
                b2.active = false;
                
                const midX = (b1.x + b2.x) / 2;
                const midY = (b1.y + b2.y) / 2;
                
                // Visual explosion
                explosionsRef.current.push({ x: midX - 10, y: midY - 10, id: Math.random().toString(), stage: 5, active: true });
                
                // AOE Damage to blocks
                const centerTileX = Math.floor(midX / TILE_SIZE);
                const centerTileY = Math.floor(midY / TILE_SIZE);
                
                // Damage center and 4 surrounding neighbors
                const offsets = [[0,0], [1,0], [-1,0], [0,1], [0,-1]];
                offsets.forEach(([ox, oy]) => {
                     damageTile(centerTileX + ox, centerTileY + oy);
                });
            }
        }
    }

    // --- Bullets Logic ---
    bulletsRef.current.forEach(b => {
        if (!b.active) return;
        if (b.direction === Direction.UP) b.y -= b.speed;
        if (b.direction === Direction.DOWN) b.y += b.speed;
        if (b.direction === Direction.LEFT) b.x -= b.speed;
        if (b.direction === Direction.RIGHT) b.x += b.speed;

        // Map Collision
        const mapHit = checkBulletMapCollision(b);
        if (mapHit.hit) {
            b.active = false;
            // Create explosion
            explosionsRef.current.push({ x: b.x - 10, y: b.y - 10, id: Math.random().toString(), stage: 5, active: true });
            
            if (mapHit.tileX >= 0) {
               damageTile(mapHit.tileX, mapHit.tileY);
            }

            if (!baseActiveRef.current) {
                 // Base destroyed animation done separately or reuse explosion
                 setGameState(GameState.GAME_OVER);
            }
        }

        // Tank Collision
        if (b.active) {
            if (b.owner === 'player') {
                enemiesRef.current.forEach(e => {
                    if (checkRectCollision(b, e)) {
                        b.active = false;
                        e.isDead = true; // Mark for removal
                        setScore(prev => prev + 1);
                        setEnemiesLeft(prev => prev - 1);
                        explosionsRef.current.push({ x: e.x, y: e.y, id: Math.random().toString(), stage: 10, active: true });
                    }
                });
            } else {
                if (!player.isDead && checkRectCollision(b, player)) {
                    b.active = false;
                    player.isDead = true;
                    explosionsRef.current.push({ x: player.x, y: player.y, id: Math.random().toString(), stage: 10, active: true });
                    setGameState(GameState.GAME_OVER);
                }
            }
        }
    });

    // Check Victory
    const aliveEnemies = enemiesRef.current.filter(e => !e.isDead).length;
    if (enemiesToSpawnRef.current === 0 && aliveEnemies === 0 && enemiesRef.current.length > 0) {
        // Ensure we actually spawned some enemies (length > 0 check covers edge case at very start)
        const allDead = enemiesRef.current.every(e => e.isDead);
        if (allDead) {
             setGameState(GameState.VICTORY);
        }
    }

    // Clean up entities
    bulletsRef.current = bulletsRef.current.filter(b => b.active);
    enemiesRef.current = enemiesRef.current.filter(e => !e.isDead);
    
    // Animate explosions
    explosionsRef.current.forEach(e => e.stage--);
    explosionsRef.current = explosionsRef.current.filter(e => e.stage > 0);

  }, [gameState, setGameState, setScore, setEnemiesLeft]);


  // Draw Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Map
    // Ensure mapRef.current is initialized
    if (!mapRef.current || mapRef.current.length === 0) return;

    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const tile = mapRef.current[y][x];
            if (tile === TileType.EMPTY) continue;
            
            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;
            
            if (tile === TileType.BRICK || tile === TileType.BRICK_DAMAGED || tile === TileType.BRICK_BROKEN) {
                // Better Brick Texture with damage support
                ctx.fillStyle = '#000'; // Mortar color (also background for missing sub-bricks)
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                
                ctx.fillStyle = COLORS.BRICK;
                const rH = TILE_SIZE / 4; // 8px row height
                const bW = TILE_SIZE / 2; // 16px brick width
                
                // Determine visible sub-bricks based on damage state
                // 8 sub-bricks total (indices 0-7)
                let visibleBricks = [0, 1, 2, 3, 4, 5, 6, 7];
                if (tile === TileType.BRICK_DAMAGED) {
                    visibleBricks = [0, 1, 3, 4, 6, 7]; // Missing center-ish ones
                } else if (tile === TileType.BRICK_BROKEN) {
                    visibleBricks = [0, 7, 3, 4]; // Very sparse
                }

                // Draw rows
                let brickIdx = 0;
                for (let row = 0; row < 4; row++) {
                    const yPos = py + row * rH;
                    // Left Brick
                    if (visibleBricks.includes(brickIdx)) {
                        ctx.fillRect(px + 1, yPos + 1, bW - 2, rH - 2);
                    }
                    brickIdx++;
                    
                    // Right Brick
                    if (visibleBricks.includes(brickIdx)) {
                         ctx.fillRect(px + bW + 1, yPos + 1, bW - 2, rH - 2);
                    }
                    brickIdx++;
                }
            } else if (tile === TileType.STEEL) {
                ctx.fillStyle = COLORS.STEEL;
                ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                ctx.strokeStyle = '#FFF';
                ctx.strokeRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12);
            } else if (tile === TileType.WATER) {
                ctx.fillStyle = COLORS.WATER;
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            } else if (tile === TileType.GRASS) {
                ctx.fillStyle = COLORS.GRASS;
                ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8); // Simplified grass
            } else if (tile === TileType.BASE) {
                // Draw Eagle (8-bit style)
                const isActive = baseActiveRef.current;
                const c = isActive ? COLORS.BASE : '#555';
                ctx.fillStyle = c;
                
                // Simplified pixel eagle (32x32)
                ctx.fillRect(px + 8, py + 8, 16, 16); // Center
                ctx.fillRect(px + 2, py + 12, 6, 12); // Left wing
                ctx.fillRect(px + 24, py + 12, 6, 12); // Right wing
                ctx.fillRect(px + 12, py + 2, 8, 6); // Head
                
                if (!isActive) {
                    // X for dead
                     ctx.fillStyle = '#000';
                     ctx.fillRect(px + 6, py + 6, 4, 4);
                     ctx.fillRect(px + 22, py + 6, 4, 4);
                     ctx.fillRect(px + 6, py + 22, 4, 4);
                     ctx.fillRect(px + 22, py + 22, 4, 4);
                }
            }
        }
    }

    // Helper to draw Tank
    const drawTank = (tank: Tank, color: string) => {
        ctx.fillStyle = color;
        // Main chassis
        ctx.fillRect(tank.x + 4, tank.y + 4, tank.width - 8, tank.height - 8);
        
        // Tracks (black with tread pattern)
        ctx.fillStyle = '#000'; 
        if (tank.direction === Direction.UP || tank.direction === Direction.DOWN) {
            // Vertical tracks
            ctx.fillRect(tank.x, tank.y, 6, tank.height); // Left
            ctx.fillRect(tank.x + tank.width - 6, tank.y, 6, tank.height); // Right
            
            // Detail
            ctx.fillStyle = '#333';
            for(let i=0; i<tank.height; i+=4) {
                ctx.fillRect(tank.x, tank.y + i, 6, 2);
                ctx.fillRect(tank.x + tank.width - 6, tank.y + i, 6, 2);
            }
        } else {
            // Horizontal tracks
            ctx.fillRect(tank.x, tank.y, tank.width, 6); // Top
            ctx.fillRect(tank.x, tank.y + tank.height - 6, tank.width, 6); // Bottom
            
            // Detail
            ctx.fillStyle = '#333';
            for(let i=0; i<tank.width; i+=4) {
                ctx.fillRect(tank.x + i, tank.y, 2, 6);
                ctx.fillRect(tank.x + i, tank.y + tank.height - 6, 2, 6);
            }
        }

        // Turret
        ctx.fillStyle = color;
        ctx.fillRect(tank.x + 8, tank.y + 8, tank.width - 16, tank.height - 16);
        // Turret hatch
        ctx.fillStyle = '#000';
        ctx.fillRect(tank.x + 12, tank.y + 12, tank.width - 24, tank.height - 24);

        // Barrel (Rect instead of line)
        ctx.fillStyle = '#EEE'; 
        const centerX = tank.x + tank.width/2;
        const centerY = tank.y + tank.height/2;
        const barrelWidth = 4;
        const barrelLen = 14;
        
        if (tank.direction === Direction.UP) {
            ctx.fillRect(centerX - barrelWidth/2, centerY - barrelLen, barrelWidth, barrelLen);
        } else if (tank.direction === Direction.DOWN) {
            ctx.fillRect(centerX - barrelWidth/2, centerY, barrelWidth, barrelLen);
        } else if (tank.direction === Direction.LEFT) {
            ctx.fillRect(centerX - barrelLen, centerY - barrelWidth/2, barrelLen, barrelWidth);
        } else if (tank.direction === Direction.RIGHT) {
            ctx.fillRect(centerX, centerY - barrelWidth/2, barrelLen, barrelWidth);
        }
    };

    // Draw Player
    if (!playerRef.current.isDead) {
        drawTank(playerRef.current, COLORS.PLAYER);
    }

    // Draw Enemies
    enemiesRef.current.forEach(e => drawTank(e, COLORS.ENEMY));

    // Draw Bullets
    ctx.fillStyle = COLORS.BULLET;
    bulletsRef.current.forEach(b => {
        ctx.beginPath();
        // Square bullets for 8-bit feel
        ctx.fillRect(b.x, b.y, b.width, b.height);
        // ctx.arc(b.x + b.width/2, b.y + b.height/2, b.width/2, 0, Math.PI * 2);
        // ctx.fill();
    });

    // Draw Explosions
    explosionsRef.current.forEach(e => {
        ctx.fillStyle = `rgba(255, 69, 0, ${e.stage / 10})`;
        // Pixel explosion
        const center = { x: e.x + 14, y: e.y + 14 };
        const size = (10 - e.stage) * 4;
        ctx.fillRect(center.x - size/2, center.y - size/2, size, size);
        
        ctx.fillStyle = `rgba(255, 255, 0, ${e.stage / 10})`;
        const innerSize = size / 2;
        ctx.fillRect(center.x - innerSize/2, center.y - innerSize/2, innerSize, innerSize);
    });

    // Draw Grass Overlay (Grass hides tanks)
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (mapRef.current[y][x] === TileType.GRASS) {
                 const px = x * TILE_SIZE;
                 const py = y * TILE_SIZE;
                 ctx.fillStyle = `rgba(0, 100, 0, 0.7)`; // Increased opacity for pixel look
                 // Dither pattern could be cool but simple rect for now
                 ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            }
        }
    }

  }, []);

  // Main Loop
  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    if (gameState === GameState.PLAYING) {
        animationFrameId = requestAnimationFrame(loop);
    } else {
        // Just draw once to show static state if needed, or don't loop
        draw();
    }

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