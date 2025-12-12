
import { LootItem, Rarity } from '../types';

const ADJECTIVES = ['Ancient', 'Cursed', 'Shiny', 'Broken', 'Golden', 'Mystic', 'Lost', 'Eternal'];
const NOUNS = ['Sword', 'Shield', 'Potion', 'Ring', 'Amulet', 'Gem', 'Scroll', 'Helmet', 'Coin'];

const RARITY_WEIGHTS = [
  { type: Rarity.COMMON, weight: 50, color: '#94a3b8', multiplier: 1 },
  { type: Rarity.RARE, weight: 30, color: '#3b82f6', multiplier: 2 },
  { type: Rarity.EPIC, weight: 15, color: '#a855f7', multiplier: 5 },
  { type: Rarity.LEGENDARY, weight: 4, color: '#f59e0b', multiplier: 10 },
  { type: Rarity.MYTHIC, weight: 0.9, color: '#ef4444', multiplier: 50 },
  { type: Rarity.GENESIS, weight: 0.1, color: '#ec4899', multiplier: 100 }, // Special rainbow handling in UI
];

const getRandomRarity = () => {
  const totalWeight = RARITY_WEIGHTS.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const r of RARITY_WEIGHTS) {
    if (random < r.weight) return r;
    random -= r.weight;
  }
  return RARITY_WEIGHTS[0];
};

// Get rarity with difficulty multiplier
const getRandomRarityWithDifficulty = (difficulty: number = 1) => {
  // Adjust weights based on difficulty
  const adjustedWeights = RARITY_WEIGHTS.map(r => {
    if (r.type === Rarity.COMMON) {
      // Reduce common weight with higher difficulty
      return { ...r, weight: r.weight * (1 - (difficulty - 1) * 0.1) };
    } else if (r.type === Rarity.RARE || r.type === Rarity.EPIC) {
      // Increase rare and epic weights slightly
      return { ...r, weight: r.weight * (1 + (difficulty - 1) * 0.05) };
    } else {
      // Increase legendary, mythic, and genesis weights more
      return { ...r, weight: r.weight * (1 + (difficulty - 1) * 0.2) };
    }
  });
  
  const totalWeight = adjustedWeights.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const r of adjustedWeights) {
    if (random < r.weight) return r;
    random -= r.weight;
  }
  return adjustedWeights[0];
};

