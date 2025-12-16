

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
  ELEPHANT = 'ELEPHANT',
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

export interface AdditionalAttribute {
  attr_name: string;
  attr_value: string;
}

export interface LootItem {
  id: string | number;
  item_id: string | number; // 宝物的唯一标识，用于物品合并和接口请求
  name: string;
  value: number;
  rarity: Rarity;
  iconColor: string;
  imageUrl?: string;
  quantity?: number;
  type?: string; // 'equipment' or 'treasure'
  level?: number; // 新增：宝物等级
  slot?: string; // 新增：装备槽位，如weapon, helmet, chest等
  attack_power?: number;
  defense_power?: number;
  health?: number;
  additional_attrs?: AdditionalAttribute[];
}

export interface Item {
  id: string;
  x: number; // Grid coordinate X
  y: number; // Grid coordinate Y
  type: ItemType;
  variant?: number; // To vary the look slightly
  isOpen?: boolean; // For chests
  chestType?: 'normal' | 'large'; // For chests: normal or large
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
  
  // Elite properties
  isElite?: boolean;
  bulletColor?: string; // 子弹颜色
  sizeMultiplier?: number; // 体型倍率
}

export interface SkinData {
  id: number;
  name: string;
  attack: number;
  hp: number;
  atk_type: number;
  atk_speed: number;
  critical_rate: number;
  critical_damage: number;
  background_url: string;
  idle_image_urls: string[];
  attack_image_urls: string[];
  move_image_urls: string[];
  scale: number; // 角色图片缩放大小，默认100，为100%大小
  hp_pos: number; // 控制血条位置，默认0即不变，正数上移，负数下移，0.1 = 10%
  created_at: number;
  updated_at: number;
}

export interface UserSkin {
  id: number;
  user_id: number;
  skin_id: number;
  is_active: boolean;
  created_at: number;
  updated_at: number;
  user: any;
  skin: SkinData;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  bulletColor?: string; // 子弹颜色，精英怪物紫色，BOSS红色
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
  attackPressed: boolean; // 标记攻击按钮是否被按下
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
  attackSpeed?: number;
  attackRange?: number;
  
  // Additional Stats
  critRate?: number;
  critDamage?: number;
  dodgeRate?: number;
  regen?: number;
  regenTimer?: number;
  lifesteal?: number;
  instantKillRate?: number;
  damageReduction?: number;

  // Dodge Roll
  rollTimer: number;
  rollCooldown: number;
  rollVx: number;
  rollVy: number;

  // Interaction
  interactionTargetId: string | null;
  interactionTimer: number; // Frames (0 to 60)
}

// 用户属性接口定义
export interface UserAttributes {
  减伤: string;
  吸血: string;
  子弹速度: string;
  弹道: number;
  恢复: number;
  攻击力: number;
  攻击类型: string;
  攻击速度: number;
  暴击伤害: string;
  暴击率: string;
  生命值: number;
  秒杀: string;
  移动速度: string;
  闪避: string;
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