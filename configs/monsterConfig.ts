import { EnemyType } from '../types';

/**
 * 怪物配置接口
 * 定义单个怪物类型的所有属性和参数
 */
export interface MonsterConfig {
  // 怪物类型枚举值
  type: EnemyType;
  
  // 基本属性
  baseHP: number;            // 基础生命值
  baseSpeed: number;         // 基础移动速度
  baseDamage: number;        // 基础伤害值
  
  // 攻击参数
  attackRange: number;       // 攻击范围（像素）
  attackCooldown: number;    // 攻击冷却时间（帧数）
  projectileSpeed: number;   // 子弹/投射物速度
  isRanged: boolean;         // 是否远程攻击
  
  // 动画信息
  frameCount: number;        // 动画帧数
  imageBaseUrl: string;      // 动画图片基础URL
  
  // 尺寸信息
  baseSize: number;          // 基础尺寸（直径，像素）
  scaleFactor: number;       // 缩放系数
  
  // 特殊属性
  isBoss?: boolean;          // 是否为BOSS
  eliteBonus?: number;       // 精英怪物的加成倍数
}

/**
 * 怪物配置集合接口
 * 以怪物类型为键，存储所有怪物配置
 */
export interface MonsterConfigs {
  [key: string]: MonsterConfig;
}

/**
 * 怪物配置集合
 * 定义所有类型怪物的具体配置参数
 */
export const monsterConfigs: MonsterConfigs = {
  // 史莱姆配置
  [EnemyType.SLIME]: {
    type: EnemyType.SLIME,        // 怪物类型：史莱姆
    baseHP: 200,                   // 基础生命值：30
    baseSpeed: 0.75,              // 基础移动速度：0.75
    baseDamage: 20,               // 基础伤害：10
    attackRange: 20,              // 攻击范围：20像素（近战）
    attackCooldown: 30,           // 攻击冷却：60帧
    projectileSpeed: 5,           // 子弹速度：5（未使用，因为是近战）
    isRanged: false,              // 是否远程：否（近战）
    frameCount: 11,               // 动画帧数：11帧
    imageBaseUrl: "/res/game/monsters/cz/frame", // 图片基础URL
    baseSize: 20,                 // 基础尺寸：20像素
    scaleFactor: 1.0,             // 缩放系数：1.0
    eliteBonus: 1.5               // 精英加成：1.5倍
  },
  // 蝙蝠配置
  [EnemyType.BAT]: {
    type: EnemyType.BAT,          // 怪物类型：蝙蝠
    baseHP: 150,                   // 基础生命值：15
    baseSpeed: 1.25,              // 基础移动速度：1.25
    baseDamage: 10,                // 基础伤害：5
    attackRange: 80,              // 攻击范围：80像素
    attackCooldown: 40,           // 攻击冷却：80帧
    projectileSpeed: 1,           // 子弹速度：6
    isRanged: true,               // 是否远程：是
    frameCount: 14,               // 动画帧数：14帧
    imageBaseUrl: "/res/game/monsters/bf/frame", // 图片基础URL
    baseSize: 24,                 // 基础尺寸：24像素
    scaleFactor: 1.0,             // 缩放系数：1.0
    eliteBonus: 1.2               // 精英加成：1.2倍
  },
  // 骷髅配置
  [EnemyType.SKELETON]: {
    type: EnemyType.SKELETON,     // 怪物类型：骷髅
    baseHP: 200,                 // 基础生命值：5000
    baseSpeed: 0.5,               // 基础移动速度：0.5
    baseDamage: 15,               // 基础伤害：15
    attackRange: 120,             // 攻击范围：120像素
    attackCooldown: 26,          // 攻击冷却：100帧
    projectileSpeed: 1,           // 子弹速度：4
    isRanged: true,               // 是否远程：是
    frameCount: 13,               // 动画帧数：13帧
    imageBaseUrl: "/res/game/monsters/wolf/frame", // 图片基础URL
    baseSize: 44,                 // 基础尺寸：44像素
    scaleFactor: 1.0,             // 缩放系数：1.0
    eliteBonus: 1.3               // 精英加成：1.3倍
  },
  // 大象配置
  [EnemyType.ELEPHANT]: {
    type: EnemyType.ELEPHANT,     // 怪物类型：大象
    baseHP: 150,                  // 基础生命值：100
    baseSpeed: 0.4,               // 基础移动速度：0.4
    baseDamage: 30,               // 基础伤害：30
    attackRange: 30,              // 攻击范围：30像素（近战）
    attackCooldown: 30,           // 攻击冷却：80帧
    projectileSpeed: 5,           // 子弹速度：5（未使用，因为是近战）
    isRanged: false,              // 是否远程：否（近战）
    frameCount: 11,               // 动画帧数：11帧
    imageBaseUrl: "/res/game/monsters/dx/frame", // 图片基础URL
    baseSize: 30,                 // 基础尺寸：30像素
    scaleFactor: 1.5,             // 缩放系数：1.5
    eliteBonus: 2.0               // 精英加成：2.0倍
  },
  // BOSS配置
  [EnemyType.BOSS]: {
    type: EnemyType.BOSS,         // 怪物类型：BOSS
    baseHP: 600,                  // 基础生命值：300
    baseSpeed: 2.0,               // 基础移动速度：2.0
    baseDamage: 50,               // 基础伤害：30
    attackRange: 150,             // 攻击范围：150像素
    attackCooldown: 30,          // 攻击冷却：120帧
    projectileSpeed: 2,           // 子弹速度：7
    isRanged: true,               // 是否远程：是
    frameCount: 0,                // 动画帧数：0（动态设置）
    imageBaseUrl: "",            // 图片基础URL：空（使用普通怪物的图片）
    baseSize: 50,                 // 基础尺寸：50像素
    scaleFactor: 2.5,             // 缩放系数：2.5
    isBoss: true,                 // 是否为BOSS：是
    eliteBonus: 3.0               // 精英加成：3.0倍
  }
};

// 精英怪物加成配置
/**
 * 精英怪物加成配置
 * 定义精英怪物相对于普通怪物的各项属性加成
 */
export const eliteMonsterConfig = {
  healthMultiplier: 2.0,             // 生命值倍数：2.0倍
  damageMultiplier: 1.5,             // 伤害倍数：1.5倍
  speedMultiplier: 1.2,              // 速度倍数：1.2倍
  sizeMultiplier: 1.5,               // 尺寸倍数：1.5倍
  attackCooldownReduction: 0.5,      // 攻击冷却减少：50%
};

// 难度加成配置
/**
 * 难度加成配置
 * 定义每增加一级难度，怪物属性的增长倍数
 */
export const difficultyConfig = {
  healthMultiplierPerLevel: 2,     // 每级难度生命值倍数：1.5倍
  damageMultiplierPerLevel: 1.2,     // 每级难度伤害倍数：1.2倍
  speedMultiplierPerLevel: 1.05,     // 每级难度速度倍数：1.05倍
};