export const generateLoot = (count: number, treasureData: any[] = [], difficulty: number = 1, difficultyLevel: string = 'B', chestType: 'normal' | 'large' = 'normal'): LootItem[] => {
  // Generate a unique base for this batch of loot
  const uniqueBase = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Define level probabilities based on difficulty level
  const getLevelProbabilities = (level: string) => {
    switch (level) {
      case 'B':
        return [
          { level: 1, probability: 0.59 },
          { level: 2, probability: 0.30 },
          { level: 3, probability: 0.10 },
          { level: 6, probability: 0.01 }
        ];
      case 'A':
        return [
          { level: 1, probability: 0.39 },
          { level: 2, probability: 0.30 },
          { level: 3, probability: 0.20 },
          { level: 4, probability: 0.10 },
          { level: 6, probability: 0.01 }
        ];
      case 'S':
        return [
          { level: 1, probability: 0.30 },
          { level: 2, probability: 0.34 },
          { level: 3, probability: 0.20 },
          { level: 4, probability: 0.10 },
          { level: 5, probability: 0.05 },
          { level: 6, probability: 0.01 }
        ];
      case 'SS':
        return [
          { level: 2, probability: 0.30 },
          { level: 3, probability: 0.30 },
          { level: 4, probability: 0.20 },
          { level: 5, probability: 0.17 },
          { level: 6, probability: 0.03 }
        ];
      case 'SSS':
        return [
          { level: 2, probability: 0.20 },
          { level: 3, probability: 0.30 },
          { level: 4, probability: 0.30 },
          { level: 5, probability: 0.15 },
          { level: 6, probability: 0.05 }
        ];
      default:
        return [
          { level: 1, probability: 0.59 },
          { level: 2, probability: 0.30 },
          { level: 3, probability: 0.10 },
          { level: 6, probability: 0.01 }
        ];
    }
  };
  
  // Function to get a random level based on probabilities
  const getRandomLevel = (probabilities: { level: number; probability: number }[]) => {
    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (const { level, probability } of probabilities) {
      cumulativeProbability += probability;
      if (random <= cumulativeProbability) {
        return level;
      }
    }
    
    return 1; // Default to level 1 if no match
  };
  
  // If treasure data is available, use it to generate loot
  if (treasureData && treasureData.length > 0) {
    // Get level probabilities based on difficulty level
    const levelProbabilities = getLevelProbabilities(difficultyLevel);
    
    return Array.from({ length: count }, (_, i) => {
      // Get rarity based on difficulty
      const rarityConfig = getRandomRarityWithDifficulty(difficulty);
      
      // First, determine the appropriate level based on difficulty probability
      const targetLevel = getRandomLevel(levelProbabilities);
      
      // Filter treasures to only those matching the target level
      const matchingTreasures = treasureData.filter(treasure => treasure.level === targetLevel);
      
      // If there are matching treasures, select from them; otherwise, use all treasures
      const availableTreasures = matchingTreasures.length > 0 ? matchingTreasures : treasureData;
      
      // Randomly select a treasure from available treasures
      const randomTreasure = availableTreasures[Math.floor(Math.random() * availableTreasures.length)];
      
      // Determine type based on treasure attributes
      const type = randomTreasure.type || (Math.random() > 0.5 ? 'equipment' : 'treasure');
      
      // Extract treasure information with fallback values
      const treasureName = randomTreasure.treasure_name || randomTreasure.name || 'Mysterious Item';
      const treasureValue = randomTreasure.treasure_value || randomTreasure.value || 100;
      const treasureLevel = randomTreasure.level;
      
      // Calculate multiplier based on chest type (large chest gives double rewards)
      const chestMultiplier = chestType === 'large' ? 2 : 1;
      
      return {
        id: `loot-${uniqueBase}-${i}`,
        item_id: randomTreasure.treasure_id || randomTreasure.id || `item-${Math.floor(Math.random() * 10000)}`,
        name: treasureName,
        value: Math.floor(treasureValue * rarityConfig.multiplier * chestMultiplier),
        rarity: rarityConfig.type,
        iconColor: rarityConfig.color,
        imageUrl: randomTreasure.image_url || undefined,
        type: type,
        level: treasureLevel, // 使用接口返回的宝物等级
        attack_power: type === 'equipment' ? Math.floor(10 * rarityConfig.multiplier * chestMultiplier) : undefined,
        defense_power: type === 'equipment' ? Math.floor(5 * rarityConfig.multiplier * chestMultiplier) : undefined,
        health: type === 'equipment' ? Math.floor(20 * rarityConfig.multiplier * chestMultiplier) : undefined,
        additional_attrs: randomTreasure.additional_attrs || [],
        quantity: chestType === 'large' ? 2 : 1 // Large chest gives double quantity
      };
    });
  }
  
  // Fallback to original random generation if no treasure data is available
  return Array.from({ length: count }, (_, i) => {
    const rarityConfig = getRandomRarityWithDifficulty(difficulty);
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    
    // Determine if item is equipment or treasure based on noun
    const equipmentNouns = ['Sword', 'Shield', 'Helmet', 'Ring', 'Amulet', 'Gem', 'Scroll'];
    const isEquipment = equipmentNouns.includes(noun);
    
    // 为回退生成的宝物也添加等级
    const levelProbabilities = getLevelProbabilities(difficultyLevel);
    const level = getRandomLevel(levelProbabilities);
    
    // Calculate multiplier based on chest type (large chest gives double rewards)
    const chestMultiplier = chestType === 'large' ? 2 : 1;
    
    return {
      id: `loot-${uniqueBase}-${i}`,
      item_id: `item-${Math.floor(Math.random() * 10000)}`, // 添加item_id用于合并
      name: `${adj} ${noun}`,
      value: Math.floor((Math.random() * 50 + 10) * rarityConfig.multiplier * chestMultiplier),
      rarity: rarityConfig.type,
      iconColor: rarityConfig.color,
      type: isEquipment ? 'equipment' : 'treasure',
      level: level, // 添加宝物等级
      quantity: chestType === 'large' ? 2 : 1 // Large chest gives double quantity
    };
  });
};
