import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../services/authService';
import { LootItem, Rarity } from '../types';

// 定义皮肤数据接口
interface SkinData {
  idle_image_urls: string[];
}

interface InventoryModalProps {
  items: LootItem[];
  onClose: () => void;
  // Add original API data for equipment details
  originalItems?: any[];
  // Add skin data for character animation
  skinData?: SkinData | null;
  // Add callback for inventory updates
  onInventoryUpdate?: (updatedItems: LootItem[]) => void;
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

export const InventoryModal: React.FC<InventoryModalProps> = ({ items, onClose, originalItems = [], skinData = null, onInventoryUpdate }) => {
  const [selectedEquipment, setSelectedEquipment] = useState<LootItem | null>(null);
  const [equippedItems, setEquippedItems] = useState<Record<string, EquippedItem>>({});
  const [currentIdleImageIndex, setCurrentIdleImageIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false); // 防止并发操作的加载状态
  
  // 使用ref跟踪最新的装备栏状态，避免闭包问题
  const equippedItemsRef = useRef<Record<string, EquippedItem>>({});
  
  // 当装备栏状态更新时，同步更新ref
  useEffect(() => {
    equippedItemsRef.current = equippedItems;
  }, [equippedItems]);
  
  // 循环播放角色待机动画
  useEffect(() => {
    if (skinData?.idle_image_urls && skinData.idle_image_urls.length > 1) {
      const interval = setInterval(() => {
        setCurrentIdleImageIndex(prev => (prev + 1) % skinData!.idle_image_urls.length);
      }, 1000 / skinData.idle_image_urls.length); // 1秒内播完所有图片
      
      return () => clearInterval(interval);
    }
  }, [skinData]);
  
  // 组件加载时获取已装备的物品
  useEffect(() => {
    fetchEquippedItems();
  }, []);

  // 移除了通用调试日志，只保留装备穿戴和卸下时的特定格式日志

  // 获取已装备物品
  const fetchEquippedItems = async () => {
    try {
      const token = authService.getAuthToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/my-items/equipped`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 将API返回的数据转换为组件期望的EquippedItem格式
          const organized = (result.data || []).reduce((acc: Record<string, EquippedItem>, item: any) => {
            if (item.equipment && item.equipment.equipment_template && item.equipment.is_equipped) {
              const template = item.equipment.equipment_template;
              const equippedItem: EquippedItem = {
                id: item.id,
                item_id: item.item_id,
                name: template.name,
                value: 0, // API中没有直接提供value，暂时设为0
                rarity: 'common', // API中没有直接提供rarity，暂时设为common
                iconColor: '#ccc', // API中没有直接提供iconColor，暂时设为灰色
                imageUrl: template.image_url?.trim()?.replace(/^`|`$/g, ''), // 去除可能的反引号和前后空格
                quantity: 1,
                type: item.type,
                level: template.level,
                slot: template.slot,
                equipment: item.equipment
              };
              acc[template.slot] = equippedItem;
            }
            return acc;
          }, {});
          setEquippedItems(organized);
        }
      }
    } catch (error) {
      console.error('获取已装备物品失败:', error);
    }
  };
  
  // 装备物品
  const equipItem = async (itemId: string | number) => {
    if (isProcessing) return; // 如果正在处理其他操作，直接返回
    
    setIsProcessing(true); // 设置为处理中状态
    
    try {
      // 获取要穿戴的装备
      const itemToEquip = items.find(item => item.id === itemId);
      if (!itemToEquip) return;

      // 检查是否有穿戴中的装备在同一部位
      const currentEquippedItem = equippedItems[itemToEquip.slot];
      
      // 保存原始状态用于回滚
      const originalEquippedItems = { ...equippedItems };
      const originalItems = [...items];
      
      // 将LootItem转换为EquippedItem格式
      const equippedItem: EquippedItem = {
        id: itemToEquip.id,
        item_id: itemToEquip.item_id,
        name: itemToEquip.name,
        value: itemToEquip.value || 0,
        rarity: itemToEquip.rarity,
        iconColor: itemToEquip.iconColor,
        imageUrl: itemToEquip.imageUrl,
        quantity: itemToEquip.quantity || 1,
        type: itemToEquip.type || 'equipment',
        level: itemToEquip.level || 1,
        slot: itemToEquip.slot || 'weapon', // 假设默认是武器槽位
        equipment: { is_equipped: true } // 添加必要的equipment字段
      };
      
      // 前端立即更新装备栏
      setEquippedItems(prev => {
        const updated = { ...prev };
        if (currentEquippedItem) {
          delete updated[itemToEquip.slot];
        }
        updated[itemToEquip.slot] = equippedItem;
        return updated;
      });
      
      // 计算更新后的背包：移除要装备的物品，添加要卸下的物品（如果有）
      let updatedItems = [...items];
      
      // 先移除要装备的物品
      const itemIndex = updatedItems.findIndex(item => item.id === itemId);
      if (itemIndex >= 0) {
        updatedItems.splice(itemIndex, 1);
      }
      
      // 如果有要卸下的物品，添加到背包
      if (currentEquippedItem) {
        // 将EquippedItem转换为LootItem格式，使用API返回的原始id
        const lootedItem: LootItem = {
          id: currentEquippedItem.id,
          item_id: currentEquippedItem.item_id,
          name: currentEquippedItem.name,
          value: currentEquippedItem.value,
          rarity: currentEquippedItem.rarity,
          iconColor: currentEquippedItem.iconColor,
          imageUrl: currentEquippedItem.imageUrl,
          quantity: currentEquippedItem.quantity || 1,
          type: currentEquippedItem.type || 'equipment',
          level: currentEquippedItem.level || 1,
          attack_power: currentEquippedItem.equipment?.attack_power,
          defense_power: currentEquippedItem.equipment?.defense_power,
          health: currentEquippedItem.equipment?.health,
          additional_attrs: currentEquippedItem.equipment?.additional_attrs
        };
        
        // 检查背包中是否已存在相同item_id的物品，避免重复添加
        const existingItemIndex = updatedItems.findIndex(item => item.item_id === lootedItem.item_id);
        if (existingItemIndex >= 0) {
          // 如果已存在，更新现有物品的数量
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: (updatedItems[existingItemIndex].quantity || 1) + 1
          };
        } else {
          // 如果不存在，添加到背包
          updatedItems = [...updatedItems, lootedItem];
        }
      }
      
      // 更新前端背包显示
      if (onInventoryUpdate) {
        // 调试日志：打印更新后的背包数据
        console.log('更新后的背包数据:', updatedItems);
        console.log('卸下的装备转换后的背包物品:', lootedItem);

        
        onInventoryUpdate(updatedItems);
      }
      
      // 异步请求卸下接口（如果有需要卸下的装备）
      if (currentEquippedItem) {
        const token = authService.getAuthToken();
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/equipments/${currentEquippedItem.id}/unequip`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });
      }
      
