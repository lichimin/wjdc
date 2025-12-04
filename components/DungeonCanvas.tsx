

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { DungeonData, TileType, ItemType, Room, InputState, PlayerState, Enemy, EnemyType, Projectile, FloatingText, Item } from '../types';
import { SkinData } from '../App';

interface DungeonCanvasProps {
  dungeon: DungeonData;
  onRoomSelect: (room: Room | null) => void;
  selectedRoomId: string | null;
  inputRef: React.MutableRefObject<InputState>;
  playerRef: React.MutableRefObject<PlayerState>;
  visitedRef: React.MutableRefObject<boolean[][]>;
  enemiesRef: React.MutableRefObject<Enemy[]>;
  projectilesRef: React.MutableRefObject<Projectile[]>;
  floatingTextsRef: React.MutableRefObject<FloatingText[]>;
  onOpenChest: (chestId: string) => void;
  onExtract?: () => void;
  onGameOver?: () => void;
  skinData: SkinData | null;
}

const TILE_SIZE = 32;
const ANIMATION_SPEED = 100; // ms per frame
const AUTO_FIRE_RANGE = 250;
const FIRE_RATE = 20; // Frames between shots
const TEXT_FLOAT_SPEED = 0.8;

// BLINK Settings
const BLINK_DISTANCE = 120;
const BLINK_COOLDOWN = 45; // Frames
const INTERACTION_DURATION = 42; // ~0.7s (was 60)

interface BlinkTrail {
  x: number;
  y: number;
  frameIndex: number;
  facingLeft: boolean;
  life: number;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  alpha: number;
  color: string;
} // Frames remaining

