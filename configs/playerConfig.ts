import { PlayerState } from '../types';

// 玩家基础属性配置
export const playerBaseStats: Partial<PlayerState> = {
  // 基础生命值
  health: 350,
  maxHealth: 350,
  
  // 攻击力
  damage: 10,
  
  // 移动速度
  speed: 5,
  
  // 攻击速度（每秒攻击次数）
  attackSpeed: 0.5,
  
  // 子弹速度
  projectileSpeed: 10,
  
  // 攻击范围
  attackRange: 150,
  
  // 暴击率（0-1之间的小数）
  critRate: 0.05,
  
  // 暴击伤害倍率（1表示100%）
  critDamage: 1.5,
  
  // 闪避率（0-1之间的小数）
  dodgeRate: 0.05,
  
  // 生命值恢复（每秒恢复量）
  regen: 0,
  
  // 吸血率（0-1之间的小数）
  lifesteal: 0,
  
  // 秒杀率（0-1之间的小数）
  instantKillRate: 0,
  
  // 伤害减免（0-1之间的小数）
  damageReduction: 0,
  
  // 无敌时间（被击中后的无敌帧数）
  invincibilityTimer: 60,
  
  // 闪避滚动冷却时间（毫秒）
  rollCooldown: 30000,
  
  // 闪避滚动持续时间（毫秒）
  rollTimer: 100,
};

// 计算并设置基于攻击速度的冷却时间
const attackSpeed = playerBaseStats.attackSpeed || 1.0;
playerBaseStats.attackCooldown = (1 / attackSpeed) * 1000;
playerBaseStats.fireCooldown = (1 / attackSpeed) * 1000;

// 玩家升级属性增长配置
export const playerLevelUpStats = {
  // 每级增加的生命值
  healthPerLevel: 10,
  
  // 每级增加的攻击力
  damagePerLevel: 2,
  
  // 每级增加的移动速度
  speedPerLevel: 0.2,
  
  // 每级增加的攻击速度（百分比）
  attackSpeedPerLevel: 0.05,
  
  // 每级增加的暴击率（百分比）
  critRatePerLevel: 0.01,
  
  // 每级增加的暴击伤害（百分比）
  critDamagePerLevel: 0.1,
};

// 玩家皮肤基础属性配置（如果需要）
export const playerSkinBaseStats = {
  // 可以根据皮肤ID设置不同的基础属性加成
  default: {
    healthBonus: 0,
    damageBonus: 0,
    speedBonus: 0,
  },
};
