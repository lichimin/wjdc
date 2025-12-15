
import { LootItem, Rarity } from '../types';
import { chestConfig } from '../configs/chestConfig';

const ADJECTIVES = ['Ancient', 'Cursed', 'Shiny', 'Broken', 'Golden', 'Mystic', 'Lost', 'Eternal'];
const NOUNS = ['Sword', 'Shield', 'Potion', 'Ring', 'Amulet', 'Gem', 'Scroll', 'Helmet', 'Coin'];

const getRandomRarity = () => {
  const totalWeight = chestConfig.rarityWeights.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const r of chestConfig.rarityWeights) {
    if (random < r.weight) return r;
    random -= r.weight;
  }
  return chestConfig.rarityWeights[0];
};

// Get rarity with difficulty multiplier
const getRandomRarityWithDifficulty = (difficulty: number = 1) => {
  // Adjust weights based on difficulty
  const adjustedWeights = chestConfig.rarityWeights.map(r => {
    if (r.type === Rarity.COMMON) {
      // Reduce common weight with higher difficulty
      return { ...r, weight: r.weight * (1 - (difficulty - 1) * chestConfig.difficultyRarityModifiers.common) };
    } else if (r.type === Rarity.RARE || r.type === Rarity.EPIC) {
      // Increase rare and epic weights slightly
      return { ...r, weight: r.weight * (1 + (difficulty - 1) * chestConfig.difficultyRarityModifiers.rareEpic) };
    } else {
      // Increase legendary, mythic, and genesis weights more
      return { ...r, weight: r.weight * (1 + (difficulty - 1) * chestConfig.difficultyRarityModifiers.legendaryPlus) };
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
  
  // Define level probabilities based on difficulty level (LV3以上概率减半)
  const getLevelProbabilities = (level: string) => {
    return chestConfig.difficultyLevelProbabilities[level] || [
      { level: 1, probability: 0.40 },
      { level: 2, probability: 0.35 },
      { level: 3, probability: 0.20 },
      { level: 4, probability: 0.04 },
      { level: 5, probability: 0.01 }
    ];
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
    
    // Function to get rarity config based on level
    const getRarityByLevel = (level: number) => {
      // 根据等级获取对应稀有度配置
      const rarityIndex = Math.min(level - 1, chestConfig.rarityWeights.length - 1);
      return chestConfig.rarityWeights[rarityIndex] || { type: Rarity.COMMON, color: '#94a3b8', multiplier: 1 };
    };
    
    return Array.from({ length: count }, (_, i) => {
      // First, determine the appropriate level based on difficulty probability
      const targetLevel = getRandomLevel(levelProbabilities);
      
      // Get rarity based on level (lv1普通, lv2稀有, lv3史诗, lv4传说, lv5神话, lv6创世)
      const rarityConfig = getRarityByLevel(targetLevel);
      
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
      
      // Calculate multiplier based on chest type
      const chestMultiplier = chestType === 'large' ? chestConfig.chestTypeMultipliers.large : chestConfig.chestTypeMultipliers.normal;
      
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
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    
    // Determine if item is equipment or treasure based on noun
    const equipmentNouns = ['Sword', 'Shield', 'Helmet', 'Ring', 'Amulet', 'Gem', 'Scroll'];
    const isEquipment = equipmentNouns.includes(noun);
    
    // Generate level based on difficulty
    const levelProbabilities = getLevelProbabilities(difficultyLevel);
    const level = getRandomLevel(levelProbabilities);
    
    // Get rarity based on level (lv1普通, lv2稀有, lv3史诗, lv4传说, lv5神话, lv6创世)
    const getRarityByLevel = (level: number) => {
      // 根据等级获取对应稀有度配置
      const rarityIndex = Math.min(level - 1, chestConfig.rarityWeights.length - 1);
      return chestConfig.rarityWeights[rarityIndex] || { type: Rarity.COMMON, color: '#94a3b8', multiplier: 1 };
    };
    
    const rarityConfig = getRarityByLevel(level);
    
    // Calculate multiplier based on chest type
    const chestMultiplier = chestType === 'large' ? chestConfig.chestTypeMultipliers.large : chestConfig.chestTypeMultipliers.normal;
    
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
