
import { DungeonData, TileType, Room, Item, ItemType, Enemy, EnemyType } from '../types';

const MAP_WIDTH = 60;
const MAP_HEIGHT = 60;
const MIN_ROOM_SIZE = 6;
const MAX_ROOM_SIZE = 12;
const MAX_ROOMS = 15; // Target 8-15 rooms
const TILE_SIZE = 32; // Needed for enemy pixel placement

// Themes
const THEMES = ['Library', 'Armory', 'Dining', 'Storage', 'Altar', 'Generic'];

// Helper to generate a random integer between min and max (inclusive)
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to check collision between two rooms
const isOverlapping = (r1: Room, r2: Room) => {
  return (
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y
  );
};

export const generateDungeon = (difficultyMultiplier: number = 1, difficultyLevel: string = 'B'): DungeonData => {
  // 1. Initialize Grid
  const grid: TileType[][] = Array.from({ length: MAP_HEIGHT }, () =>
    Array(MAP_WIDTH).fill(TileType.VOID)
  );

  const rooms: Room[] = [];
  const enemies: Enemy[] = [];

  // 2. Place Rooms
  let attempts = 0;
  while (rooms.length < MAX_ROOMS && attempts < 100) {
    attempts++;
    
    const w = randomInt(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    const h = randomInt(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    const x = randomInt(1, MAP_WIDTH - w - 2);
    const y = randomInt(1, MAP_HEIGHT - h - 2);

    // Assign Theme randomly
    let theme = 'Generic';
    if (Math.random() > 0.2) {
      theme = THEMES[randomInt(0, THEMES.length - 2)]; // Slightly weight against Generic in this random pick
    }

    const newRoom: Room = {
      id: `room-${rooms.length + 1}`,
      x,
      y,
      w,
      h,
      items: [],
      theme
    };

    let failed = false;
    for (const otherRoom of rooms) {
      // Add a buffer of 1 tile to prevent rooms from touching directly without walls
      const paddedNew = { ...newRoom, x: newRoom.x - 1, y: newRoom.y - 1, w: newRoom.w + 2, h: newRoom.h + 2 };
      if (isOverlapping(paddedNew, otherRoom)) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      rooms.push(newRoom);
      // Carve room into grid
      for (let ry = 0; ry < h; ry++) {
        for (let rx = 0; rx < w; rx++) {
          grid[y + ry][x + rx] = TileType.FLOOR;
        }
      }
      
      // Add walls around the room
      for (let ry = -1; ry <= h; ry++) {
        for (let rx = -1; rx <= w; rx++) {
          if (ry === -1 || ry === h || rx === -1 || rx === w) {
             const gy = y + ry;
             const gx = x + rx;
             if (gy >= 0 && gy < MAP_HEIGHT && gx >= 0 && gx < MAP_WIDTH) {
               if (grid[gy][gx] === TileType.VOID) {
                 grid[gy][gx] = TileType.WALL;
               }
             }
          }
        }
      }
    }
  }

  // 3. Connect Rooms (Simple Corridor Builder)
  for (let i = 1; i < rooms.length; i++) {
    const prev = rooms[i - 1];
    const curr = rooms[i];

    // Center points
    const pX = prev.x + Math.floor(prev.w / 2);
    const pY = prev.y + Math.floor(prev.h / 2);
    const cX = curr.x + Math.floor(curr.w / 2);
    const cY = curr.y + Math.floor(curr.h / 2);

    // Horizontal then Vertical or Vertical then Horizontal
    if (Math.random() < 0.5) {
      createCorridor(grid, pX, pY, cX, pY);
      createCorridor(grid, cX, pY, cX, cY);
    } else {
      createCorridor(grid, pX, pY, pX, cY);
      createCorridor(grid, pX, cY, cX, cY);
    }
  }

  // 4. Populate Items & Enemies
  // First populate items by theme
  rooms.forEach(room => {
    populateItemsByTheme(room, difficultyLevel);
  });

  // Inject Standard Enemies (Skip Room 0)
  rooms.forEach((room, index) => {
    if (index === 0) return;

    const enemyCount = randomInt(0, 2);
    for(let e = 0; e < enemyCount; e++) {
       const ex = randomInt(room.x + 1, room.x + room.w - 2);
       const ey = randomInt(room.y + 1, room.y + room.h - 2);
       
       const occupied = room.items.some(it => it.x === ex && it.y === ey);
       if (!occupied) {
          const roll = Math.random();
          let type = EnemyType.SLIME;
          let hp = 30;
          let speed = 1.5;
          let damage = 10;

          if (roll < 0.3) {
            type = EnemyType.BAT;
            hp = 15;
            speed = 2.5; 
            damage = 5;  
          } else if (roll < 0.6) {
            type = EnemyType.SKELETON;
            hp = 50;
            speed = 1.0; 
            damage = 15; 
          }

          enemies.push({
            id: `enemy-${room.id}-${e}`,
            x: ex * TILE_SIZE,
            y: ey * TILE_SIZE,
            type,
            health: hp * difficultyMultiplier,
            maxHealth: hp * difficultyMultiplier,
            speed,
            damage: damage * difficultyMultiplier,
            state: 'idle',
            facingLeft: Math.random() < 0.5,
            vx: 0,
            vy: 0,
            cooldown: 0,
            hitFlash: 0
          });
       }
    }
  });

  // Inject BOSS in a random room (not start)
  if (rooms.length > 1) {
     const bossRoomIndex = randomInt(1, rooms.length - 1);
     const bossRoom = rooms[bossRoomIndex];
     const bx = bossRoom.x + Math.floor(bossRoom.w / 2);
     const by = bossRoom.y + Math.floor(bossRoom.h / 2);
     
     const baseBossHP = 300;
     const baseBossDmg = 30;
     
     enemies.push({
        id: `boss-main`,
        x: bx * TILE_SIZE,
        y: by * TILE_SIZE,
        type: EnemyType.BOSS, // Assuming BOSS exists in Enum from previous update
        health: baseBossHP * difficultyMultiplier,
        maxHealth: baseBossHP * difficultyMultiplier,
        speed: 2.0,
        damage: baseBossDmg * difficultyMultiplier,
        state: 'idle',
        facingLeft: false,
        vx: 0, vy: 0, cooldown: 0, hitFlash: 0,
        isBoss: true,
        abilities: ['shoot', 'dash', 'heal', 'ghost'],
        abilityCooldowns: { shoot: 0, dash: 0, heal: 0, ghost: 0 }
     });
     
     // Add a large chest near the BOSS
     let largeChestPlaced = false;
     let attempts = 0;
     const maxAttempts = 50;
     
     while (!largeChestPlaced && attempts < maxAttempts) {
       attempts++;
       // Try to place the large chest within 2 tiles of the BOSS
       const chestX = bx + randomInt(-2, 2);
       const chestY = by + randomInt(-2, 2);
       
       if (tryAddLargeChest(bossRoom, chestX, chestY)) {
         largeChestPlaced = true;
       }
     }
  }

  // 5. Place Exits
  if (rooms.length > 0) {
    // 5a. Exit in Start Room (Room 0) - GUARANTEED NEAR PLAYER
    const startRoom = rooms[0];
    const centerX = startRoom.x + Math.floor(startRoom.w / 2);
    const centerY = startRoom.y + Math.floor(startRoom.h / 2);
    
    let ex = centerX;
    let ey = centerY + 2; 
    
    if (ey >= startRoom.y + startRoom.h - 1) ey = centerY - 2; 
    
    const existingIdx = startRoom.items.findIndex(i => i.x === ex && i.y === ey);
    if (existingIdx !== -1) startRoom.items.splice(existingIdx, 1);
    
    startRoom.items.push({
      id: `exit-start`,
      x: ex,
      y: ey,
      type: ItemType.EXIT,
      variant: 0
    });
  }

  // 5b. Second Exit in a Random Room
  if (rooms.length > 1) {
    let placedSecondExit = false;
    let attempts = 0;
    const possibleRooms = rooms.slice(1);
    
    while (!placedSecondExit && attempts < 50) {
       attempts++;
       const r = possibleRooms[randomInt(0, possibleRooms.length - 1)];
       const ex = randomInt(r.x + 1, r.x + r.w - 2);
       const ey = randomInt(r.y + 1, r.y + r.h - 2);
       
       if (tryAddItem(r, ex, ey, ItemType.EXIT)) {
         placedSecondExit = true;
       }
    }
  }

  // Generate chests based on difficulty
  generateChestsByDifficulty({ width: MAP_WIDTH, height: MAP_HEIGHT, grid, rooms, enemies }, difficultyLevel);
  
  // Return the generated dungeon data
  return { width: MAP_WIDTH, height: MAP_HEIGHT, grid, rooms, enemies };
};

// Generate chests based on difficulty level
function generateChestsByDifficulty(dungeon: DungeonData, difficultyLevel: string) {
  // Calculate total number of chests based on difficulty
  const getTotalChestCount = (level: string): number => {
    switch (level) {
      case 'B': return randomInt(5, 6);
      case 'A': return randomInt(6, 7);
      case 'S': return randomInt(7, 8);
      case 'SS': return randomInt(8, 9);
      case 'SSS': return randomInt(10, 12);
      default: return randomInt(5, 6);
    }
  };
  
  const totalChests = getTotalChestCount(difficultyLevel);
  let chestsPlaced = 0;
  let attempts = 0;
  const maxAttempts = totalChests * 10; // Prevent infinite loop
  
  // Exclude start room (index 0) from chest placement
  const roomsWithoutStart = dungeon.rooms.slice(1);
  
  while (chestsPlaced < totalChests && attempts < maxAttempts) {
    attempts++;
    
    // Randomly select a room from roomsWithoutStart
    const randomRoom = roomsWithoutStart[randomInt(0, roomsWithoutStart.length - 1)];
    
    // Try to place a chest in the selected room
    const tx = randomInt(randomRoom.x + 1, randomRoom.x + randomRoom.w - 2);
    const ty = randomInt(randomRoom.y + 1, randomRoom.y + randomRoom.h - 2);
    
    if (tryAddItem(randomRoom, tx, ty, ItemType.CHEST)) {
      chestsPlaced++;
    }
  }
};

function tryAddItem(room: Room, x: number, y: number, type: ItemType): boolean {
  if (x <= room.x || x >= room.x + room.w - 1 || y <= room.y || y >= room.y + room.h - 1) return false;
  if (room.items.some(i => i.x === x && i.y === y)) return false;
  
  const item: Item = {
    id: `item-${room.id}-${room.items.length}`,
    x,
    y,
    type,
    variant: randomInt(0, 2)
  };
  
  if (type === ItemType.CHEST) {
    item.chestType = 'normal';
  }
  
  room.items.push(item);
  return true;
}

function tryAddLargeChest(room: Room, x: number, y: number): boolean {
  if (x <= room.x || x >= room.x + room.w - 1 || y <= room.y || y >= room.y + room.h - 1) return false;
  if (room.items.some(i => i.x === x && i.y === y)) return false;
  
  room.items.push({
    id: `item-${room.id}-${room.items.length}`,
    x,
    y,
    type: ItemType.CHEST,
    variant: 0,
    chestType: 'large'
  });
  return true;
}

function populateItemsByTheme(room: Room, difficultyLevel: string) {
  const cx = room.x + Math.floor(room.w / 2);
  const cy = room.y + Math.floor(room.h / 2);

  switch (room.theme) {
    case 'Library':
      for (let x = room.x + 1; x < room.x + room.w - 1; x += 2) {
        if (Math.random() > 0.3) tryAddItem(room, x, room.y + 1, ItemType.BOOKSHELF);
      }
      tryAddItem(room, cx, cy, ItemType.TABLE);
      tryAddItem(room, cx + 1, cy, ItemType.CHAIR);
      break;
    case 'Armory':
      for (let y = room.y + 2; y < room.y + room.h - 2; y += 2) {
        if (Math.random() > 0.3) tryAddItem(room, room.x + 1, y, ItemType.WEAPON_RACK);
        if (Math.random() > 0.3) tryAddItem(room, room.x + room.w - 2, y, ItemType.WEAPON_RACK);
      }
      // 移除军械库主题中固定添加的宝箱
      break;
    case 'Dining':
      const tableStart = Math.max(room.x + 2, cx - 2);
      const tableEnd = Math.min(room.x + room.w - 3, cx + 2);
      for (let x = tableStart; x <= tableEnd; x++) {
        tryAddItem(room, x, cy, ItemType.TABLE);
        tryAddItem(room, x, cy - 1, ItemType.CHAIR);
        tryAddItem(room, x, cy + 1, ItemType.CHAIR);
      }
      break;
    case 'Storage':
      const count = randomInt(3, 8);
      for (let i = 0; i < count; i++) {
        const tx = randomInt(room.x + 1, room.x + room.w - 2);
        const ty = randomInt(room.y + 1, room.y + room.h - 2);
        // 降低储藏室中宝箱的概率，从70%降至20%
        const type = Math.random() > 0.8 ? ItemType.CHEST : ItemType.DECORATION;
        tryAddItem(room, tx, ty, type);
      }
      break;
    case 'Altar':
      tryAddItem(room, cx, cy, ItemType.ALTAR);
      tryAddItem(room, room.x + 2, room.y + 2, ItemType.DECORATION);
      tryAddItem(room, room.x + room.w - 3, room.y + 2, ItemType.DECORATION);
      tryAddItem(room, room.x + 2, room.y + room.h - 3, ItemType.DECORATION);
      tryAddItem(room, room.x + room.w - 3, room.y + room.h - 3, ItemType.DECORATION);
      break;
    default: 
      const area = room.w * room.h;
      const density = randomInt(1, Math.floor(area / 10));
      for (let k = 0; k < density; k++) {
        const tx = randomInt(room.x + 1, room.x + room.w - 2);
        const ty = randomInt(room.y + 1, room.y + room.h - 2);
        const rand = Math.random();
        let type = ItemType.DECORATION;
        if (rand < 0.4) type = ItemType.TABLE;
        else if (rand < 0.7) type = ItemType.CHAIR;
        tryAddItem(room, tx, ty, type);
      }
      break;
  }
}

function createCorridor(grid: TileType[][], x1: number, y1: number, x2: number, y2: number) {
  const startX = Math.min(x1, x2);
  const endX = Math.max(x1, x2);
  const startY = Math.min(y1, y2);
  const endY = Math.max(y1, y2);

  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      if (grid[y][x] === TileType.VOID || grid[y][x] === TileType.WALL) {
        grid[y][x] = TileType.CORRIDOR;
        const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        neighbors.forEach(([dx, dy]) => {
           const ny = y + dy;
           const nx = x + dx;
           if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[0].length) {
             if (grid[ny][nx] === TileType.VOID) {
               grid[ny][nx] = TileType.WALL;
             }
           }
        });
      }
    }
  }
}
