import React, { useState, useEffect } from 'react';
import { CyberButton, MiniCyberButton } from './CyberButton';
import { authService } from '../services/authService';

interface Equipment {
  id: number;
  name: string;
  image_url: string;
  rarity: string;
  base_attributes: Record<string, any>;
  additional_attrs: Array<{ name: string; value: number }>;
  rare_attrs: Array<{ name: string; value: number }>;
}

// 定义皮肤数据接口
interface SkinData {
  idle_image_urls: string[];
}

interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Add skin data for character image
  skinData?: SkinData | null;
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({ isOpen, onClose, skinData = null }) => {
  const [equippedItems, setEquippedItems] = useState<Equipment[]>([]);
  const [unequippedItems, setUnequippedItems] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Character idle animation state
  const [currentIdleImageIndex, setCurrentIdleImageIndex] = useState(0);
  // Character attributes state
  const [showAttributesModal, setShowAttributesModal] = useState(false);
  const [attributesData, setAttributesData] = useState<any>(null);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  
  // Character animation effect
  useEffect(() => {
    if (!skinData || !skinData.idle_image_urls || skinData.idle_image_urls.length === 0) {
      return;
    }
    
    const animationInterval = setInterval(() => {
      setCurrentIdleImageIndex(prevIndex => 
        (prevIndex + 1) % skinData.idle_image_urls.length
      );
    }, 100); // 10fps
    
    return () => clearInterval(animationInterval);
  }, [skinData]);

  // Mock data for testing
  const mockEquipped: Equipment[] = [
    {
      id: 1,
      name: "传说之剑",
      image_url: "http://example.com/sword.png",
      rarity: "传说",
      base_attributes: {
        "攻击力": 100,
        "暴击": 50,
        "攻击速度": 1.2
      },
      additional_attrs: [
        { name: "攻击力加成", value: 20.5 },
        { name: "暴击率", value: 8.0 }
      ],
      rare_attrs: [
        { name: "神之力量", value: 50.0 }
      ]
    }
  ];

  const mockUnequipped: Equipment[] = [
    {
      id: 2,
      name: "普通护甲",
      image_url: "http://example.com/armor.png",
      rarity: "普通",
      base_attributes: {
        "生命值": 200,
        "闪避": "5%"
      },
      additional_attrs: [],
      rare_attrs: []
    }
  ];

  // Fetch equipment data from API
  useEffect(() => {
    if (isOpen) {
      fetchEquipmentData();
    }
  }, [isOpen]);

  // Get character attributes data
  const fetchCharacterAttributes = async () => {
    setIsLoadingAttributes(true);
    try {
      const token = authService.getAuthToken();
      if (token) {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/user/attributes`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setAttributesData(result.data);
          } else {
            console.error('获取角色属性失败:', result.message);
          }
        } else {
          console.error('获取角色属性失败，状态码:', response.status);
        }
      } else {
        console.error('没有认证令牌，无法获取角色属性');
      }
    } catch (error) {
      console.error('获取角色属性时发生错误:', error);
    } finally {
      setIsLoadingAttributes(false);
    }
  };

  const fetchEquipmentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authService.getAuthToken();
      if (!token) {
        setError('未登录或登录已过期');
        setLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/equipments/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        // API返回的数据结构是 { success: boolean, message: string, data: { equipped: [], unequipped: [] } }
        setEquippedItems(result.data?.equipped || []);
        setUnequippedItems(result.data?.unequipped || []);
      } else {
        setError('获取装备数据失败');
        // Fallback to mock data if API fails
        setEquippedItems(mockEquipped);
        setUnequippedItems(mockUnequipped);
      }
    } catch (error) {
      console.error('Failed to fetch equipment data:', error);
      setError('获取装备数据失败');
      // Fallback to mock data on error
      setEquippedItems(mockEquipped);
      setUnequippedItems(mockUnequipped);
    } finally {
      setLoading(false);
    }
  };

  const handleEquipmentClick = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setShowDetails(true);
  };

  const handleEquip = async (equipment: Equipment) => {
    try {
      const token = authService.getAuthToken();
      if (!token) {
        setError('未登录或登录已过期');
        return;
      }

      // Find existing equipment in the same slot
      const typeToSlot = {
        '武器': 'weapon',
        '头盔': 'helmet',
        '胸甲': 'chest',
        '手套': 'gloves',
        '裤子': 'pants',
        '护腿': 'pants',
        '鞋子': 'boots',
        '靴子': 'boots', // 兼容旧名称
        '戒指': 'ring'
      };

      // Get the slot for the new equipment
      const newEquipmentSlot = typeToSlot[equipment.slot] || typeToSlot[equipment.base_attributes?.type || ''];

      // Find existing equipment in the same slot
      const existingEquipment = equippedItems.find(item => {
        const existingItemSlot = typeToSlot[item.slot] || typeToSlot[item.base_attributes?.type || ''];
        return existingItemSlot === newEquipmentSlot;
      });

      // If there's existing equipment in the slot, unequip it first
      if (existingEquipment) {
        const unequipResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/equipments/${existingEquipment.id}/unequip`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!unequipResponse.ok) {
          throw new Error('卸下旧装备失败');
        }
      }

      // Now equip the new equipment
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/equipments/${equipment.id}/equip`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update state
        if (existingEquipment) {
          // Remove existing from equipped and add to unequipped
          setEquippedItems(prev => prev.filter(item => item.id !== existingEquipment.id));
          setUnequippedItems(prev => [...prev, existingEquipment]);
        }
        // Remove new from unequipped and add to equipped
        setUnequippedItems(prev => prev.filter(item => item.id !== equipment.id));
        setEquippedItems(prev => [...prev, equipment]);
        setShowDetails(false);
        setSelectedEquipment(null);
      } else {
        throw new Error('穿戴装备失败');
      }
    } catch (error) {
      console.error('Failed to equip item:', error);
      setError('穿戴装备失败');
    }
  };

  const handleUnequip = async (equipment: Equipment) => {
    try {
      const token = authService.getAuthToken();
      if (!token) {
        setError('未登录或登录已过期');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/equipments/${equipment.id}/unequip`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Move equipment from equipped to unequipped
        setEquippedItems(prev => prev.filter(item => item.id !== equipment.id));
        setUnequippedItems(prev => [...prev, equipment]);
        setShowDetails(false);
        setSelectedEquipment(null);
      } else {
        throw new Error('卸下装备失败');
      }
    } catch (error) {
      console.error('Failed to unequip item:', error);
      setError('卸下装备失败');
    }
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedEquipment(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 p-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-slate-700/50 shadow-[0_0_30px_rgba(0,0,255,0.5)] w-full h-full overflow-y-hidden">
          {/* Close Button */}
          <div className="p-4 flex justify-end">
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white transition-colors text-2xl"
            >
              ×
            </button>
          </div>
          {/* Equipment Sections */}
          <div className="p-4 pt-0 flex flex-col h-full">
          {/* Equipped Slots and Character Section */}
          <div className="mb-4">
            
            <div className="flex items-center justify-between gap-4">
              {/* Left Slots (4 slots) */}
              <div className="flex flex-col gap-2">
                {['weapon', 'helmet', 'chest', 'gloves'].map((slot) => {
                  // Find if there's an equipped item for this slot
                  const equippedItem = equippedItems.find(item => {
                    // Map equipment type to slot
                    const typeToSlot = {
                      '武器': 'weapon',
                      '头盔': 'helmet',
                      '胸甲': 'chest',
                      '手套': 'gloves',
                      '裤子': 'pants',
                      '护腿': 'pants',
                      '鞋子': 'boots',
                      '靴子': 'boots', // 兼容旧名称
                      '戒指': 'ring'
                    };
                    // Try to determine slot from item name or type
                    let itemType = '';
                    // Check if item has a specific slot property (preferred method)
                    if (item.slot) {
                      itemType = item.slot;
                    } else if (item.base_attributes && item.base_attributes.type) {
                      itemType = item.base_attributes.type;
                    } else {
                      // Fallback to name-based detection
                      itemType = item.name.includes('武器') ? '武器' : 
                              item.name.includes('头盔') ? '头盔' :
                              item.name.includes('胸甲') ? '胸甲' :
                              item.name.includes('手套') ? '手套' :
                              item.name.includes('裤子') ? '裤子' :
                              item.name.includes('鞋子') || item.name.includes('靴子') ? '鞋子' :
                              item.name.includes('戒指') ? '戒指' : '';
                    }
                    return typeToSlot[itemType] === slot;
                  });

                  // Get slot display name
                  const getSlotName = (slot: string) => {
                    const slotNames: Record<string, string> = {
                      'weapon': '武器',
                      'helmet': '头盔',
                      'chest': '胸甲',
                      'gloves': '手套',
                      'pants': '裤子',
                      'boots': '鞋子',
                      'ring': '戒指'
                    };
                    return slotNames[slot] || slot;
                  };

                  // Get rarity style
                  const getRarityStyle = (rarity: string) => {
                    const rarityStyles: Record<string, string> = {
                      '普通': 'border-gray-400',
                      '稀有': 'border-blue-400',
                      '史诗': 'border-purple-400',
                      '传说': 'border-orange-400',
                      '神话': 'border-pink-400',
                      '创世': 'border-yellow-400'
                    };
                    return rarityStyles[rarity] || 'border-gray-400';
                  };

                  return (
                    <div key={slot} className="equip-slot" data-slot={slot}>
                      {equippedItem ? (
                        <div 
                          className={`relative p-1 rounded-lg border ${getRarityStyle(equippedItem.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                          onClick={() => handleEquipmentClick(equippedItem)}
                        >
                          <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700 overflow-hidden">
                            {equippedItem.image_url ? (
                              <img 
                                src={equippedItem.image_url} 
                                alt={equippedItem.name} 
                                className="w-12 h-12 object-contain"
                              />
                            ) : (
                              <div 
                                className="w-12 h-12 rounded shadow-sm"
                                style={{ backgroundColor: '#4ade80' }}
                              ></div>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1 text-center">{getSlotName(slot)}</p>
                        </div>
                      ) : (
                        <div className="relative p-1 rounded-lg border border-slate-700 aspect-square flex flex-col items-center justify-center text-slate-500">
                          <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                            <div className="w-12 h-12 bg-slate-800 rounded"></div>
                          </div>
                          <p className="text-xs mt-0.5">{getSlotName(slot)}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Character Image and Stats Button */}
              <div className="flex flex-col items-center justify-center gap-4">
                {/* Character Image with Attributes Button */}
                <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-xl border-2 border-cyan-500/20 shadow-inner shadow-cyan-500/10">
                  {skinData?.idle_image_urls && skinData.idle_image_urls.length > 0 ? (
                    <img 
                      src={skinData.idle_image_urls[currentIdleImageIndex]} 
                      alt="角色" 
                      className="w-32 h-32 object-contain"
                    />
                  ) : (
                    <img 
                      src="https://via.placeholder.com/128" 
                      alt="角色" 
                      className="w-32 h-32 object-contain"
                    />
                  )}
                  {/* Character attributes button - Semi-transparent in top right corner */}
                  <button 
                    className="absolute top-0 right-0 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold z-50"
                    onClick={async () => {
                      await fetchCharacterAttributes();
                      setShowAttributesModal(true);
                    }}
                    title="角色属性详情"
                  >
                    ⓘ
                  </button>
                </div>
              </div>

              {/* Right Slots (3 slots) */}
              <div className="flex flex-col gap-2">
                {['pants', 'boots', 'ring'].map((slot) => {
                  // Find if there's an equipped item for this slot
                  const equippedItem = equippedItems.find(item => {
                    // Map equipment type to slot
                    const typeToSlot = {
                      '武器': 'weapon',
                      '头盔': 'helmet',
                      '胸甲': 'chest',
                      '手套': 'gloves',
                      '裤子': 'pants',
                      '护腿': 'pants',
                      '鞋子': 'boots',
                      '靴子': 'boots',
                      '戒指': 'ring'
                    };
                    // Try to determine slot from item name or type
                    let itemType = '';
                    // Check if item has a specific slot property (preferred method)
                    if (item.slot) {
                      itemType = item.slot;
                    } else if (item.base_attributes && item.base_attributes.type) {
                      itemType = item.base_attributes.type;
                    } else {
                      // Fallback to name-based detection
                      itemType = item.name.includes('武器') ? '武器' : 
                              item.name.includes('头盔') ? '头盔' :
                              item.name.includes('胸甲') ? '胸甲' :
                              item.name.includes('手套') ? '手套' :
                              item.name.includes('裤子') ? '裤子' :
                              item.name.includes('鞋子') || item.name.includes('靴子') ? '鞋子' :
                              item.name.includes('戒指') ? '戒指' : '';
                    }
                    return typeToSlot[itemType] === slot;
                  });

                  // Get slot display name
                  const getSlotName = (slot: string) => {
                    const slotNames: Record<string, string> = {
                      'weapon': '武器',
                      'helmet': '头盔',
                      'chest': '胸甲',
                      'gloves': '手套',
                      'pants': '裤子',
                      'boots': '鞋子',
                      'ring': '戒指'
                    };
                    return slotNames[slot] || slot;
                  };

                  // Get rarity style
                  const getRarityStyle = (rarity: string) => {
                    const rarityStyles: Record<string, string> = {
                      '普通': 'border-gray-400',
                      '稀有': 'border-blue-400',
                      '史诗': 'border-purple-400',
                      '传说': 'border-orange-400',
                      '神话': 'border-pink-400',
                      '创世': 'border-yellow-400'
                    };
                    return rarityStyles[rarity] || 'border-gray-400';
                  };

                  return (
                    <div key={slot} className="equip-slot" data-slot={slot}>
                      {equippedItem ? (
                        <div 
                          className={`relative p-1 rounded-lg border ${getRarityStyle(equippedItem.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                          onClick={() => handleEquipmentClick(equippedItem)}
                        >
                          <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700 overflow-hidden">
                            {equippedItem.image_url ? (
                              <img 
                                src={equippedItem.image_url} 
                                alt={equippedItem.name} 
                                className="w-12 h-12 object-contain"
                              />
                            ) : (
                              <div 
                                className="w-12 h-12 rounded shadow-sm"
                                style={{ backgroundColor: '#4ade80' }}
                              ></div>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1 text-center">{getSlotName(slot)}</p>
                        </div>
                      ) : (
                        <div className="relative p-1 rounded-lg border border-slate-700 aspect-square flex flex-col items-center justify-center text-slate-500">
                          <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                            <div className="w-12 h-12 bg-slate-800 rounded"></div>
                          </div>
                          <p className="text-xs mt-0.5">{getSlotName(slot)}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Unequipped Items */}
          <div className="mt-4 flex flex-col flex-1 max-h-[50vh]">
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 pb-2">
              {unequippedItems.length > 0 ? (
                unequippedItems.map((item) => {
                  // Get rarity style
                  const getRarityStyle = (rarity: string) => {
                    const rarityStyles: Record<string, string> = {
                      '普通': 'border-gray-400',
                      '稀有': 'border-blue-400',
                      '史诗': 'border-purple-400',
                      '传说': 'border-orange-400',
                      '神话': 'border-pink-400',
                      '创世': 'border-yellow-400'
                    };
                    return rarityStyles[rarity] || 'border-gray-400';
                  };

                  return (
                    <div 
                      key={item.id} 
                      className={`bg-slate-800 border rounded-lg p-2 cursor-pointer transition-all hover:scale-105 group relative ${getRarityStyle(item.rarity)}`}
                      onClick={() => handleEquipmentClick(item)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700 overflow-hidden">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name} 
                            className="w-12 h-12 object-contain"
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded shadow-sm"
                            style={{ backgroundColor: '#4ade80' }}
                          ></div>
                        )}
                      </div>
                      <p className="text-xs text-white text-center line-clamp-1 mt-1">{item.name}</p>
                      <p className="text-xs text-slate-500 text-center">{item.rarity}</p>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center text-slate-400 py-8">
                  暂无未穿戴的装备
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Details Modal */}
      {showDetails && selectedEquipment && (
        <div className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-slate-700/50 shadow-[0_0_30px_rgba(0,255,255,0.5)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4 rounded-t-xl border-b-2 border-cyan-500/50">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">{selectedEquipment.name}</h2>
                <button 
                  onClick={closeDetails} 
                  className="text-white hover:text-red-400 text-2xl transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Details Content */}
            <div className="p-6">
              {/* Image and Basic Info Section */}
              <div className="flex items-center gap-4 mb-4">
                {/* Image (Left Corner) */}
                <div className="h-16 w-16 bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden border-2 border-amber-500/30">
                  {selectedEquipment.image_url && (
                    <img 
                      src={selectedEquipment.image_url} 
                      alt={selectedEquipment.name} 
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
                
                {/* Equipment Name and Rarity */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{selectedEquipment.name}</h3>
                  <p className="text-sm text-yellow-300">{selectedEquipment.rarity}·{selectedEquipment.type}</p>
                </div>
              </div>

              {/* Compact Attributes Container */}
              <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700/50 mb-6 space-y-3">
                {/* Base Attributes */}
                {Object.entries(selectedEquipment.base_attributes)
                  .filter(([key, value]) => value !== 0)
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-white">{key}</span>
                      <span className="text-cyan-400 font-bold">+{value}</span>
                    </div>
                  ))}

                {/* Additional Attributes */}
                {selectedEquipment.additional_attrs.length > 0 && (
                  selectedEquipment.additional_attrs
                    .filter(attr => attr.value !== 0)
                    .map((attr, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-white">{attr.name}</span>
                        <span className="text-purple-400 font-bold">+{attr.value}</span>
                      </div>
                    ))
                )}

                {/* Rare Attributes with special styling */}
                {selectedEquipment.rare_attrs.length > 0 && (
                  <div className="pt-2 border-t border-yellow-500/50">
                    {selectedEquipment.rare_attrs.map((attr, index) => (
                      <div key={index} className="flex items-start gap-2 mt-2">
                        <span className="text-yellow-400 text-lg">★</span>
                        <div className="flex-1">
                          <span className="text-white">{attr.name}</span>
                          {attr.value && (
                            <span className="text-yellow-400 font-bold ml-2">{attr.value}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                {equippedItems.some(item => item.id === selectedEquipment.id) ? (
                  <button 
                    onClick={() => handleUnequip(selectedEquipment)}
                    className="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 border-2 border-red-500/50 text-white font-bold rounded-lg shadow-lg hover:bg-gradient-to-r from-red-500 to-pink-500 transition-all hover:shadow-[0_0_20px_rgba(255,0,0,0.8)] hover:scale-105 active:scale-95"
                  >
                    卸下
                  </button>
                ) : (
                  <button 
                    onClick={() => handleEquip(selectedEquipment)}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 border-2 border-green-500/50 text-white font-bold rounded-lg shadow-lg hover:bg-gradient-to-r from-green-500 to-emerald-500 transition-all hover:shadow-[0_0_20px_rgba(0,255,0,0.8)] hover:scale-105 active:scale-95"
                  >
                    穿戴
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Character Attributes Modal */}
      {showAttributesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={() => setShowAttributesModal(false)}></div>
          
          <div className="relative z-10 w-80 bg-slate-900 border-2 border-slate-700 rounded-lg shadow-2xl p-6 transform transition-all scale-100">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
              <h3 className="text-amber-500 font-bold tracking-widest uppercase text-sm">角色属性详情</h3>
              <button onClick={() => setShowAttributesModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            {isLoadingAttributes ? (
              <div className="flex justify-center items-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : attributesData ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {Object.entries(attributesData).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center bg-slate-950/50 p-3 rounded border border-slate-800 hover:border-slate-600 transition-colors">
                    <div className="text-xs text-slate-300 font-bold uppercase tracking-wide">{key}</div>
                    <span className="text-sm font-bold font-mono text-white">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">
                <p>无法获取角色属性数据</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
