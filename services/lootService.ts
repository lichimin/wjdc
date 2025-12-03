
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

export const generateLoot = (count: number): LootItem[] => {
  // Generate a unique base for this batch of loot
  const uniqueBase = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  return Array.from({ length: count }, (_, i) => {
    const rarityConfig = getRandomRarity();
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