export const DungeonCanvas: React.FC<DungeonCanvasProps> = ({ dungeon, onRoomSelect, selectedRoomId, inputRef, playerRef, visitedRef, enemiesRef, projectilesRef, floatingTextsRef, onOpenChest, onExtract, onGameOver, skinData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPos, setHoverPos] = useState<{x: number, y: number} | null>(null);
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const [dpr, setDpr] = useState(1);
  
  const cameraRef = useRef({ x: 0, y: 0 });
  const [skinSprites, setSkinSprites] = useState<{
    idle: HTMLImageElement[];
    attack: HTMLImageElement[];
    move: HTMLImageElement[];
  }>({ idle: [], attack: [], move: [] });
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const animationTimeRef = useRef<number>(0);
  
  // Visuals for Blink
  const blinkTrailsRef = useRef<BlinkTrail[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    setDpr(window.devicePixelRatio || 1);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewport({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height)
        });
        setDpr(window.devicePixelRatio || 1);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (dungeon && dungeon.rooms && dungeon.rooms.length > 0) {
      const startRoom = dungeon.rooms[0];
      playerRef.current.x = (startRoom.x + Math.floor(startRoom.w / 2)) * TILE_SIZE;
      playerRef.current.y = (startRoom.y + Math.floor(startRoom.h / 2)) * TILE_SIZE;
      cameraRef.current.x = playerRef.current.x - viewport.width / 2;
      cameraRef.current.y = playerRef.current.y - viewport.height / 2;
    }
  }, [dungeon, viewport]); 

  // 加载皮肤图片
  useEffect(() => {
    if (!skinData) return;

    const loadImages = (urls: string[]): Promise<HTMLImageElement[]> => {
      return Promise.all(
        urls.map(url => {
          return new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            img.onload = () => resolve(img);
            img.onerror = () => {
              console.error(`Failed to load image: ${url}`);
              resolve(img); // 即使加载失败也继续，避免动画中断
            };
          });
        })
      );
    };

    Promise.all([
      loadImages(skinData.idle_image_urls),
      loadImages(skinData.attack_image_urls),
      loadImages(skinData.move_image_urls)
    ]).then(([idleImages, attackImages, moveImages]) => {
      setSkinSprites({ idle: idleImages, attack: attackImages, move: moveImages });
      setImagesLoaded(true);
    });
  }, [skinData]);

  const floorNoise = useMemo(() => {
    const noise: number[][] = [];
    for(let y=0; y<dungeon.height; y++) {
      const row: number[] = [];
      for(let x=0; x<dungeon.width; x++) {
        row.push(Math.random());
      }
      noise.push(row);
    }
    return noise;
  }, [dungeon]);

  const updateFogOfWar = () => {
     if (!visitedRef.current || visitedRef.current.length === 0) return;
     const p = playerRef.current;
     const cx = Math.floor((p.x + TILE_SIZE / 2) / TILE_SIZE);
     const cy = Math.floor((p.y + TILE_SIZE / 2) / TILE_SIZE);
     const radius = 7;
     const startY = Math.max(0, cy - radius);
     const endY = Math.min(dungeon.height - 1, cy + radius);
     const startX = Math.max(0, cx - radius);
     const endX = Math.min(dungeon.width - 1, cx + radius);
     const r2 = radius * radius;
     for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
           const dy = y - cy;
           const dx = x - cx;
           if (dx*dx + dy*dy <= r2) {
              if (visitedRef.current[y]) visitedRef.current[y][x] = true;
           }
        }
     }
  };

  const getTargetAt = (nextX: number, nextY: number, boxSize: number = 14): Item | null => {
    const cx = nextX + (TILE_SIZE - boxSize) / 2;
    const cy = nextY + TILE_SIZE - boxSize - 2;
    const gx = Math.floor(cx / TILE_SIZE);
    const gy = Math.floor(cy / TILE_SIZE);
    
    // Check if there is an item at this grid position
    for (const room of dungeon.rooms) {
      const item = room.items.find(i => i.x === gx && i.y === gy);
      if (item) return item;
    }
    return null;
  };

  const isWallOrVoid = (gx: number, gy: number) => {
    if (gy < 0 || gy >= dungeon.height || gx < 0 || gx >= dungeon.width) return true;
    const tile = dungeon.grid[gy][gx];
    return tile === TileType.WALL || tile === TileType.VOID;
  };

  // Helper to check if a rect is valid
  const isValidPosition = (px: number, py: number) => {
    const boxSize = 14;
    const offsetX = (TILE_SIZE - boxSize) / 2;
    const offsetY = TILE_SIZE - boxSize - 2;
    
    const x1 = px + offsetX;
    const y1 = py + offsetY;
    const x2 = x1 + boxSize;
    const y2 = y1 + boxSize;

    // Check 4 corners
    const c1 = isWallOrVoid(Math.floor(x1/TILE_SIZE), Math.floor(y1/TILE_SIZE));
    const c2 = isWallOrVoid(Math.floor(x2/TILE_SIZE), Math.floor(y1/TILE_SIZE));
    const c3 = isWallOrVoid(Math.floor(x1/TILE_SIZE), Math.floor(y2/TILE_SIZE));
    const c4 = isWallOrVoid(Math.floor(x2/TILE_SIZE), Math.floor(y2/TILE_SIZE));

    return !(c1 || c2 || c3 || c4);
  };

  const tryMove = (p: PlayerState, dx: number, dy: number) => {
      const nextX = p.x + dx;
      const nextY = p.y + dy;
      const boxSize = 14;

      // --- Interaction Check ---
      const targetItem = getTargetAt(nextX, nextY, boxSize);
      if (targetItem) {
        if (targetItem.type === ItemType.CHEST && !targetItem.isOpen) {
           p.interactionTargetId = targetItem.id;
           return; // Stop move
        }
        if (targetItem.type === ItemType.EXIT) {
           p.interactionTargetId = targetItem.id;
           return; // Stop move
        }
      }

      // Separate X and Y checks for sliding
      if (isValidPosition(nextX, p.y)) p.x = nextX;
      if (isValidPosition(p.x, nextY)) p.y = nextY;
  }

  const spawnFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      text,
      color,
      life: 60,
      velocity: TEXT_FLOAT_SPEED
    });
  };

  const updatePhysics = (timestamp: number) => {
    const p = playerRef.current;
    const input = inputRef.current;
    
    // --- Phase 1: Interaction Handling ---
    if (p.interactionTargetId) {
      // Find the item
      let targetItem: Item | undefined;
      for(const r of dungeon.rooms) {
        targetItem = r.items.find(i => i.id === p.interactionTargetId);
        if (targetItem) break;
      }

      if (targetItem) {
        if ((targetItem.type === ItemType.CHEST && !targetItem.isOpen) || targetItem.type === ItemType.EXIT) {
           p.interactionTimer++;
           p.isMoving = false; // Force stop animation
           
           // Completion
           if (p.interactionTimer >= INTERACTION_DURATION) {
             if (targetItem.type === ItemType.CHEST) {
                targetItem.isOpen = true; // Mark open locally
                onOpenChest(p.interactionTargetId); 
             } else if (targetItem.type === ItemType.EXIT && onExtract) {
                onExtract();
             }
             p.interactionTargetId = null;
             p.interactionTimer = 0;
           }
           return; // BLOCK MOVEMENT AND OTHER ACTIONS
        } else {
           // Invalid target state
           p.interactionTargetId = null;
           p.interactionTimer = 0;
        }
      } else {
        // Lost target
        p.interactionTargetId = null;
        p.interactionTimer = 0;
      }
    }

    if (p.attackCooldown > 0) p.attackCooldown--;
    if (p.invincibilityTimer > 0) p.invincibilityTimer--;
    if (p.fireCooldown > 0) p.fireCooldown--;
    if (p.rollCooldown > 0) p.rollCooldown--;

    // --- INSTANT BLINK LOGIC ---
    if (input.isDodging && p.rollCooldown <= 0) {
       let rdx = input.dx;
       let rdy = input.dy;
       
       // If no input, blink forward
       if (rdx === 0 && rdy === 0) {
          rdx = p.facingLeft ? -1 : 1;
          rdy = 0;
       } else {
          // Normalize input vector
          const len = Math.sqrt(rdx*rdx + rdy*rdy);
          if (len > 0) { rdx /= len; rdy /= len; }
       }

       // Raycast for furthest valid position
       let bestX = p.x;
       let bestY = p.y;
       // Check every 8 pixels up to BLINK_DISTANCE
       for(let dist = 8; dist <= BLINK_DISTANCE; dist += 8) {
         const tx = p.x + rdx * dist;
         const ty = p.y + rdy * dist;
         if (isValidPosition(tx, ty)) {
           bestX = tx;
           bestY = ty;
         } else {
           break; // Hit wall
         }
       }

       // Only blink if we actually move somewhere distinct
       if (Math.abs(bestX - p.x) > 1 || Math.abs(bestY - p.y) > 1) {
         // Create Ghost Trail at OLD position
         blinkTrailsRef.current.push({
           x: p.x,
           y: p.y,
           frameIndex: p.frameIndex,
           facingLeft: p.facingLeft,
           life: 10
         });

         // Teleport
         p.x = bestX;
         p.y = bestY;
         p.rollCooldown = BLINK_COOLDOWN;
         p.invincibilityTimer = 15;
       }
    }

    // Normal Movement using player stats
    const moveSpeed = p.speed || 3.5;
    let dx = input.dx * moveSpeed;
    let dy = input.dy * moveSpeed;
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    if (dx !== 0 || dy !== 0) {
      p.isMoving = true;
      if (dx < 0) p.facingLeft = true;
      if (dx > 0) p.facingLeft = false;
      tryMove(p, dx, dy);
    } else {
      p.isMoving = false;
    }

    // Manual Fire Logic - Only fire when attack button is pressed once
    const pCenterX = p.x + TILE_SIZE / 2;
    const pCenterY = p.y + TILE_SIZE / 2;

    if (p.fireCooldown <= 0 && input.attackPressed) {
      // 立即重置attackPressed标志，确保只触发一次攻击
      input.attackPressed = false;
      input.isAttacking = true;
      // Find nearest enemy to lock onto
      let nearestEnemy: Enemy | null = null;
      let nearestDist = Infinity;
      
      const activeEnemies = enemiesRef.current.filter(e => e.health > 0);
      for (const e of activeEnemies) {
        const ex = e.x + TILE_SIZE / 2;
        const ey = e.y + TILE_SIZE / 2;
        const dx = ex - pCenterX;
        const dy = ey - pCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < nearestDist && dist < 300) { // Only lock onto enemies within 300 pixels
          nearestDist = dist;
          nearestEnemy = e;
        }
      }
      
      // Determine bullet direction
      const projSpeed = p.projectileSpeed || 8;
      let vx: number, vy: number;
      
      if (nearestEnemy) {
        // Lock onto nearest enemy
        const targetX = nearestEnemy.x + TILE_SIZE / 2;
        const targetY = nearestEnemy.y + TILE_SIZE / 2;
        const angle = Math.atan2(targetY - pCenterY, targetX - pCenterX);
        vx = Math.cos(angle) * projSpeed;
        vy = Math.sin(angle) * projSpeed;
      } else {
        // Fallback to player facing if no enemies nearby
        const bulletAngle = p.facingLeft ? Math.PI : 0;
        vx = Math.cos(bulletAngle) * projSpeed;
        vy = Math.sin(bulletAngle) * projSpeed;
      }
      
      projectilesRef.current.push({
         id: Math.random().toString(),
         x: pCenterX,
         y: pCenterY,
         vx,
         vy,
         life: 60,
         damage: (p.damage || 10) + Math.floor(Math.random() * 5)
      });
      
      p.fireCooldown = FIRE_RATE;
    }

    // Particle Effects
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
       const particle = particlesRef.current[i];
       particle.x += particle.vx;
       particle.y += particle.vy;
       particle.vx *= 0.95;
       particle.vy *= 0.95;
       particle.life--;
       particle.alpha *= 0.98;
       if (particle.life <= 0) {
          particlesRef.current.splice(i, 1);
       }
    }

    // Projectiles
    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
       const proj = projectilesRef.current[i];
       proj.x += proj.vx;
       proj.y += proj.vy;
       proj.life--;
       if (isWallOrVoid(Math.floor(proj.x/TILE_SIZE), Math.floor(proj.y/TILE_SIZE))) {
          projectilesRef.current.splice(i, 1);
          continue;
       }
       let hit = false;
       const activeEnemies = enemiesRef.current.filter(e => e.health > 0);
       for (const e of activeEnemies) {
          const ex = e.x + 4;
          const ey = e.y + 4;
          if (proj.x >= ex && proj.x <= ex + 24 && proj.y >= ey && proj.y <= ey + 24) {
             e.health -= proj.damage;
             e.state = 'hit';
             e.hitFlash = 10;
             e.vx = proj.vx * 0.5;
             e.vy = proj.vy * 0.5;
             spawnFloatingText(e.x + TILE_SIZE/2, e.y, `-${proj.damage}`, '#ef4444');
             
             // Create hit particle effect
             for (let j = 0; j < 8; j++) {
               const angle = (Math.PI * 2 * j) / 8;
               const speed = 3 + Math.random() * 2;
               particlesRef.current.push({
                 id: Math.random().toString(),
                 x: proj.x,
                 y: proj.y,
                 vx: Math.cos(angle) * speed,
                 vy: Math.sin(angle) * speed,
                 life: 20 + Math.floor(Math.random() * 20),
                 alpha: 1,
                 color: '#ef4444'
               });
             }
             
             hit = true;
             break;
          }
       }
       if (hit || proj.life <= 0) {
          projectilesRef.current.splice(i, 1);
       }
    }

    // Enemies
    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
       const e = enemiesRef.current[i];
       if (e.health <= 0 && e.state !== 'dying') {
           e.state = 'dying';
           e.deathTimer = 20;
       }
       if (e.state === 'dying') {
           if (e.deathTimer !== undefined && e.deathTimer > 0) {
               e.deathTimer--;
               e.vx = 0; e.vy = 0;
           } else {
               enemiesRef.current.splice(i, 1);
           }
           continue;
       }
       if (e.cooldown > 0) e.cooldown--;
       if (e.hitFlash > 0) e.hitFlash--;
       if (e.state === 'hit' && e.hitFlash === 0) e.state = 'chase';

       const pdx = (p.x + TILE_SIZE/2) - (e.x + TILE_SIZE/2);
       const pdy = (p.y + TILE_SIZE/2) - (e.y + TILE_SIZE/2);
       const dist = Math.sqrt(pdx*pdx + pdy*pdy);

       if (dist < 200 && e.state !== 'hit') {
          e.state = 'chase';
          const angle = Math.atan2(pdy, pdx);
          e.vx = Math.cos(angle) * e.speed;
          e.vy = Math.sin(angle) * e.speed;
          if (e.vx < 0) e.facingLeft = true;
          if (e.vx > 0) e.facingLeft = false;
       } else {
          e.state = 'idle';
          e.vx *= 0.9; e.vy *= 0.9;
       }

       const nextEX = e.x + e.vx;
       const nextEY = e.y + e.vy;
       const eBox = 16;
       const eOff = (TILE_SIZE - eBox) / 2;
       
       const canEX = !isWallOrVoid(Math.floor((nextEX + eOff)/TILE_SIZE), Math.floor((e.y + eOff)/TILE_SIZE));
       if (canEX) e.x = nextEX;
       const canEY = !isWallOrVoid(Math.floor((e.x + eOff)/TILE_SIZE), Math.floor((nextEY + eOff)/TILE_SIZE));
       if (canEY) e.y = nextEY;

       if (dist < 20 && e.cooldown <= 0 && p.invincibilityTimer <= 0) {
          const damage = e.damage || 10;
          p.health = Math.max(0, p.health - damage);
          p.invincibilityTimer = 30;
          e.cooldown = 60;
          spawnFloatingText(p.x + TILE_SIZE/2, p.y, `-${damage}`, '#fbbf24');

          if (p.health <= 0 && onGameOver) {
            onGameOver();
          }
       }
    }

    // Float text
    for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
       const ft = floatingTextsRef.current[i];
       ft.y -= ft.velocity;
       ft.life--;
       if (ft.life <= 0) floatingTextsRef.current.splice(i, 1);
    }
    
    // Blink Trails
    for (let i = blinkTrailsRef.current.length - 1; i >= 0; i--) {
       const trail = blinkTrailsRef.current[i];
       trail.life--;
       if (trail.life <= 0) blinkTrailsRef.current.splice(i, 1);
    }

    updateFogOfWar();

    if (timestamp - p.lastFrameTime > ANIMATION_SPEED) {
      if (p.isMoving) p.frameIndex = (p.frameIndex + 1) % 10;
      else p.frameIndex = 0;
      p.lastFrameTime = timestamp;
    }

    const targetCamX = p.x + TILE_SIZE/2 - viewport.width / 2;
    const targetCamY = p.y + TILE_SIZE/2 - viewport.height / 2;
    cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1;
    cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.1;

    const maxCamX = (dungeon.width * TILE_SIZE) - viewport.width;
    const maxCamY = (dungeon.height * TILE_SIZE) - viewport.height;
    if (maxCamX > 0) cameraRef.current.x = Math.max(0, Math.min(cameraRef.current.x, maxCamX));
    else cameraRef.current.x = maxCamX / 2;
    if (maxCamY > 0) cameraRef.current.y = Math.max(0, Math.min(cameraRef.current.y, maxCamY));
    else cameraRef.current.y = maxCamY / 2;
  };

  const render = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 更新动画时间
    animationTimeRef.current = timestamp;

    updatePhysics(timestamp);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    ctx.save();
    const camX = Math.floor(cameraRef.current.x);
    const camY = Math.floor(cameraRef.current.y);
    ctx.translate(-camX, -camY);

    const startCol = Math.floor(camX / TILE_SIZE);
    const endCol = startCol + (Math.floor(viewport.width / TILE_SIZE)) + 1;
    const startRow = Math.floor(camY / TILE_SIZE);
    const endRow = startRow + (Math.floor(viewport.height / TILE_SIZE)) + 1;
    const renderStartX = Math.max(0, startCol - 2);
    const renderEndX = Math.min(dungeon.width, endCol + 2);
    const renderStartY = Math.max(0, startRow - 2);
    const renderEndY = Math.min(dungeon.height, endRow + 2);

    for (let y = renderStartY; y < renderEndY; y++) {
      for (let x = renderStartX; x < renderEndX; x++) {
        const tile = dungeon.grid[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (tile === TileType.FLOOR || tile === TileType.CORRIDOR) {
          drawFloorTile(ctx, x, y, px, py, floorNoise[y][x]);
        }
      }
    }

    const p = playerRef.current;
    const playerFeetY = p.y + TILE_SIZE - 4;
    const playerSortRow = Math.floor(playerFeetY / TILE_SIZE);
    const entitiesToRender = enemiesRef.current;

    // Draw Blink Trails
    blinkTrailsRef.current.forEach(trail => {
       drawGhost(ctx, trail);
    });

    for (let y = renderStartY; y < renderEndY; y++) {
      for (let x = renderStartX; x < renderEndX; x++) {
        const tile = dungeon.grid[y][x];
        if (tile === TileType.WALL) {
           drawWall(ctx, x, y, x * TILE_SIZE, y * TILE_SIZE, dungeon);
        }
      }
      dungeon.rooms.forEach(room => {
        room.items.forEach(item => {
          if (item.y === y) {
             const isInteracting = p.interactionTargetId === item.id;
             drawItem(ctx, item.x * TILE_SIZE, item.y * TILE_SIZE, item.type, item.variant || 0, isInteracting, timestamp);
             if (isInteracting) {
                drawInteractionRing(ctx, item.x * TILE_SIZE, item.y * TILE_SIZE, p.interactionTimer);
             }
          }
        });
      });
      entitiesToRender.forEach(e => {
        const enemyFeetY = e.y + TILE_SIZE - 4;
        const enemyRow = Math.floor(enemyFeetY / TILE_SIZE);
        if (enemyRow === y) drawEnemy(ctx, e, timestamp);
      });
      if (playerSortRow === y) {
        drawPlayer(ctx, p, inputRef.current.isAttacking);
      }
    }

    // Draw particles
    particlesRef.current.forEach(particle => {
       ctx.save();
       ctx.globalAlpha = particle.alpha;
       ctx.fillStyle = particle.color;
       ctx.beginPath();
       ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
       ctx.fill();
       ctx.restore();
    });

    // Draw projectiles
    projectilesRef.current.forEach(proj => {
       ctx.fillStyle = '#fde047';
       ctx.beginPath(); ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2); ctx.fill();
       ctx.fillStyle = 'rgba(253, 224, 71, 0.4)';
       ctx.beginPath(); ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2); ctx.fill();
    });

    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'center';
    floatingTextsRef.current.forEach(ft => {
       ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.strokeText(ft.text, ft.x, ft.y);
       ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x, ft.y);
    });

    if (hoverPos) {
       ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
       ctx.fillRect(hoverPos.x * TILE_SIZE, hoverPos.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    if (p.invincibilityTimer > 0 && Math.floor(timestamp / 100) % 2 === 0) {
       ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
       ctx.fillRect(0,0, dungeon.width*TILE_SIZE, dungeon.height*TILE_SIZE);
    }
    ctx.restore();
  };

  const drawFloorTile = (ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, noise: number) => {
    ctx.fillStyle = '#334155'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = noise > 0.5 ? '#475569' : '#1e293b'; ctx.globalAlpha = 0.05; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#0f172a'; ctx.globalAlpha = 0.1; ctx.fillRect(px, py + TILE_SIZE - 1, TILE_SIZE, 1); ctx.fillRect(px + TILE_SIZE - 1, py, 1, TILE_SIZE);
    ctx.globalAlpha = 1.0;
  };

  const drawWall = (ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, dungeon: DungeonData) => {
    if (y + 1 < dungeon.height && dungeon.grid[y+1][x] !== TileType.WALL) {
       ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(px, py + TILE_SIZE, TILE_SIZE, TILE_SIZE / 2);
    }
    const h = TILE_SIZE; const drawY = py - 12; 
    ctx.fillStyle = '#475569'; ctx.fillRect(px, drawY, TILE_SIZE, h);
    ctx.fillStyle = '#64748b'; ctx.fillRect(px, drawY, TILE_SIZE, 4);
    ctx.fillStyle = '#1e293b'; if ((x + y) % 3 === 0) ctx.fillRect(px + 8, drawY + 16, 4, 2); 
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(px + TILE_SIZE - 2, drawY, 2, h);
  };

  const drawInteractionRing = (ctx: CanvasRenderingContext2D, px: number, py: number, timer: number) => {
     const cx = px + TILE_SIZE / 2;
     const cy = py - 10;
     const radius = 10;
     const progress = timer / INTERACTION_DURATION;

     ctx.beginPath();
     ctx.arc(cx, cy, radius, 0, Math.PI * 2);
     ctx.strokeStyle = 'rgba(0,0,0,0.5)';
     ctx.lineWidth = 4;
     ctx.stroke();

     ctx.beginPath();
     ctx.arc(cx, cy, radius, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * progress));
     ctx.strokeStyle = '#3b82f6'; 
     ctx.lineWidth = 4;
     ctx.stroke();
     
     ctx.beginPath();
     ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
     ctx.strokeStyle = '#f59e0b';
     ctx.lineWidth = 1;
     ctx.stroke();
  };

  const drawItem = (ctx: CanvasRenderingContext2D, px: number, py: number, type: ItemType, variant: number, isInteracting: boolean, time: number) => {
     const cx = px + TILE_SIZE / 2;
     const cy = py + TILE_SIZE / 2;
     const dy = -4; 
     let shakeY = 0;
     if (isInteracting) {
        shakeY = Math.sin(time / 50) * 2;
     }

     ctx.save();
     ctx.translate(0, shakeY);

     switch (type) {
        case ItemType.EXIT:
          const angle = time / 500;
          const pulse = 1 + Math.sin(time / 200) * 0.2; 
          
          const gradient = ctx.createLinearGradient(0, cy, 0, cy - 80);
          gradient.addColorStop(0, 'rgba(6, 182, 212, 0.6)');
          gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(cx - 12, cy - 80, 24, 80);

          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'black'; ctx.shadowBlur = 2;
          ctx.fillText("EXIT", cx, cy - 50 + (Math.sin(time/200)*3));
          ctx.shadowBlur = 0;

          ctx.translate(cx, cy + 4);
          ctx.scale(pulse, pulse);
          ctx.rotate(angle);
          
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 15;
          ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
          
          ctx.beginPath(); ctx.rect(-10, -10, 20, 20); ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 1; ctx.stroke();
          
          ctx.rotate(-angle * 2);
          ctx.fillStyle = '#cffafe'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          break;

        case ItemType.TABLE:
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx, py + TILE_SIZE - 4, TILE_SIZE/2 - 4, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#451a03'; ctx.fillRect(px + 4, py + 16, 4, 12); ctx.fillRect(px + TILE_SIZE - 8, py + 16, 4, 12);
          ctx.fillStyle = '#78350f'; ctx.fillRect(px + 2, py + 8 + dy, TILE_SIZE - 4, 14);
          ctx.fillStyle = '#92400e'; ctx.fillRect(px + 2, py + 8 + dy, TILE_SIZE - 4, 2);
          break;
        case ItemType.CHAIR:
          ctx.fillStyle = '#451a03'; ctx.fillRect(px + 8, py + 18, 3, 10); ctx.fillRect(px + TILE_SIZE - 11, py + 18, 3, 10);
          ctx.fillStyle = '#78350f'; ctx.fillRect(px + 8, py + 14 + dy, TILE_SIZE - 16, 4);
          ctx.fillStyle = '#92400e'; ctx.fillRect(px + 8, py + 4 + dy, TILE_SIZE - 16, 12);
          break;
        case ItemType.BOOKSHELF:
          ctx.fillStyle = '#451a03'; ctx.fillRect(px + 2, py - 4, TILE_SIZE - 4, TILE_SIZE + 4);
          ctx.fillStyle = '#78350f'; ctx.fillRect(px + 4, py, TILE_SIZE - 8, 2); ctx.fillRect(px + 4, py + 10, TILE_SIZE - 8, 2); ctx.fillRect(px + 4, py + 20, TILE_SIZE - 8, 2);
          const bookColors = ['#dc2626', '#1d4ed8', '#047857', '#eab308'];
          for(let i = 0; i < 3; i++) {
             const shelfY = py + 2 + (i*10);
             for(let b = 0; b < 5; b++) {
                ctx.fillStyle = bookColors[(variant + b + i) % bookColors.length]; ctx.fillRect(px + 6 + (b * 4), shelfY, 3, 8);
             }
          }
          break;
        case ItemType.WEAPON_RACK:
          ctx.fillStyle = '#451a03'; ctx.fillRect(px + 6, py + 16, 2, 10); ctx.fillRect(px + TILE_SIZE - 8, py + 16, 2, 10);
          ctx.fillStyle = '#78350f'; ctx.fillRect(px + 4, py + 10, TILE_SIZE - 8, 2); ctx.fillRect(px + 4, py + 22, TILE_SIZE - 8, 2);
          ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath();
          ctx.moveTo(px + 10, py + 6); ctx.lineTo(px + 10, py + 20); ctx.moveTo(px + 16, py + 6); ctx.lineTo(px + 16, py + 20); ctx.moveTo(px + 22, py + 6); ctx.lineTo(px + 22, py + 20); ctx.stroke();
          ctx.fillStyle = '#f59e0b'; ctx.fillRect(px + 8, py + 6, 4, 1); ctx.fillRect(px + 14, py + 6, 4, 1); ctx.fillRect(px + 20, py + 6, 4, 1);
          break;
        case ItemType.ALTAR:
          ctx.fillStyle = '#57534e'; ctx.fillRect(px + 4, py + 8, TILE_SIZE - 8, 16);
          ctx.fillStyle = '#f59e0b'; ctx.fillRect(px + 3, py + 7, TILE_SIZE - 6, 2);
          ctx.fillStyle = '#dc2626'; ctx.fillRect(px + 8, py + 8, TILE_SIZE - 16, 16);
          ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(cx, py + 6, 3, 0, Math.PI*2); ctx.fill();
          break;
        case ItemType.CHEST:
          const chX = px + 4;
          const chY = py + 12;
          const chW = TILE_SIZE - 8;
          const chH = 14;
          ctx.fillStyle = '#78350f'; ctx.fillRect(chX, chY, chW, chH);
          ctx.fillStyle = '#f59e0b'; ctx.fillRect(chX, chY + 4, chW, 1);
          ctx.fillStyle = isInteracting ? '#3b82f6' : '#fcd34d'; 
          ctx.fillRect(cx - 2, chY + 3, 4, 4);
          
          if (isInteracting) {
             ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 10;
             ctx.fillStyle = 'rgba(59,130,246,0.5)'; ctx.fillRect(chX, chY, chW, chH);
             ctx.shadowBlur = 0;
          }
          break;
        case ItemType.DECORATION:
        default:
          if (variant === 0) {
            const cw = 16; const ch = 14; const cpx = cx - cw/2; const cpy = cy + 4;
            ctx.fillStyle = '#713f12'; ctx.fillRect(cpx, cpy, cw, ch); ctx.fillStyle = '#fbbf24'; ctx.fillRect(cpx + 4, cpy + 2, 8, 8);
          } else {
            ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(cx, cy + 4, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'white'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(cx - 2, cy + 2, 2, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0;
          }
          break;
     }
     ctx.restore();
   };

  const drawGhost = (ctx: CanvasRenderingContext2D, t: BlinkTrail) => {
    const drawX = Math.floor(t.x + TILE_SIZE/2);
    const drawY = Math.floor(t.y + TILE_SIZE/2 - 16);
    const spriteSize = 64;

    ctx.save();
    ctx.translate(drawX, drawY);
    if (t.facingLeft) ctx.scale(-1, 1);
    
    // Ghost fade
    ctx.globalAlpha = (t.life / 10) * 0.4;
    ctx.globalCompositeOperation = 'source-over'; // standard
    
    // 使用待机图片作为幽灵效果
    if (imagesLoaded && skinSprites.idle.length > 0) {
       const sprite = skinSprites.idle[t.frameIndex % skinSprites.idle.length];
       ctx.drawImage(sprite, -spriteSize/2, -spriteSize/2, spriteSize, spriteSize);
       // Tint Cyan
       ctx.globalCompositeOperation = 'source-atop';
       ctx.fillStyle = '#22d3ee';
       ctx.fillRect(-spriteSize/2, -spriteSize/2, spriteSize, spriteSize);
    }
    ctx.restore();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: PlayerState, isAttacking: boolean) => {
    const drawX = Math.floor(p.x + TILE_SIZE/2);
    const drawY = Math.floor(p.y + TILE_SIZE/2); // Moved down by 16 pixels to match reduced size
    const spriteSize = 38; // Reduced by 40% from original 64
    const barWidth = 24; const barHeight = 4; const barOffset = 42; 

    ctx.fillStyle = '#0f172a'; ctx.fillRect(drawX - barWidth / 2 - 1, drawY - barOffset - 1, barWidth + 2, barHeight + 2);
    ctx.fillStyle = '#334155'; ctx.fillRect(drawX - barWidth / 2, drawY - barOffset, barWidth, barHeight);
    const ratio = Math.max(0, Math.min(1, p.health / p.maxHealth));
    ctx.fillStyle = ratio > 0.5 ? '#22c55e' : '#ef4444'; ctx.fillRect(drawX - barWidth / 2, drawY - barOffset, barWidth * ratio, barHeight);

    ctx.save();
    ctx.translate(drawX, drawY);
    if (p.facingLeft) ctx.scale(-1, 1);
    
    if (isAttacking) ctx.rotate((Math.random() - 0.5) * 0.2); 

    // Shadow moved down to match new player position
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 20, 10, 4, 0, 0, Math.PI*2); ctx.fill();

    if (imagesLoaded) {
      // 根据玩家状态选择图片数组
      let imageArray = skinSprites.idle;
      if (isAttacking) {
        imageArray = skinSprites.attack.length > 0 ? skinSprites.attack : skinSprites.idle;
      } else if (p.isMoving) {
        imageArray = skinSprites.move.length > 0 ? skinSprites.move : skinSprites.idle;
      }
      
      // 如果没有合适的图片数组，使用默认绘制
      if (imageArray.length === 0) {
        ctx.fillStyle = '#ef4444'; ctx.fillRect(-8, -12, 16, 24);
        ctx.restore();
        return;
      }
      
      // 1秒内循环播放所有图片
      const animationDuration = 1000; // 1秒
      const frameIndex = Math.floor((animationTimeRef.current % animationDuration) / (animationDuration / imageArray.length));
      const sprite = imageArray[frameIndex % imageArray.length];
      
      if (p.invincibilityTimer > 10 && p.rollCooldown > BLINK_COOLDOWN - 10) {
         ctx.drawImage(sprite, -spriteSize/2, -spriteSize/2, spriteSize, spriteSize);
         ctx.globalCompositeOperation = 'source-atop';
         ctx.fillStyle = 'rgba(34, 211, 238, 0.6)';
         ctx.fillRect(-spriteSize/2, -spriteSize/2, spriteSize, spriteSize);
      } else {
         ctx.drawImage(sprite, -spriteSize/2, -spriteSize/2, spriteSize, spriteSize);
      }
    } else {
      ctx.fillStyle = '#ef4444'; ctx.fillRect(-8, -12, 16, 24);
    }
    ctx.restore();
  };

  const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy, time: number) => {
    const drawX = Math.floor(e.x + TILE_SIZE/2);
    const drawY = Math.floor(e.y + TILE_SIZE/2 - 4);
    
    ctx.save();
    if (e.state === 'dying' && e.deathTimer !== undefined) {
      const deathRatio = e.deathTimer / 20;
      ctx.globalAlpha = deathRatio;
      ctx.translate(drawX, drawY);
      ctx.scale(0.5 + 0.5 * deathRatio, 0.5 + 0.5 * deathRatio);
      ctx.translate(-drawX, -drawY);
    }

    const bounce = Math.sin(time / 200) * 2;
    if (e.state !== 'dying') {
      const barWidth = 20; const barHeight = 3; const barOffset = e.type === EnemyType.BAT ? 35 : 25;
      ctx.fillStyle = '#0f172a'; ctx.fillRect(drawX - barWidth/2 - 1, drawY - barOffset - 1 - bounce, barWidth + 2, barHeight + 2);
      ctx.fillStyle = '#334155'; ctx.fillRect(drawX - barWidth/2, drawY - barOffset - bounce, barWidth, barHeight);
      const ratio = e.health / e.maxHealth; ctx.fillStyle = '#ef4444'; ctx.fillRect(drawX - barWidth/2, drawY - barOffset - bounce, barWidth * ratio, barHeight);
    }

    ctx.translate(drawX, drawY - bounce);
    if (e.hitFlash > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'brightness(200%)'; }
    if (e.facingLeft) ctx.scale(-1, 1);
    
    if (e.state !== 'dying') {
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); const shadowY = e.type === EnemyType.BAT ? 20 + bounce : 8 + bounce; ctx.ellipse(0, shadowY, 10, 3, 0, 0, Math.PI*2); ctx.fill();
    }

    if (e.type === EnemyType.SLIME) {
      ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(0, 0, 10, Math.PI, 0); ctx.lineTo(10, 8); ctx.lineTo(-10, 8); ctx.fill();
      ctx.fillStyle = '#86efac'; ctx.beginPath(); ctx.ellipse(-4, -4, 2, 4, -0.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = e.state === 'dying' ? '#333' : '#064e3b'; ctx.beginPath(); ctx.arc(-4, 0, 2, 0, Math.PI*2); ctx.arc(4, 0, 2, 0, Math.PI*2); ctx.fill();
    } else if (e.type === EnemyType.BAT) {
      const wingFlap = e.state === 'dying' ? 0 : Math.sin(time / 50) * 5;
      ctx.fillStyle = '#581c87'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#7e22ce'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(12, -8 - wingFlap, 16, -2); ctx.quadraticCurveTo(10, 4, 4, 2); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-12, -8 - wingFlap, -16, -2); ctx.quadraticCurveTo(-10, 4, -4, 2); ctx.fill();
      ctx.fillStyle = e.state === 'dying' ? '#333' : '#facc15'; ctx.beginPath(); ctx.arc(-2, -1, 1, 0, Math.PI*2); ctx.arc(2, -1, 1, 0, Math.PI*2); ctx.fill();
    } else if (e.type === EnemyType.SKELETON) {
      ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(0, -4, 7, 0, Math.PI*2); ctx.fillRect(-4, 0, 8, 6); ctx.fill();
      ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-2, 6, 4, 8); ctx.fillRect(-5, 8, 10, 2); ctx.fillRect(-4, 11, 8, 2);
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(-2.5, -4, 2, 0, Math.PI*2); ctx.arc(2.5, -4, 2, 0, Math.PI*2); ctx.fill();
    }
    
    if (e.state === 'chase' && e.type !== EnemyType.BAT) { 
      ctx.strokeStyle = e.type === EnemyType.SKELETON ? '#000' : '#064e3b'; ctx.lineWidth = 1; ctx.beginPath();
      const yOff = e.type === EnemyType.SKELETON ? -7 : -3; ctx.moveTo(-6, yOff); ctx.lineTo(-2, yOff + 2); ctx.moveTo(6, yOff); ctx.lineTo(2, yOff + 2); ctx.stroke();
    }
    ctx.restore();
  };

  useEffect(() => {
    let animationFrameId: number;
    const animate = (time: number) => {
      render(time);
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [dungeon, selectedRoomId, hoverPos, floorNoise, imagesLoaded, viewport, dpr, onExtract, onGameOver]); 

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const camX = Math.floor(cameraRef.current.x);
    const camY = Math.floor(cameraRef.current.y);
    const clickX = (e.clientX - rect.left) + camX;
    const clickY = (e.clientY - rect.top) + camY;
    const gridX = Math.floor(clickX / TILE_SIZE);
    const gridY = Math.floor(clickY / TILE_SIZE);
    const clickedRoom = dungeon.rooms.find(r => gridX >= r.x && gridX < r.x + r.w && gridY >= r.y && gridY < r.y + r.h);
    onRoomSelect(clickedRoom || null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const camX = Math.floor(cameraRef.current.x);
    const camY = Math.floor(cameraRef.current.y);
    const clickX = (e.clientX - rect.left) + camX;
    const clickY = (e.clientY - rect.top) + camY;
    setHoverPos({ x: Math.floor(clickX / TILE_SIZE), y: Math.floor(clickY / TILE_SIZE) });
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#020617] cursor-crosshair">
      <canvas
        ref={canvasRef}
        width={viewport.width * dpr}
        height={viewport.height * dpr}
        style={{ width: viewport.width, height: viewport.height, imageRendering: 'pixelated' }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverPos(null)}
        className="block"
      />
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%]"></div>
    </div>
  );
};