      // 异步请求装备接口
      const token = authService.getAuthToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/equipments/${itemId}/equip`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      if (response.ok) {
        // 如果API请求成功，更新装备栏和背包
        // 计算最新的装备栏状态（考虑当前装备的物品和可能卸下的物品）
        const latestEquippedItems = { ...originalEquippedItems };
        if (currentEquippedItem) {
          delete latestEquippedItems[itemToEquip.slot];
        }
        latestEquippedItems[itemToEquip.slot] = equippedItem;
        
        // 装备成功后打印状态日志
        console.log(`穿戴装备，id${itemId}`);
        const currentEquippedIds = Object.values(latestEquippedItems)
          .map(item => item.id)
          .sort((a, b) => Number(a) - Number(b));
        console.log(`穿戴中的装备，${currentEquippedIds.join(',')}`);

        // 使用ref打印最新的React状态
        setTimeout(() => {
          console.log('实际React状态中的装备栏:', equippedItemsRef.current);
        }, 100);
        
        const currentBackpackIds = updatedItems
          .map(item => item.id)
          .sort((a, b) => Number(a) - Number(b));
        console.log(`背包中的装备${currentBackpackIds.join(',')}`);
      } else {
        // 如果装备失败，回滚前端更改
        console.error('装备失败，回滚前端状态');
        setEquippedItems(originalEquippedItems);
        
        // 回滚背包状态
        if (onInventoryUpdate) {
          onInventoryUpdate(originalItems);
        }
      }
    } catch (error) {
      console.error('装备物品失败:', error);
      // 发生异常时也回滚前端状态
      setEquippedItems(originalEquippedItems);
      if (onInventoryUpdate) {
        onInventoryUpdate(originalItems);
      }
    } finally {
      setIsProcessing(false); // 无论成功还是失败，都重置处理状态
    }
  };
  
  // 卸下物品
  const unequipItem = async (itemId: string | number) => {
    if (isProcessing) return; // 如果正在处理其他操作，直接返回
    
    setIsProcessing(true); // 设置为处理中状态
    
    try {
      // 获取要卸下的装备信息
      const itemToUnequip = selectedEquipment || Object.values(equippedItems).find(item => item.id === itemId);
      if (!itemToUnequip) {
        console.error('未找到要卸下的装备:', itemId);
        return;
      }
      
      console.log('要卸下的装备信息:', itemToUnequip);
      
      // 保存原始状态用于回滚
      const originalEquippedItems = { ...equippedItems };
      const originalItems = [...items];
      
      // 清除选中状态
      if (selectedEquipment?.id === itemId) {
        setSelectedEquipment(null);
      }
      
      // 异步请求卸下接口
      const token = authService.getAuthToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/equipments/${itemId}/unequip`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      if (response.ok) {
        // 前端更新装备栏
        setEquippedItems(prev => {
          const updated = { ...prev };
          delete updated[itemToUnequip.slot];
          return updated;
        });
        
        // 将EquippedItem转换为LootItem格式，确保包含所有必要字段
        console.log('装备详情:', itemToUnequip);
        console.log('装备equipment字段:', itemToUnequip.equipment);
        
        // 确保rarity字段的类型正确
        let normalizedRarity = itemToUnequip.rarity;
        if (typeof normalizedRarity === 'string') {
          normalizedRarity = Rarity[normalizedRarity as keyof typeof Rarity] || Rarity.COMMON;
        }
        
        const lootedItem: LootItem = {
          id: itemToUnequip.id, // 生成一个唯一的id，避免与背包中已有的物品冲突
          item_id: itemToUnequip.item_id,
          name: itemToUnequip.name,
          value: itemToUnequip.value,
          rarity: normalizedRarity,
          iconColor: itemToUnequip.iconColor,
          imageUrl: itemToUnequip.imageUrl,
          quantity: itemToUnequip.quantity || 1,
          type: 'equipment', // 明确设置为equipment类型
          level: itemToUnequip.level || 1,
          slot: itemToUnequip.slot,
          attack_power: itemToUnequip.equipment?.attack_power,
          defense_power: itemToUnequip.equipment?.defense_power,
          health: itemToUnequip.equipment?.health,
          additional_attrs: itemToUnequip.equipment?.additional_attrs
        };
        
        console.log('转换后的背包物品:', lootedItem);
        
        console.log('转换为背包物品的装备:', lootedItem);
        
        // 前端更新背包：添加卸下的装备，确保不重复
        // 使用当前的items数组创建最新的背包状态
        const latestItems = [...items];
        
        // 检查背包中是否已存在相同item_id的物品，避免重复添加
        const existingItemIndex = latestItems.findIndex(item => item.item_id === lootedItem.item_id);
        
        if (existingItemIndex >= 0) {
          // 如果已存在，更新现有物品的数量
          latestItems[existingItemIndex] = {
            ...latestItems[existingItemIndex],
            quantity: (latestItems[existingItemIndex].quantity || 1) + 1
          };
          console.log('物品已存在，更新数量:', latestItems[existingItemIndex]);
        } else {
          // 如果不存在，添加到背包
          latestItems.push(lootedItem);
          console.log('物品不存在，添加到背包:', lootedItem);
        }
        
        console.log('当前背包状态:', items);
        console.log('查找item_id为', lootedItem.item_id, '的物品，结果索引:', existingItemIndex);
        console.log('更新后的背包数据:', latestItems);
        
        if (onInventoryUpdate) {
          console.log('调用onInventoryUpdate更新背包');
          onInventoryUpdate(latestItems);
        } else {
          console.error('onInventoryUpdate未定义');
        }
        
        // 计算最新的装备栏状态（移除当前卸下的物品）
        const latestEquippedItems = { ...originalEquippedItems };
        delete latestEquippedItems[itemToUnequip.slot];
        
        // 卸下成功后打印状态日志
        console.log(`卸下装备，id${itemId}`);
        const currentEquippedIds = Object.values(latestEquippedItems)
          .map(item => item.id)
          .sort((a, b) => Number(a) - Number(b));
        console.log(`穿戴中的装备，${currentEquippedIds.join(',')}`);

        setTimeout(() => {
          console.log('实际React状态中的装备栏:', equippedItemsRef.current);
        }, 100);
        
        // 使用更新后的背包物品
        const currentBackpackIds = latestItems
          .map(item => item.id)
          .sort((a, b) => Number(a) - Number(b));
        console.log(`背包中的装备${currentBackpackIds.join(',')}`);
      } else {
        // 如果卸下失败，回滚前端更改
        console.error('卸下失败，回滚前端状态');
        setEquippedItems(originalEquippedItems);
        
        if (onInventoryUpdate) {
          onInventoryUpdate(originalItems);
        }
      }
    } catch (error) {
      console.error('卸下物品失败:', error);
      // 发生异常时也回滚前端状态
      setEquippedItems(originalEquippedItems);
      if (onInventoryUpdate) {
        onInventoryUpdate(originalItems);
      }
    } finally {
      setIsProcessing(false); // 无论成功还是失败，都重置处理状态
    }
  };

  // 处理卸下装备点击事件
  const handleUnequipClick = (itemId: string | number) => {
    unequipItem(itemId);
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
  
  // 调试函数：检查装备状态
  const debugEquipmentState = () => {
    console.log('当前装备栏状态:', equippedItems);
    console.log('当前背包状态:', items);
    console.log('已装备物品数量:', Object.keys(equippedItems).length);
    console.log('背包物品数量:', items.length);
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
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>

        <div className="relative z-10 w-full h-full p-6 flex flex-col bg-slate-900/90 border border-slate-700 shadow-2xl overflow-hidden">
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
          <div className="p-2 pt-0 bg-slate-950/50 rounded-xl border border-slate-800 overflow-x-auto max-h-[60vh] sm:max-h-[40vh]">
            <div className="flex items-center justify-center gap-6 md:gap-8 sm:gap-2">
              {/* Left 4 slots */}
              <div className="flex flex-col gap-2 sm:gap-1">
                <div className="equip-slot" data-slot="weapon">
                  {equippedItems.weapon ? (
                    <div 
                      className={`relative p-1 sm:p-2 rounded-lg border ${getRarityStyle(equippedItems.weapon.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleEquipmentClick(equippedItems.weapon)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        {equippedItems.weapon.imageUrl ? (
                          <img 
                            src={equippedItems.weapon.imageUrl} 
                            alt={equippedItems.weapon.name} 
                            className="w-full h-full object-contain max-w-12 max-h-12"
                          />
                        ) : (
                          <div 
                            className="w-10 sm:w-12 h-10 sm:h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.weapon.iconColor }}
                          ></div>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs mt-0.5 truncate text-center line-clamp-1">{equippedItems.weapon.name}</p>
                      <p className="text-[9px] sm:text-xs text-slate-500 line-clamp-1">{getSlotName('weapon')}</p>
                    </div>
                  ) : (
                    <div className="relative p-1 sm:p-2 rounded-lg border border-slate-700 aspect-square flex flex-col items-center justify-center text-slate-500">
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        <div className="w-10 sm:w-12 h-10 sm:h-12 bg-slate-800 rounded"></div>
                      </div>
                      <p className="text-[9px] sm:text-xs mt-0.5">{getSlotName('weapon')}</p>
                    </div>
                  )}
                </div>
                
                <div className="equip-slot" data-slot="helmet">
                  {equippedItems.helmet ? (
                    <div 
                      className={`relative p-1 sm:p-2 rounded-lg border ${getRarityStyle(equippedItems.helmet.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleEquipmentClick(equippedItems.helmet)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        {equippedItems.helmet.imageUrl ? (
                          <img 
                            src={equippedItems.helmet.imageUrl} 
                            alt={equippedItems.helmet.name} 
                            className="w-full h-full object-contain max-w-12 max-h-12"
                          />
                        ) : (
                          <div 
                            className="w-10 sm:w-12 h-10 sm:h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.helmet.iconColor }}
                          ></div>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs mt-0.5 truncate text-center line-clamp-1">{equippedItems.helmet.name}</p>
                      <p className="text-[9px] sm:text-xs text-slate-500 line-clamp-1">{getSlotName('helmet')}</p>
                    </div>
                  ) : (
                    <div className="relative p-1 sm:p-2 rounded-lg border border-slate-700 aspect-square flex flex-col items-center justify-center text-slate-500">
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        <div className="w-10 sm:w-12 h-10 sm:h-12 bg-slate-800 rounded"></div>
                      </div>
                      <p className="text-[9px] sm:text-xs mt-0.5">{getSlotName('helmet')}</p>
                    </div>
                  )}
                </div>
                
                <div className="equip-slot" data-slot="chest">
                  {equippedItems.chest ? (
                    <div 
                      className={`relative p-1 sm:p-2 rounded-lg border ${getRarityStyle(equippedItems.chest.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleEquipmentClick(equippedItems.chest)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        {equippedItems.chest.imageUrl ? (
                          <img 
                            src={equippedItems.chest.imageUrl} 
                            alt={equippedItems.chest.name} 
                            className="w-full h-full object-contain max-w-12 max-h-12"
                          />
                        ) : (
                          <div 
                            className="w-10 sm:w-12 h-10 sm:h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.chest.iconColor }}
                          ></div>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs mt-0.5 truncate text-center line-clamp-1">{equippedItems.chest.name}</p>
                      <p className="text-[9px] sm:text-xs text-slate-500 line-clamp-1">{getSlotName('chest')}</p>
                    </div>
                  ) : (
                    <div className="relative p-1 sm:p-2 rounded-lg border border-slate-700 aspect-square flex flex-col items-center justify-center text-slate-500">
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        <div className="w-10 sm:w-12 h-10 sm:h-12 bg-slate-800 rounded"></div>
                      </div>
                      <p className="text-[9px] sm:text-xs mt-0.5">{getSlotName('chest')}</p>
                    </div>
                  )}
                </div>
                
                <div className="equip-slot" data-slot="gloves">
                  {equippedItems.gloves ? (
                    <div 
                      className={`relative p-1 sm:p-2 rounded-lg border ${getRarityStyle(equippedItems.gloves.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleEquipmentClick(equippedItems.gloves)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        {equippedItems.gloves.imageUrl ? (
                          <img 
                            src={equippedItems.gloves.imageUrl} 
                            alt={equippedItems.gloves.name} 
                            className="w-full h-full object-contain max-w-12 max-h-12"
                          />
                        ) : (
                          <div 
                            className="w-10 sm:w-12 h-10 sm:h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.gloves.iconColor }}
                          ></div>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs mt-0.5 truncate text-center line-clamp-1">{equippedItems.gloves.name}</p>
                      <p className="text-[9px] sm:text-xs text-slate-500 line-clamp-1">{getSlotName('gloves')}</p>
                    </div>
                  ) : (
                    <div className="relative p-1 sm:p-2 rounded-lg border border-slate-700 aspect-square flex flex-col items-center justify-center text-slate-500">
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        <div className="w-10 sm:w-12 h-10 sm:h-12 bg-slate-800 rounded"></div>
                      </div>
                      <p className="text-[9px] sm:text-xs mt-0.5">{getSlotName('gloves')}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Middle character image */}
              <div className="flex-1 flex items-center justify-center mx-2 sm:mx-4">
                <div className="w-28 sm:w-40 h-28 sm:h-40 flex items-center justify-center">
                  {skinData?.idle_image_urls && skinData.idle_image_urls.length > 0 ? (
                    <img 
                      src={skinData.idle_image_urls[currentIdleImageIndex]} 
                      alt="Character idle animation" 
                      className="w-full h-full object-contain"
                      style={{ transform: `scale(${skinData?.scale ? (skinData.scale / 100) * 1.1 : 1.1})` }}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 rounded flex items-center justify-center">
                      <span className="text-slate-500">No idle animation</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right 3 slots */}
              <div className="flex flex-col gap-2 sm:gap-1">
                <div className="equip-slot" data-slot="pants">
                  {equippedItems.pants ? (
                    <div 
                      className={`relative p-1 sm:p-2 rounded-lg border ${getRarityStyle(equippedItems.pants.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleEquipmentClick(equippedItems.pants)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        {equippedItems.pants.imageUrl ? (
                          <img 
                            src={equippedItems.pants.imageUrl} 
                            alt={equippedItems.pants.name} 
                            className="w-full h-full object-contain max-w-12 max-h-12"
                          />
                        ) : (
                          <div 
                            className="w-10 sm:w-12 h-10 sm:h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.pants.iconColor }}
                          ></div>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs mt-0.5 truncate text-center line-clamp-1">{equippedItems.pants.name}</p>
                      <p className="text-[9px] sm:text-xs text-slate-500 line-clamp-1">{getSlotName('pants')}</p>
                    </div>
                  ) : (
                    <div className="relative p-1 sm:p-2 rounded-lg border border-slate-700 aspect-square flex flex-col items-center justify-center text-slate-500">
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        <div className="w-10 sm:w-12 h-10 sm:h-12 bg-slate-800 rounded"></div>
                      </div>
                      <p className="text-[9px] sm:text-xs mt-0.5">{getSlotName('pants')}</p>
                    </div>
                  )}
                </div>
                
                <div className="equip-slot" data-slot="boots">
                  {equippedItems.boots ? (
                    <div 
                      className={`relative p-1 sm:p-2 rounded-lg border ${getRarityStyle(equippedItems.boots.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleEquipmentClick(equippedItems.boots)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        {equippedItems.boots.imageUrl ? (
                          <img 
                            src={equippedItems.boots.imageUrl} 
                            alt={equippedItems.boots.name} 
                            className="w-full h-full object-contain max-w-12 max-h-12"
                          />
                        ) : (
                          <div 
                            className="w-10 sm:w-12 h-10 sm:h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.boots.iconColor }}
                          ></div>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs mt-0.5 truncate text-center line-clamp-1">{equippedItems.boots.name}</p>
                      <p className="text-[9px] sm:text-xs text-slate-500 line-clamp-1">{getSlotName('boots')}</p>
                    </div>
                  ) : (
                    <div className="relative p-1 sm:p-2 rounded-lg border border-slate-700 aspect-square flex flex-col items-center justify-center text-slate-500">
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        <div className="w-10 sm:w-12 h-10 sm:h-12 bg-slate-800 rounded"></div>
                      </div>
                      <p className="text-[9px] sm:text-xs mt-0.5">{getSlotName('boots')}</p>
                    </div>
                  )}
                </div>
                
                <div className="equip-slot" data-slot="ring">
                  {equippedItems.ring ? (
                    <div 
                      className={`relative p-1 sm:p-2 rounded-lg border ${getRarityStyle(equippedItems.ring.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleEquipmentClick(equippedItems.ring)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        {equippedItems.ring.imageUrl ? (
                          <img 
                            src={equippedItems.ring.imageUrl} 
                            alt={equippedItems.ring.name} 
                            className="w-full h-full object-contain max-w-12 max-h-12"
                          />
                        ) : (
                          <div 
                            className="w-10 sm:w-12 h-10 sm:h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.ring.iconColor }}
                          ></div>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs mt-0.5 truncate text-center line-clamp-1">{equippedItems.ring.name}</p>
                      <p className="text-[9px] sm:text-xs text-slate-500 line-clamp-1">{getSlotName('ring')}</p>
                    </div>
                  ) : (
                    <div className="relative p-1 sm:p-2 rounded-lg border border-slate-700 aspect-square flex flex-col items-center justify-center text-slate-500">
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700">
                        <div className="w-10 sm:w-12 h-10 sm:h-12 bg-slate-800 rounded"></div>
                      </div>
                      <p className="text-[9px] sm:text-xs mt-0.5">{getSlotName('ring')}</p>
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
                  // console.log('渲染物品:', item);
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
                  );})}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Equipment Details Modal */}
      {selectedEquipment && (
        <div 
          id="equipment-details-modal"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          {/* Modal Content */}
          <div className="relative w-full max-w-2xl bg-slate-950 border-4 border-cyan-500/50 rounded-lg shadow-[0_0_20px_rgba(0,255,255,0.5)] p-6 font-mono transform scale-50">
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
              {/* Check if this equipment is already equipped */}
              {Object.values(equippedItems).some(equipped => equipped.id === selectedEquipment?.id) ? (
                <button 
                  onClick={() => {
                    if (selectedEquipment) {
                      unequipItem(selectedEquipment.id);
                      closeDetails();
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 border-2 border-white/20 text-white font-bold rounded hover:bg-gradient-to-r from-red-500 to-rose-500 transition-all hover:shadow-[0_0_15px_rgba(255,0,0,0.8)]"
                >
                  卸下装备
                </button>
              ) : (
                <button 
                  onClick={handleEquipClick}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 border-2 border-white/20 text-white font-bold rounded hover:bg-gradient-to-r from-green-500 to-emerald-500 transition-all hover:shadow-[0_0_15px_rgba(0,255,128,0.8)]"
                >
                  穿戴装备
                </button>
              )}
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