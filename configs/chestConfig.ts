import { Rarity } from '../types';

/**
 * 稀有度配置接口
 * 定义宝物稀有度的属性和权重
 */
export interface RarityConfig {
  type: Rarity;          // 稀有度类型
  weight: number;        // 权重值（影响出现概率）
  color: string;         // 显示颜色
  multiplier: number;    // 价值倍数
}

/**
 * 等级概率接口
 * 定义宝物等级的出现概率
 */
export interface LevelProbability {
  level: number;         // 宝物等级
  probability: number;   // 出现概率（0-1之间）
}

/**
 * 宝箱配置接口
 * 定义宝箱系统的所有配置参数
 */
export interface ChestConfig {
  // 稀有度权重配置
  rarityWeights: RarityConfig[];
  
  // 难度等级对应的宝物等级概率
  difficultyLevelProbabilities: {
    [key: string]: LevelProbability[];
  };
  
  // 宝箱类型影响
  chestTypeMultipliers: {
    normal: number;
    large: number;
  };
  
  // 难度对稀有度的影响系数
  difficultyRarityModifiers: {
    common: number;
    rareEpic: number;
    legendaryPlus: number;
  };
}

/**
 * 宝箱配置实例
 * 定义宝箱系统的具体配置参数
 */
export const chestConfig: ChestConfig = {
  // 稀有度权重配置
  rarityWeights: [
    { type: Rarity.COMMON, weight: 50, color: '#94a3b8', multiplier: 1 },    // 普通：权重50，颜色灰色，价值1倍
    { type: Rarity.RARE, weight: 30, color: '#3b82f6', multiplier: 2 },      // 稀有：权重30，颜色蓝色，价值2倍
    { type: Rarity.EPIC, weight: 15, color: '#a855f7', multiplier: 5 },      // 史诗：权重15，颜色紫色，价值5倍
    { type: Rarity.LEGENDARY, weight: 4, color: '#f59e0b', multiplier: 10 }, // 传说：权重4，颜色橙色，价值10倍
    { type: Rarity.MYTHIC, weight: 0.9, color: '#ef4444', multiplier: 50 },   // 神话：权重0.9，颜色红色，价值50倍
    { type: Rarity.GENESIS, weight: 0.1, color: '#ec4899', multiplier: 100 },// 创世：权重0.1，颜色粉色，价值100倍
  ],
  
  // 难度等级对应的宝物等级概率
  difficultyLevelProbabilities: {
    // B难度宝物等级概率
    'B': [
      { level: 1, probability: 0.4625 },  // 等级1：46.25%
      { level: 2, probability: 0.4125 },  // 等级2：41.25%
      { level: 3, probability: 0.10 },    // 等级3：10%
      { level: 4, probability: 0.02 },    // 等级4：2%
      { level: 5, probability: 0.005 }    // 等级5：0.5%
    ],
    // A难度宝物等级概率
    'A': [
      { level: 1, probability: 0.35 },    // 等级1：35%
      { level: 2, probability: 0.45 },    // 等级2：45%
      { level: 3, probability: 0.125 },   // 等级3：12.5%
      { level: 4, probability: 0.05 },    // 等级4：5%
      { level: 5, probability: 0.02 },    // 等级5：2%
      { level: 6, probability: 0.005 }    // 等级6：0.5%
    ],
    // S难度宝物等级概率
    'S': [
      { level: 1, probability: 0.2875 },  // 等级1：28.75%
      { level: 2, probability: 0.4375 },  // 等级2：43.75%
      { level: 3, probability: 0.15 },    // 等级3：15%
      { level: 4, probability: 0.075 },   // 等级4：7.5%
      { level: 5, probability: 0.04 },    // 等级5：4%
      { level: 6, probability: 0.01 }     // 等级6：1%
    ],
    // SS难度宝物等级概率
    'SS': [
      { level: 2, probability: 0.60 },    // 等级2：60%
      { level: 3, probability: 0.15 },    // 等级3：15%
      { level: 4, probability: 0.125 },   // 等级4：12.5%
      { level: 5, probability: 0.10 },    // 等级5：10%
      { level: 6, probability: 0.025 }    // 等级6：2.5%
    ],
    // SSS难度宝物等级概率
    'SSS': [
      { level: 3, probability: 0.60 },    // 等级3：60%
      { level: 4, probability: 0.175 },   // 等级4：17.5%
      { level: 5, probability: 0.175 },   // 等级5：17.5%
      { level: 6, probability: 0.05 }     // 等级6：5%
    ]
  },
  
  // 宝箱类型影响
  chestTypeMultipliers: {
    normal: 1.0,  // 普通宝箱：1.0倍价值和数量
    large: 1.5,   // 大型宝箱：1.5倍价值和数量
  },
  
  // 难度对稀有度的影响系数
  difficultyRarityModifiers: {
    common: 0.1,        // 普通物品权重降低系数：每级难度降低10%
    rareEpic: 0.05,     // 稀有和史诗物品权重增加系数：每级难度增加5%
    legendaryPlus: 0.2, // 传说及以上物品权重增加系数：每级难度增加20%
  }
};
