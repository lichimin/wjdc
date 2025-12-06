import React, { useState, useEffect } from 'react';
import { LootItem, Rarity } from '../types';

interface InventoryModalProps {
  items: LootItem[];
  onClose: () => void;
  // Add original API data for equipment details
  originalItems?: any[];
}

interface EquippedItem {
  id: string | number;
  item_id: string | number;
  name: string;
  value: number;
  rarity: Rarity;
  iconColor: string;
  imageUrl?: string;
  quantity?: number;
  type: string;
  level?: number;
  slot: string; // 部位：weapon, helmet, chest, gloves, pants, boots, ring
  equipment: any;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ items, onClose, originalItems = [] }) => {
  const [selectedEquipment, setSelectedEquipment] = useState<LootItem | null>(null);
  const [equippedItems, setEquippedItems] = useState<Record<string, EquippedItem>>({});
  
  // 获取已装备物品
  const fetchEquippedItems = async () => {
    try {
      const response = await fetch('/api/v1/my-items/equipped', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // 将装备物品按slot组织
        const organized = data.reduce((acc: Record<string, EquippedItem>, item: EquippedItem) => {
          acc[item.slot] = item;
          return acc;
        }, {});
        setEquippedItems(organized);
      }
    } catch (error) {
      console.error('获取已装备物品失败:', error);
    }
  };
  
  // 装备物品
  const equipItem = async (itemId: string | number) => {
    try {
      const response = await fetch(`/api/v1/equipments/${itemId}/equip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // 重新获取装备状态
        await fetchEquippedItems();
      }
    } catch (error) {
      console.error('装备物品失败:', error);
    }
  };
  
  // 卸下物品
  const unequipItem = async (itemId: string | number) => {
    try {
      const response = await fetch(`/api/v1/equipments/${itemId}/unequip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // 重新获取装备状态
        await fetchEquippedItems();
      }
    } catch (error) {
      console.error('卸下物品失败:', error);
    }
  };
  
  // 组件挂载时获取已装备物品
  useEffect(() => {
    fetchEquippedItems();
  }, []);
  
  const getRarityStyle = (rarity: Rarity) => {
    switch (rarity) {
      case Rarity.RARE: return 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-blue-200';
      case Rarity.EPIC: return 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] text-purple-200';
      case Rarity.LEGENDARY: return 'border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.5)] text-amber-200';
      case Rarity.MYTHIC: return 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.6)] text-red-200 animate-pulse';
      case Rarity.GENESIS: return 'border-transparent bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 p-[2px] shadow-[0_0_30px_rgba(255,255,255,0.5)]';
      default: return 'border-slate-500 text-slate-300';
    }
  };
  
  // 获取装备栏名称
  const getSlotName = (slot: string): string => {
    const slotNames: Record<string, string> = {
      'weapon': '武器',
      'helmet': '防具-头',
      'chest': '防具-胸',
      'gloves': '防具-护手',
      'pants': '防具-护腿',
      'boots': '防具-鞋子',
      'ring': '戒指'
    };
    return slotNames[slot] || slot;
  };

  const totalValue = items.reduce((sum, item) => sum + (item.value || 0), 0);

  // Get original equipment data from API response
  const getOriginalEquipmentData = (itemId: any) => {
    const foundItem = originalItems.find((apiItem: any) => {
      const matchesType = apiItem.type === 'equipment';
      
      // Convert both to string for type-agnostic comparison
      const matchesItemId = apiItem.id?.toString() === String(itemId);
      const matchesEquipmentId = apiItem.equipment?.id?.toString() === String(itemId);
      
      return matchesType && (matchesItemId || matchesEquipmentId);
    });
    
    return foundItem;
  };

  // Handle equipment click
  const handleEquipmentClick = (item: LootItem) => {
    console.log('Equipment clicked:', item);
    
    // Get the complete equipment data from originalItems
    const originalEquipmentData = getOriginalEquipmentData(item.id);
    console.log('Original equipment data:', originalEquipmentData);
    
    setSelectedEquipment({
      ...item,
      ...(originalEquipmentData || {})
    });
  };

  // Handle equip button click
  const handleEquipClick = () => {
    if (selectedEquipment) {
      equipItem(selectedEquipment.id);
      closeDetails();
    }
  };

  const closeDetails = () => {
    setSelectedEquipment(null);
  };

  // Get equipment level color based on level
  const getLevelColor = (level: number) => {
      switch (level) {
        case 1: return 'text-white'; // Common
        case 2: return 'text-blue-400'; // Rare
        case 3: return 'text-purple-400'; // Epic
        case 4: return 'text-amber-400'; // Legendary
        case 5: return 'text-red-400'; // Mythic
        case 6: return 'bg-gradient-to-r from-pink-400 via-red-400 to-yellow-400 bg-clip-text text-transparent'; // Genesis
        default: return 'text-white';
      }
    };

  // Check if attribute is a seven deadly sin (rare attribute)
  const isSevenDeadlySin = (attrType: string) => {
    const sins = ['gluttony', 'greed', 'sloth', 'pride', 'lust', 'envy', 'wrath'];
    return sins.includes(attrType);
  };

  return (
    <>
      {/* Main Inventory Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>

        <div className="relative z-10 w-full max-w-4xl p-6 flex flex-col h-[80vh] bg-slate-900/90 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
            <div>
              <h2 className="text-2xl font-bold text-amber-500 tracking-wider font-serif uppercase">
                Inventory
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                TOTAL WEALTH: <span className="text-amber-300">{totalValue.toLocaleString()} G</span>
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Equipment Bar */}
          <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold text-amber-500 mb-4 text-center">装备栏</h3>
            <div className="flex items-center justify-between">
              {/* Left 4 slots */}
              <div className="flex flex-col gap-4">
                <div className="equip-slot" data-slot="weapon">
                  {equippedItems.weapon ? (
                    <div 
                      className={`relative p-2 rounded-lg border ${getRarityStyle(equippedItems.weapon.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleUnequipClick(equippedItems.weapon.id)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        {equippedItems.weapon.imageUrl ? (
                          <img 
                            src={equippedItems.weapon.imageUrl} 
                            alt={equippedItems.weapon.name} 
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.weapon.iconColor }}
                          ></div>
                        )}
                      </div>
                      <p className="text-xs mt-1 truncate text-center">{equippedItems.weapon.name}</p>
                      <p className="text-xs text-slate-500">{getSlotName('weapon')}</p>
                      <button 
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnequipClick(equippedItems.weapon.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-square border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 p-2">
                      <div className="w-12 h-12 bg-slate-800 rounded"></div>
                      <p className="text-xs mt-1">{getSlotName('weapon')}</p>
                    </div>
                  )}
                </div>
                
                <div className="equip-slot" data-slot="helmet">
                  {equippedItems.helmet ? (
                    <div 
                      className={`relative p-2 rounded-lg border ${getRarityStyle(equippedItems.helmet.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleUnequipClick(equippedItems.helmet.id)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        {equippedItems.helmet.imageUrl ? (
                          <img 
                            src={equippedItems.helmet.imageUrl} 
                            alt={equippedItems.helmet.name} 
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.helmet.iconColor }}
                          ></div>
                        )}
                      </div>
                      <p className="text-xs mt-1 truncate text-center">{equippedItems.helmet.name}</p>
                      <p className="text-xs text-slate-500">{getSlotName('helmet')}</p>
                      <button 
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnequipClick(equippedItems.helmet.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-square border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 p-2">
                      <div className="w-12 h-12 bg-slate-800 rounded"></div>
                      <p className="text-xs mt-1">{getSlotName('helmet')}</p>
                    </div>
                  )}
                </div>
                
                <div className="equip-slot" data-slot="chest">
                  {equippedItems.chest ? (
                    <div 
                      className={`relative p-2 rounded-lg border ${getRarityStyle(equippedItems.chest.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleUnequipClick(equippedItems.chest.id)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        {equippedItems.chest.imageUrl ? (
                          <img 
                            src={equippedItems.chest.imageUrl} 
                            alt={equippedItems.chest.name} 
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.chest.iconColor }}
                          ></div>
                        )}
                      </div>
                      <p className="text-xs mt-1 truncate text-center">{equippedItems.chest.name}</p>
                      <p className="text-xs text-slate-500">{getSlotName('chest')}</p>
                      <button 
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnequipClick(equippedItems.chest.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-square border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 p-2">
                      <div className="w-12 h-12 bg-slate-800 rounded"></div>
                      <p className="text-xs mt-1">{getSlotName('chest')}</p>
                    </div>
                  )}
                </div>
                
                <div className="equip-slot" data-slot="gloves">
                  {equippedItems.gloves ? (
                    <div 
                      className={`relative p-2 rounded-lg border ${getRarityStyle(equippedItems.gloves.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleUnequipClick(equippedItems.gloves.id)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        {equippedItems.gloves.imageUrl ? (
                          <img 
                            src={equippedItems.gloves.imageUrl} 
                            alt={equippedItems.gloves.name} 
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.gloves.iconColor }}
                          ></div>
                        )}
                      </div>
                      <p className="text-xs mt-1 truncate text-center">{equippedItems.gloves.name}</p>
                      <p className="text-xs text-slate-500">{getSlotName('gloves')}</p>
                      <button 
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnequipClick(equippedItems.gloves.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-square border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 p-2">
                      <div className="w-12 h-12 bg-slate-800 rounded"></div>
                      <p className="text-xs mt-1">{getSlotName('gloves')}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Middle character image */}
              <div className="flex-1 flex items-center justify-center mx-8">
                <div className="w-48 h-48 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center">
                  <div className="w-32 h-32 bg-slate-700 rounded-full"></div>
                </div>
              </div>
              
              {/* Right 3 slots */}
              <div className="flex flex-col gap-4">
                <div className="equip-slot" data-slot="pants">
                  {equippedItems.pants ? (
                    <div 
                      className={`relative p-2 rounded-lg border ${getRarityStyle(equippedItems.pants.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleUnequipClick(equippedItems.pants.id)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        {equippedItems.pants.imageUrl ? (
                          <img 
                            src={equippedItems.pants.imageUrl} 
                            alt={equippedItems.pants.name} 
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.pants.iconColor }}
                          ></div>
                        )}
                      </div>
                      <p className="text-xs mt-1 truncate text-center">{equippedItems.pants.name}</p>
                      <p className="text-xs text-slate-500">{getSlotName('pants')}</p>
                      <button 
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnequipClick(equippedItems.pants.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-square border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 p-2">
                      <div className="w-12 h-12 bg-slate-800 rounded"></div>
                      <p className="text-xs mt-1">{getSlotName('pants')}</p>
                    </div>
                  )}
                </div>
                
                <div className="equip-slot" data-slot="boots">
                  {equippedItems.boots ? (
                    <div 
                      className={`relative p-2 rounded-lg border ${getRarityStyle(equippedItems.boots.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleUnequipClick(equippedItems.boots.id)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        {equippedItems.boots.imageUrl ? (
                          <img 
                            src={equippedItems.boots.imageUrl} 
                            alt={equippedItems.boots.name} 
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.boots.iconColor }}
                          ></div>
                        )}
                      </div>
                      <p className="text-xs mt-1 truncate text-center">{equippedItems.boots.name}</p>
                      <p className="text-xs text-slate-500">{getSlotName('boots')}</p>
                      <button 
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnequipClick(equippedItems.boots.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-square border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 p-2">
                      <div className="w-12 h-12 bg-slate-800 rounded"></div>
                      <p className="text-xs mt-1">{getSlotName('boots')}</p>
                    </div>
                  )}
                </div>
                
                <div className="equip-slot" data-slot="ring">
                  {equippedItems.ring ? (
                    <div 
                      className={`relative p-2 rounded-lg border ${getRarityStyle(equippedItems.ring.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleUnequipClick(equippedItems.ring.id)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        {equippedItems.ring.imageUrl ? (
                          <img 
                            src={equippedItems.ring.imageUrl} 
                            alt={equippedItems.ring.name} 
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.ring.iconColor }}
                          ></div>
                        )}
                      </div>
                      <p className="text-xs mt-1 truncate text-center">{equippedItems.ring.name}</p>
                      <p className="text-xs text-slate-500">{getSlotName('ring')}</p>
                      <button 
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnequipClick(equippedItems.ring.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-square border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 p-2">
                      <div className="w-12 h-12 bg-slate-800 rounded"></div>
                      <p className="text-xs mt-1">{getSlotName('ring')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Grid Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 mt-6">
            <h3 className="text-lg font-bold text-amber-500 mb-4 text-center">背包</h3>
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                <div className="w-16 h-16 border-2 border-slate-800 border-dashed rounded-lg"></div>
                <p className="font-mono text-sm">NO ITEMS COLLECTED</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {items.map((item) => {
                   const rarityClass = getRarityStyle(item.rarity);
                   const isGenesis = item.rarity === Rarity.GENESIS;

                   return (
                     <div 
                       key={item.id} 
                       className={`group relative bg-slate-950 p-2 rounded-lg border border-slate-800 transition-colors cursor-pointer ${item.type === 'equipment' ? 'hover:border-amber-500' : ''}`}
                       onClick={(e) => {
                         e.stopPropagation(); // Prevent event bubbling to parent backdrop
                         if (item.type === 'equipment') {
                           handleEquipmentClick(item);
                         }
                       }}
                     >
                        <div className={`
                           aspect-square mb-2 flex items-center justify-center bg-slate-900 rounded
                           ${isGenesis ? '' : `border ${rarityClass.split(' ')[0]}`}
                           ${isGenesis ? 'bg-gradient-to-br from-pink-500/20 via-red-500/20 to-yellow-500/20' : ''}
                           relative
                        `}>
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name} 
                                className="w-full h-full object-contain p-2"
                              />
                            ) : (
                              <div 
                                className="w-8 h-8 rounded shadow-sm"
                                style={{ backgroundColor: item.iconColor }}
                              ></div>
                            )}
                            {item.quantity && item.quantity > 1 && (
                              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs font-bold px-1 rounded-full">
                                {item.quantity}
                              </div>
                            )}
                        </div>
                             
                        <div className="text-center">
                          <div className={`text-[10px] font-bold truncate ${item.rarity === Rarity.GENESIS ? 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-400' : rarityClass.match(/text-\S+/)?.[0] || 'text-slate-300'}`}>
                            {item.name}
                          </div>
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                            {item.value} G
                          </div>
                        </div>
                     </div>
                   );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Equipment Details Modal */}
      {selectedEquipment && (
        <div 
          id="equipment-details-modal"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gradient-to-br from-black via-slate-900 to-black"
        >
          {/* Modal Content */}
          <div className="relative w-full max-w-2xl bg-slate-950 border-4 border-cyan-500/50 rounded-lg shadow-[0_0_20px_rgba(0,255,255,0.5)] p-6 font-mono">
            {/* Header with pixel-style title */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b-4 border-amber-500/30">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                {selectedEquipment.name}
              </h2>
              <button 
                onClick={closeDetails} 
                className="p-2 bg-red-500/20 border-2 border-red-500 text-red-400 hover:bg-red-500/30 transition-all hover:shadow-[0_0_10px_rgba(255,0,0,0.8)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="square" strokeLinejoin="square" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
                </svg>
              </button>
            </div>

            {/* Equipment Template Info */}
            {selectedEquipment.equipment?.equipment_template && (
              <div className="mb-8">
                <div className="text-lg font-bold text-cyan-400 mb-4">基础属性</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Equipment Image */}
                  {selectedEquipment.equipment.equipment_template.image_url && (
                    <div className="bg-slate-900 p-4 rounded border border-slate-800 flex items-center justify-center">
                      <img 
                        src={selectedEquipment.equipment.equipment_template.image_url} 
                        alt={selectedEquipment.equipment.equipment_template.name} 
                        className="max-h-32 max-w-full object-contain"
                      />
                    </div>
                  )}
                  
                  {/* Basic Info */}
                  <div className="space-y-3">
                    {/* Name */}
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-sm text-slate-400 mb-1">装备名称</div>
                      <div className="text-xl font-bold text-white">
                        {selectedEquipment.equipment.equipment_template.name}
                      </div>
                    </div>
                    
                    {/* Level */}
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-sm text-slate-400 mb-1">品级</div>
                      <div className={`text-xl font-bold ${getLevelColor(selectedEquipment.equipment.equipment_template.level)}`}>
                        {['普通', '稀有', '史诗', '传说', '神话', '创世'][selectedEquipment.equipment.equipment_template.level - 1]}
                      </div>
                    </div>
                    
                    {/* Slot */}
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-sm text-slate-400 mb-1">部位</div>
                      <div className="text-xl font-bold text-white">
                        {{
                          'weapon': '武器',
                          'helmet': '防具-头',
                          'chest': '防具-胸',
                          'gloves': '防具-护手',
                          'pants': '防具-护腿',
                          'boots': '防具-鞋子'
                        }[selectedEquipment.equipment.equipment_template.slot] || selectedEquipment.equipment.equipment_template.slot}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Attributes Grid */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Health */}
                  {selectedEquipment.equipment.equipment_template.hp > 0 && (
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-sm text-slate-400 mb-1">生命值</div>
                      <div className="text-lg font-bold text-white">
                        {selectedEquipment.equipment.equipment_template.hp}
                      </div>
                    </div>
                  )}
                  
                  {/* Attack */}
                  {selectedEquipment.equipment.equipment_template.attack > 0 && (
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-sm text-slate-400 mb-1">攻击力</div>
                      <div className="text-lg font-bold text-white">
                        {selectedEquipment.equipment.equipment_template.attack}
                      </div>
                    </div>
                  )}
                  
                  {/* Attack Speed */}
                  {selectedEquipment.equipment.equipment_template.attack_speed > 0 && (
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-sm text-slate-400 mb-1">攻速</div>
                      <div className="text-lg font-bold text-white">
                        {selectedEquipment.equipment.equipment_template.attack_speed}
                      </div>
                    </div>
                  )}
                  
                  {/* Move Speed */}
                  {selectedEquipment.equipment.equipment_template.move_speed > 0 && (
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-sm text-slate-400 mb-1">移速</div>
                      <div className="text-lg font-bold text-white">
                        {selectedEquipment.equipment.equipment_template.move_speed}
                      </div>
                    </div>
                  )}
                  
                  {/* Bullet Speed */}
                  {selectedEquipment.equipment.equipment_template.bullet_speed > 0 && (
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-sm text-slate-400 mb-1">弹速</div>
                      <div className="text-lg font-bold text-white">
                        {selectedEquipment.equipment.equipment_template.bullet_speed}
                      </div>
                    </div>
                  )}
                  
                  {/* Drain */}
                  {selectedEquipment.equipment.equipment_template.drain > 0 && (
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-sm text-slate-400 mb-1">吸血</div>
                      <div className="text-lg font-bold text-white">
                        {selectedEquipment.equipment.equipment_template.drain}
                      </div>
                    </div>
                  )}
                  
                  {/* Critical */}
                  {selectedEquipment.equipment.equipment_template.critical > 0 && (
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-sm text-slate-400 mb-1">暴击</div>
                      <div className="text-lg font-bold text-white">
                        {selectedEquipment.equipment.equipment_template.critical}
                      </div>
                    </div>
                  )}
                  
                  {/* Dodge */}
                  {selectedEquipment.equipment.equipment_template.dodge > 0 && (
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-sm text-slate-400 mb-1">闪避</div>
                      <div className="text-lg font-bold text-white">
                        {selectedEquipment.equipment.equipment_template.dodge}
                      </div>
                    </div>
                  )}
                  
                  {/* Instant Kill */}
                  {selectedEquipment.equipment.equipment_template.instant_kill > 0 && (
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-sm text-slate-400 mb-1">秒杀</div>
                      <div className="text-lg font-bold text-white">
                        {selectedEquipment.equipment.equipment_template.instant_kill}
                      </div>
                    </div>
                  )}
                  
                  {/* Recovery */}
                  {selectedEquipment.equipment.equipment_template.recovery > 0 && (
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-sm text-slate-400 mb-1">恢复</div>
                      <div className="text-lg font-bold text-white">
                        {selectedEquipment.equipment.equipment_template.recovery}
                      </div>
                    </div>
                  )}
                  
                  {/* Trajectory */}
                  {selectedEquipment.equipment.equipment_template.trajectory > 0 && (
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-sm text-slate-400 mb-1">弹道数</div>
                      <div className="text-lg font-bold text-white">
                        {selectedEquipment.equipment.equipment_template.trajectory}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Additional Attributes */}
            {selectedEquipment.equipment?.additional_attrs && selectedEquipment.equipment.additional_attrs.length > 0 && (
              <div>
                <div className="text-lg font-bold text-cyan-400 mb-4">附加属性</div>
                <div className="space-y-3">
                  {selectedEquipment.equipment.additional_attrs.map((attr: any, index: number) => {
                    const isSin = isSevenDeadlySin(attr.attr_type);
                    const textColor = isSin ? 'text-red-400' : 'text-purple-400';
                    const borderColor = isSin ? 'border-red-500/30' : 'border-purple-500/30';
                    const bgColor = isSin ? 'bg-red-500/5' : 'bg-purple-500/5';
                    
                    // Map seven deadly sins to their descriptions
                    const sinDescriptions: Record<string, string> = {
                      'envy': '暴击伤害',
                      'pride': '最大HP',
                      'gluttony': '攻速',
                      'greed': '秒杀',
                      'lust': '自动回复',
                      'wrath': '暴击率',
                      'sloth': '攻击力'
                    };
                    
                    // Format attribute name for seven deadly sins
                    const formattedAttrName = isSin && sinDescriptions[attr.attr_type] 
                      ? `${attr.attr_name}-${sinDescriptions[attr.attr_type]}` 
                      : attr.attr_name;
                    
                    return (
                      <div key={index} className={`${bgColor} p-3 rounded border ${borderColor}`}>
                        <div className="flex justify-between items-center">
                          <div className={`text-sm font-bold ${textColor}`}>{formattedAttrName}</div>
                          <div className={`text-sm font-bold ${textColor}`}>{attr.attr_value}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Buttons */}
            <div className="mt-8 flex justify-center gap-4">
              <button 
                onClick={handleEquipClick}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 border-2 border-white/20 text-white font-bold rounded hover:bg-gradient-to-r from-green-500 to-emerald-500 transition-all hover:shadow-[0_0_15px_rgba(0,255,128,0.8)]"
              >
                穿戴装备
              </button>
              <button 
                onClick={closeDetails}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 border-2 border-white/20 text-white font-bold rounded hover:bg-gradient-to-r from-cyan-500 to-purple-500 transition-all hover:shadow-[0_0_15px_rgba(0,255,255,0.8)]"
              >
                关闭详情
              </button>
            </div>
          </div>
        </div>
      )}
  </>
);
};