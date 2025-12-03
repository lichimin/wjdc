
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

export const generateLoot = (count: number, treasureData: any[] = [], difficulty: number = 1): LootItem[] => {
  // Generate a unique base for this batch of loot
  const uniqueBase = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // If treasure data is available, use it to generate loot
  if (treasureData && treasureData.length > 0) {
    return Array.from({ length: count }, (_, i) => {
      // Randomly select a treasure from the data
      const randomTreasure = treasureData[Math.floor(Math.random() * treasureData.length)];
      
      // Get rarity based on difficulty
      const rarityConfig = getRandomRarityWithDifficulty(difficulty);
      
      // Determine type based on treasure attributes
      const type = randomTreasure.type || (Math.random() > 0.5 ? 'equipment' : 'treasure');
      
      // Extract treasure information with fallback values
      const treasureName = randomTreasure.treasure_name || randomTreasure.name || 'Mysterious Item';
      const treasureValue = randomTreasure.treasure_value || randomTreasure.value || 100;
      
      return {
        id: `loot-${uniqueBase}-${i}`,
        name: treasureName,
        value: Math.floor(treasureValue * rarityConfig.multiplier),
        rarity: rarityConfig.type,
        iconColor: rarityConfig.color,
        imageUrl: randomTreasure.image_url || undefined,
        type: type,
        attack_power: type === 'equipment' ? Math.floor(10 * rarityConfig.multiplier) : undefined,
        defense_power: type === 'equipment' ? Math.floor(5 * rarityConfig.multiplier) : undefined,
        health: type === 'equipment' ? Math.floor(20 * rarityConfig.multiplier) : undefined,
        additional_attrs: randomTreasure.additional_attrs || [],
        quantity: Math.floor(Math.random() * 3) + 1
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
    
    return {
      id: `loot-${uniqueBase}-${i}`,
      name: `${adj} ${noun}`,
      value: Math.floor((Math.random() * 50 + 10) * rarityConfig.multiplier),
      rarity: rarityConfig.type,
      iconColor: rarityConfig.color,
      type: isEquipment ? 'equipment' : 'treasure'
    };
  });
};
