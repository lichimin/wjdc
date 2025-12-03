

export enum TileType {
  VOID = 0,
  WALL = 1,
  FLOOR = 2,
  DOOR = 3,
  CORRIDOR = 4,
}

export enum ItemType {
  TABLE = 'TABLE',
  CHAIR = 'CHAIR',
  DECORATION = 'DECORATION', // Vases, chests, etc.
  BOOKSHELF = 'BOOKSHELF',
  WEAPON_RACK = 'WEAPON_RACK',
  ALTAR = 'ALTAR',
  CHEST = 'CHEST',
  EXIT = 'EXIT'
}

export enum EnemyType {
  SLIME = 'SLIME',
  BAT = 'BAT',
  SKELETON = 'SKELETON',
  BOSS = 'BOSS',
}

export enum Rarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
  MYTHIC = 'MYTHIC',
  GENESIS = 'GENESIS'
}

export interface LootItem {
  id: string;
  name: string;
  value: number;
  rarity: Rarity;
  iconColor: string;
  imageUrl?: string;
  quantity?: number;
  type?: string; // 'equipment' or 'treasure'
}

export interface Item {
  id: string;
  x: number; // Grid coordinate X
  y: number; // Grid coordinate Y
  type: ItemType;
  variant?: number; // To vary the look slightly
  isOpen?: boolean; // For chests
}

export interface Enemy {
  id: string;
  x: number; // Pixel X
  y: number; // Pixel Y
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  state: 'idle' | 'chase' | 'hit' | 'attack' | 'dying';
  facingLeft: boolean;
  vx: number;
  vy: number;
  cooldown: number; // Attack cooldown
  hitFlash: number; // Frames to flash white when hit
  deathTimer?: number;

  // Boss properties
  isBoss?: boolean;
  abilities?: string[];
  abilityCooldowns?: Record<string, number>;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  velocity: number;
}

export interface Room {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  items: Item[];
  theme?: string; // e.g., "Library", "Armory" - assigned during generation
}

export interface DungeonData {
  width: number;
  height: number;
  grid: TileType[][];
  rooms: Room[];
  enemies: Enemy[];
}

export interface InputState {
  dx: number; // -1 to 1
  dy: number; // -1 to 1
  isAttacking: boolean;
  isDodging: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  facingLeft: boolean;
  isMoving: boolean;
  frameIndex: number;
  lastFrameTime: number;
  health: number;
  maxHealth: number;
  attackCooldown: number;
  fireCooldown: number; // For auto-fire
  invincibilityTimer: number;
  
  // Stats
  damage: number;
  speed: number;
  projectileSpeed: number;
  
  // Additional Stats
  critRate?: number;
  critDamage?: number;
  dodgeRate?: number;
  regen?: number;
  regenTimer?: number;
  lifesteal?: number;
  instantKillRate?: number;

  // Dodge Roll
  rollTimer: number;
  rollCooldown: number;
  rollVx: number;
  rollVy: number;

  // Interaction
  interactionTargetId: string | null;
  interactionTimer: number; // Frames (0 to 60)
}

// 用户相关类型定义

export interface User {
  id: number;
  username: string;
  gold: number;
  level: number;
}

export interface AuthResponse {
  code: number;
  message: string;
  data: User;
  token: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  token?: string;
}

// 认证状态
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}