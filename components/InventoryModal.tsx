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
  const [isLoading, setIsLoading] = useState(false); // 背包数据刷新时的loading状态
  
  // Sell-related states
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellItem, setSellItem] = useState<LootItem | null>(null);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [isSelling, setIsSelling] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'info'
  });

  // Character attributes state
  const [showAttributesModal, setShowAttributesModal] = useState(false);
  const [attributesData, setAttributesData] = useState<any>(null);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  
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
  
  // 组件加载时获取已装备的物品 - 已移至下方统一的refreshInventoryData调用

  // Toast自动关闭逻辑
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 3000); // 3秒后自动关闭

      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // 移除了通用调试日志，只保留装备穿戴和卸下时的特定格式日志

  // 处理出售按钮点击
  const handleSellClick = (item: LootItem) => {
    setSellItem(item);
    setSellQuantity(item.quantity ? Math.min(item.quantity, 1) : 1); // 默认出售1个
    setShowSellModal(true);
  };

  // 出售物品
  const sellMultipleItems = async () => {
    if (!sellItem) return;
    
    setIsSelling(true);
    try {
      const token = authService.getAuthToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/my-items/sell-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          items: [{
            my_item_id: sellItem.id,
            quantity: sellQuantity
          }]
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 出售成功后打印状态日志
          console.log(`出售宝物，id${sellItem.id}，数量${sellQuantity}`);
          
          // 调用统一刷新方法，只刷新背包数据
          refreshInventoryData(false);
          
          // 显示出售成功toast提示
          setToast({
            visible: true,
            message: '宝物出售成功！',
            type: 'success'
          });
          
          setShowSellModal(false);
          closeDetails();
        } else {
          console.error('出售失败:', result.message);
          // 显示出售失败toast提示
          setToast({
            visible: true,
            message: '出售失败：' + result.message,
            type: 'error'
          });
        }
      } else {
        console.error('出售请求失败:', response.status);
        // 显示请求失败toast提示
        setToast({
          visible: true,
          message: '出售请求失败，请稍后重试。',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('出售时发生错误:', error);
    } finally {
      setIsSelling(false);
    }
  };



  // 获取已装备物品
  const fetchEquippedItems = async () => {
    console.log('=== 开始获取装备栏数据 ===');
    try {
      const token = authService.getAuthToken();
      console.log('1. 获取令牌:', token ? '存在' : '不存在');
      console.log('2. API基础URL:', import.meta.env.VITE_API_BASE_URL);
      console.log('3. 开始发起网络请求...');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/my-items/equipped`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      console.log('4. 网络请求完成，响应状态:', response.status);
      
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
      const itemToEquip = items.find(item => Number(item.id) === Number(itemId));
      if (!itemToEquip) return;

      // 检查是否有穿戴中的装备在同一部位
      const currentEquippedItem = equippedItems[itemToEquip.slot];
      
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
        // 装备成功后打印状态日志
        console.log(`穿戴装备成功，id${itemId}`);
        
        // 调用统一刷新方法
        refreshInventoryData();
      } else {
        // 如果装备失败，打印错误信息
        console.error('装备失败');
        const errorData = await response.json();
        console.error('装备失败详情:', errorData);
      }
    } catch (error) {
      console.error('装备物品失败:', error);
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
      const itemToUnequip = selectedEquipment || Object.values(equippedItems).find(item => Number(item.id) === Number(itemId));
      if (!itemToUnequip) {
        console.error('未找到要卸下的装备:', itemId);
        return;
      }
      
      // 清除选中状态
      if (selectedEquipment && Number(selectedEquipment.id) === Number(itemId)) {
        setSelectedEquipment(null);
      }
      
      // 异步请求卸下装备API
      const token = authService.getAuthToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/equipments/${itemId}/unequip`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      if (response.ok) {
        // 卸下成功后打印状态日志
        console.log(`卸下装备成功，id${itemId}`);
        
        // 调用统一刷新方法
        refreshInventoryData();
      } else {
        // 如果卸下失败，打印错误信息
        console.error('卸下装备失败');
        const errorData = await response.json();
        console.error('卸下装备失败详情:', errorData);
      }
    } catch (error) {
      console.error('卸下装备失败:', error);
    } finally {
      setIsProcessing(false); // 无论成功还是失败，都重置处理状态
    }
  };

  // 处理卸下装备点击事件
  const handleUnequipClick = (itemId: string | number) => {
    unequipItem(itemId);
  };
  
  // 集成刷新方法：初始化背包数据
  const refreshInventoryData = async (shouldRefreshEquipped = true) => {
    console.log('=== 开始刷新背包数据 ===');
    setIsLoading(true); // 开始刷新时显示loading
    try {
      if (shouldRefreshEquipped) {
        console.log('1. 开始重新获取装备栏数据...');
        await fetchEquippedItems();
      }
      
      console.log('2. 获取我的物品数据...');
      // 手动发起请求获取我的物品，确保API调用被执行
      const token = authService.getAuthToken();
      if (token) {
        console.log('3. 手动发起网络请求获取我的物品...');
        const myItemsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/my-items?position=backpack`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        console.log('4. 我的物品请求完成，响应状态:', myItemsResponse.status);
        
        if (myItemsResponse.ok) {
          const result = await myItemsResponse.json();
          // 检查API响应是否成功，并确保data是数组
          if ((result.success || result.code === 200) && Array.isArray(result.data)) {
            console.log('5. 我的物品数据获取成功，通知父组件更新...');
            // 通知父组件更新背包数据，传递最新的物品列表
            if (onInventoryUpdate) {
              // 对API返回的数据进行与fetchBackpackItems函数相同的映射处理
              const mappedItems = result.data.map((item: any, index: number) => {
                let itemData: any;
                let itemType: string = item.type || 'treasure';
                
                // Handle different item types
                if (itemType === 'equipment') {
                  // Equipment data structure
                  itemData = item.equipment?.equipment_template || {};
                } else {
                  // Treasure data structure
                  itemData = item.treasure || item;
                }
                
                // Calculate value based on item type
                let itemValue = 0;
                if (itemType === 'equipment') {
                  // For equipment, value can be based on level and attack power
                  itemValue = (itemData.level || 1) * 10 + (itemData.attack || 0);
                } else {
                  // For treasure, use direct value
                  itemValue = itemData.value || 0;
                }
                
                // Use the original API returned id field as the unique identifier
                // According to API documentation, id is guaranteed to be unique across all items
                // Fallback to a unique generated ID if id is not available
                const generatedId = item.id || `${index}-${Math.random().toString(36).substr(2, 9)}`;
                
                return {
                  id: generatedId,
                  name: itemData.name || 'Unknown Item',
                  value: itemValue,
                  iconColor: itemType === 'equipment' ? '#4ade80' : '#ffd700', // Different color for equipment vs treasure
                  rarity: (itemData.rarity || 'LEGENDARY') as Rarity,
                  imageUrl: itemData.image_url || itemData.imageUrl || '',
                  quantity: itemType === 'equipment' ? 1 : (item.quantity || itemData.quantity || 1),
                  type: itemType // Store item type for future use
                };
              });
              onInventoryUpdate(mappedItems);
            }
          } else {
            console.error('5. 我的物品数据格式不正确:', result);
          }
        }
      } else {
        console.log('3. 没有令牌，无法手动发起请求获取我的物品');
      }
      
      console.log('=== 背包数据刷新完成 ===');
    } catch (error) {
      console.error('=== 刷新背包数据失败:', error);
    } finally {
      setIsLoading(false); // 无论成功失败，都关闭loading
    }
  };

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
            setToast({ visible: true, message: '获取角色属性失败', type: 'error' });
          }
        } else {
          console.error('获取角色属性失败，状态码:', response.status);
          setToast({ visible: true, message: '获取角色属性失败', type: 'error' });
        }
      } else {
        console.error('没有认证令牌，无法获取角色属性');
        setToast({ visible: true, message: '没有认证令牌，无法获取角色属性', type: 'error' });
      }
    } catch (error) {
      console.error('获取角色属性时发生错误:', error);
      setToast({ visible: true, message: '获取角色属性时发生错误', type: 'error' });
    } finally {
      setIsLoadingAttributes(false);
    }
  };

  // 组件挂载时获取已装备物品
  useEffect(() => {
    refreshInventoryData();
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
    // First try to find the item in the originalItems array
    const foundItemInOriginal = originalItems.find((apiItem: any) => {
      const matchesType = apiItem.type === 'equipment';
      
      // Convert both to string for type-agnostic comparison
      const matchesItemId = apiItem.id?.toString() === String(itemId);
      const matchesEquipmentId = apiItem.equipment?.id?.toString() === String(itemId);
      
      return matchesType && (matchesItemId || matchesEquipmentId);
    });
    
    // If found in originalItems, return it
    if (foundItemInOriginal) {
      return foundItemInOriginal;
    }
    
    // If not found in originalItems, try to find it in the items array
    const foundItemInItems = items.find((item: any) => {
      return item.id?.toString() === String(itemId);
    });
    
    return foundItemInItems;
  };

  // Handle equipment click
  const handleEquipmentClick = (item: LootItem) => {
    console.log('=== Equipment clicked start ===');
    console.log('Item clicked:', item);
    
    // Get the complete equipment data from originalItems
    const originalEquipmentData = getOriginalEquipmentData(item.id);
    console.log('Original equipment data:', originalEquipmentData);
    
    const combinedData = {
      ...item,
      ...(originalEquipmentData || {})
    };
    console.log('Combined data to set:', combinedData);
    
    setSelectedEquipment(combinedData);
    console.log('selectedEquipment set, current state:', selectedEquipment);
    console.log('=== Equipment clicked end ===');
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
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        )}
          {/* Header */}
          <div className="flex justify-end items-center mb-2 pb-0">
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
          <div className="p-2 pt-0 bg-slate-950/50 rounded-xl border border-slate-800 overflow-x-auto max-h-[50vh] sm:max-h-[35vh]">
            <div className="flex items-center justify-center gap-6 md:gap-8 sm:gap-2">
              {/* Left 4 slots */}
              <div className="flex flex-col gap-2 sm:gap-1">
                <div className="equip-slot" data-slot="weapon">
                  {equippedItems.weapon ? (
                    <div 
                      className={`relative p-1 sm:p-2 rounded-lg border ${getRarityStyle(equippedItems.weapon.rarity)} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleEquipmentClick(equippedItems.weapon)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700 overflow-hidden">
                        {equippedItems.weapon.imageUrl ? (
                          <img 
                            src={equippedItems.weapon.imageUrl} 
                            alt={equippedItems.weapon.name} 
                            className="w-10 sm:w-12 h-10 sm:h-12 object-contain"
                          />
                        ) : (
                          <div 
                            className="w-10 sm:w-12 h-10 sm:h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.weapon.iconColor }}
                          ></div>
                        )}
                      </div>
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
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700 overflow-hidden">
                        {equippedItems.helmet.imageUrl ? (
                          <img 
                            src={equippedItems.helmet.imageUrl} 
                            alt={equippedItems.helmet.name} 
                            className="w-10 sm:w-12 h-10 sm:h-12 object-contain"
                          />
                        ) : (
                          <div 
                            className="w-10 sm:w-12 h-10 sm:h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.helmet.iconColor }}
                          ></div>
                        )}
                      </div>
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
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700 overflow-hidden">
                        {equippedItems.chest.imageUrl ? (
                          <img 
                            src={equippedItems.chest.imageUrl} 
                            alt={equippedItems.chest.name} 
                            className="w-10 sm:w-12 h-10 sm:h-12 object-contain"
                          />
                        ) : (
                          <div 
                            className="w-10 sm:w-12 h-10 sm:h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.chest.iconColor }}
                          ></div>
                        )}
                      </div>
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
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700 overflow-hidden">
                        {equippedItems.gloves.imageUrl ? (
                          <img 
                            src={equippedItems.gloves.imageUrl} 
                            alt={equippedItems.gloves.name} 
                            className="w-10 sm:w-12 h-10 sm:h-12 object-contain"
                          />
                        ) : (
                          <div 
                            className="w-10 sm:w-12 h-10 sm:h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.gloves.iconColor }}
                          ></div>
                        )}
                      </div>
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
                <div className="w-28 sm:w-40 h-28 sm:h-40 flex items-center justify-center relative overflow-visible">
                  {skinData?.idle_image_urls && skinData.idle_image_urls.length > 0 ? (
                    <img 
                      src={skinData.idle_image_urls[currentIdleImageIndex]} 
                      alt="Character idle animation" 
                      className="w-full h-full object-contain z-1"
                      style={{ transform: `scale(${skinData?.scale ? (skinData.scale / 100) * 1.1 : 1.1})` }}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 rounded flex items-center justify-center">
                      <span className="text-slate-500">No idle animation</span>
                    </div>
                  )}
                  {/* Character attributes button */}
                  <button 
                    className="absolute top-0 right-0 bg-yellow-400 hover:bg-yellow-300 text-black rounded-full w-14 h-14 flex items-center justify-center text-2xl font-bold border-2 border-yellow-600 shadow-2xl z-50 animate-pulse"
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
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700 overflow-hidden">
                        {equippedItems.boots.imageUrl ? (
                          <img 
                            src={equippedItems.boots.imageUrl} 
                            alt={equippedItems.boots.name} 
                            className="w-10 sm:w-12 h-10 sm:h-12 object-contain"
                          />
                        ) : (
                          <div 
                            className="w-10 sm:w-12 h-10 sm:h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.boots.iconColor }}
                          ></div>
                        )}
                      </div>
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
                      <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700 overflow-hidden">
                        {equippedItems.ring.imageUrl ? (
                          <img 
                            src={equippedItems.ring.imageUrl} 
                            alt={equippedItems.ring.name} 
                            className="w-10 sm:w-12 h-10 sm:h-12 object-contain"
                          />
                        ) : (
                          <div 
                            className="w-10 sm:w-12 h-10 sm:h-12 rounded shadow-sm"
                            style={{ backgroundColor: equippedItems.ring.iconColor }}
                          ></div>
                        )}
                      </div>
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
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 mt-2">
            <h3 className="text-lg font-bold text-amber-500 mb-4 text-center">背包</h3>
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                <div className="w-16 h-16 border-2 border-slate-800 border-dashed rounded-lg"></div>
                <p className="font-mono text-sm">NO ITEMS COLLECTED</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {items.map((item, index) => {
                  // console.log('渲染物品:', item);
                  const rarityClass = getRarityStyle(item.rarity);
                  const isGenesis = item.rarity === Rarity.GENESIS;
                  return (
                     <div 
                       key={`${item.id}-${index}`} 
                       className={`group relative bg-slate-950 p-2 rounded-lg border border-slate-800 transition-colors cursor-pointer ${item.type === 'equipment' ? 'hover:border-amber-500' : ''}`}
                       onClick={(e) => {
                         e.stopPropagation(); // Prevent event bubbling to parent backdrop
                         console.log('Item clicked:', item.name, item.id);
                         handleEquipmentClick(item);
                       }}
                     >
                        <div className={`
                           aspect-square mb-2 flex items-center justify-center bg-slate-900 rounded
                           ${isGenesis ? '' : `border ${rarityClass.split(' ')[0]}`}
                           ${isGenesis ? 'bg-gradient-to-br from-pink-500/20 via-red-500/20 to-yellow-500/20' : ''}
                           relative
                        `}>
                            {item.imageUrl ? (
                              <div className="w-full h-full flex items-center justify-center bg-black">
                                <img 
                                  src={item.imageUrl} 
                                  alt={item.name} 
                                  className="w-full h-full object-contain p-2"
                                  onError={(e) => {
                                    // Fallback to color if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.style.backgroundColor = item.iconColor;
                                    }
                                  }}
                                />
                              </div>
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
                          <div className="text-[9px] text-cyan-400 font-mono mt-0.5">
                            Lv.{item.level}
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
          className="fixed inset-0 z-[99999] flex items-center justify-center p-2 bg-gradient-to-br from-black/80 to-slate-900/90 backdrop-blur-md animate-fadeIn"
        >
          {/* Modal Content */}
          <div className="relative w-full max-w-full sm:max-w-2xl bg-slate-950 border-4 border-cyan-500/30 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.3)] p-4 sm:p-6 font-mono transform transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,255,255,0.5)] max-h-[90vh] overflow-y-auto">
            {/* Header with pixel-style title */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b-4 border-amber-500/30">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 animate-pulse">
                {selectedEquipment.name}
              </h2>
              <button 
                onClick={closeDetails} 
                className="p-2 bg-red-500/20 border-2 border-red-500 text-red-400 hover:bg-red-500/40 transition-all hover:shadow-[0_0_15px_rgba(255,0,0,0.8)] rounded-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="square" strokeLinejoin="square" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
                </svg>
              </button>
            </div>

            {/* 宝物详情 */}
            {selectedEquipment.type === 'treasure' ? (
              <div className="mb-8 text-center">
                <div className="bg-slate-900 p-6 rounded-lg border border-amber-500/30 mb-6">
                  <div className="text-xl text-slate-400 mb-2">宝物价格</div>
                  <div className="text-4xl font-bold text-yellow-400">{selectedEquipment.value} 金币</div>
                </div>
                <div className="bg-slate-900 p-6 rounded-lg border border-cyan-500/30">
                  <div className="text-xl text-slate-400 mb-2">宝物等级</div>
                  <div className="text-4xl font-bold text-cyan-400">Lv.{selectedEquipment.level}</div>
                </div>
              </div>
            ) : (
              /* 装备详情（保持原有内容） */
              <>
                {/* Equipment Template Info */}
                {selectedEquipment.equipment?.equipment_template && (
                      <div className="mb-6 sm:mb-8">
                        <div className="text-base sm:text-lg font-bold text-cyan-400 mb-3 sm:mb-4">基础属性</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {/* Equipment Image */}
                      {selectedEquipment.equipment.equipment_template.image_url && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl border-2 border-cyan-500/20 flex items-center justify-center shadow-inner shadow-cyan-500/10">
                          <img 
                            src={selectedEquipment.equipment.equipment_template.image_url} 
                            alt={selectedEquipment.equipment.equipment_template.name} 
                            className="max-h-40 max-w-full object-contain animate-float"
                          />
                        </div>
                      )}
                      
                      {/* Basic Info */}
                      <div className="space-y-2 sm:space-y-3">
                        {/* Name */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-3 rounded-lg border border-slate-700/50 shadow-sm">
                          <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider">装备名称</div>
                          <div className="text-xl font-bold text-white">
                            {selectedEquipment.equipment.equipment_template.name}
                          </div>
                        </div>
                        
                        {/* Level */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-3 rounded-lg border border-slate-700/50 shadow-sm">
                          <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider">品级</div>
                          <div className={`text-xl font-bold ${getLevelColor(selectedEquipment.equipment.equipment_template.level)} animate-glow`}>
                            {['普通', '稀有', '史诗', '传说', '神话', '创世'][selectedEquipment.equipment.equipment_template.level - 1]}
                          </div>
                        </div>
                        
                        {/* Slot */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-3 rounded-lg border border-slate-700/50 shadow-sm">
                          <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider">部位</div>
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
                    <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                      {/* Health */}
                      {selectedEquipment.equipment.equipment_template.hp > 0 && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-lg border-2 border-red-500/20 hover:border-red-500/40 transition-all hover:shadow-[0_0_10px_rgba(255,0,0,0.2)]">
                          <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">生命值</div>
                          <div className="text-lg font-bold text-red-400">
                            +{selectedEquipment.equipment.equipment_template.hp}
                          </div>
                        </div>
                      )}
                      
                      {/* Attack */}
                      {selectedEquipment.equipment.equipment_template.attack > 0 && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-lg border-2 border-green-500/20 hover:border-green-500/40 transition-all hover:shadow-[0_0_10px_rgba(0,255,0,0.2)]">
                          <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">攻击力</div>
                          <div className="text-lg font-bold text-green-400">
                            +{selectedEquipment.equipment.equipment_template.attack}
                          </div>
                        </div>
                      )}
                      
                      {/* Attack Speed */}
                      {selectedEquipment.equipment.equipment_template.attack_speed > 0 && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-lg border-2 border-yellow-500/20 hover:border-yellow-500/40 transition-all hover:shadow-[0_0_10px_rgba(255,255,0,0.2)]">
                          <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">攻速</div>
                          <div className="text-lg font-bold text-yellow-400">
                            +{selectedEquipment.equipment.equipment_template.attack_speed}
                          </div>
                        </div>
                      )}
                      
                      {/* Move Speed */}
                      {selectedEquipment.equipment.equipment_template.move_speed > 0 && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-lg border-2 border-blue-500/20 hover:border-blue-500/40 transition-all hover:shadow-[0_0_10px_rgba(0,0,255,0.2)]">
                          <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">移速</div>
                          <div className="text-lg font-bold text-blue-400">
                            +{selectedEquipment.equipment.equipment_template.move_speed}
                          </div>
                        </div>
                      )}
                      
                      {/* Bullet Speed */}
                      {selectedEquipment.equipment.equipment_template.bullet_speed > 0 && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-lg border-2 border-cyan-500/20 hover:border-cyan-500/40 transition-all hover:shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                          <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">弹速</div>
                          <div className="text-lg font-bold text-cyan-400">
                            +{selectedEquipment.equipment.equipment_template.bullet_speed}
                          </div>
                        </div>
                      )}
                      
                      {/* Drain */}
                      {selectedEquipment.equipment.equipment_template.drain > 0 && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-lg border-2 border-pink-500/20 hover:border-pink-500/40 transition-all hover:shadow-[0_0_10px_rgba(255,0,255,0.2)]">
                          <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">吸血</div>
                          <div className="text-lg font-bold text-pink-400">
                            +{selectedEquipment.equipment.equipment_template.drain}
                          </div>
                        </div>
                      )}
                      
                      {/* Critical */}
                      {selectedEquipment.equipment.equipment_template.critical > 0 && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-lg border-2 border-orange-500/20 hover:border-orange-500/40 transition-all hover:shadow-[0_0_10px_rgba(255,165,0,0.2)]">
                          <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">暴击</div>
                          <div className="text-lg font-bold text-orange-400">
                            +{selectedEquipment.equipment.equipment_template.critical}
                          </div>
                        </div>
                      )}
                      
                      {/* Dodge */}
                      {selectedEquipment.equipment.equipment_template.dodge > 0 && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-lg border-2 border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-[0_0_10px_rgba(128,0,128,0.2)]">
                          <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">闪避</div>
                          <div className="text-lg font-bold text-purple-400">
                            +{selectedEquipment.equipment.equipment_template.dodge}
                          </div>
                        </div>
                      )}
                      
                      {/* Instant Kill */}
                      {selectedEquipment.equipment.equipment_template.instant_kill > 0 && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-lg border-2 border-amber-500/20 hover:border-amber-500/40 transition-all hover:shadow-[0_0_10px_rgba(255,215,0,0.2)]">
                          <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">秒杀</div>
                          <div className="text-lg font-bold text-amber-400">
                            +{selectedEquipment.equipment.equipment_template.instant_kill}
                          </div>
                        </div>
                      )}
                      
                      {/* Recovery */}
                      {selectedEquipment.equipment.equipment_template.recovery > 0 && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-lg border-2 border-teal-500/20 hover:border-teal-500/40 transition-all hover:shadow-[0_0_10px_rgba(0,128,128,0.2)]">
                          <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">恢复</div>
                          <div className="text-lg font-bold text-teal-400">
                            +{selectedEquipment.equipment.equipment_template.recovery}
                          </div>
                        </div>
                      )}
                      
                      {/* Trajectory */}
                      {selectedEquipment.equipment.equipment_template.trajectory > 0 && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-lg border-2 border-indigo-500/20 hover:border-indigo-500/40 transition-all hover:shadow-[0_0_10px_rgba(75,0,130,0.2)]">
                          <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">弹道数</div>
                          <div className="text-lg font-bold text-indigo-400">
                            +{selectedEquipment.equipment.equipment_template.trajectory}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Additional Attributes */}
                {selectedEquipment.equipment?.additional_attrs && selectedEquipment.equipment.additional_attrs.length > 0 && (
                  <div className="mt-8">
                    <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6 pb-2 border-b-2 border-purple-500/30">
                      附加属性
                    </div>
                    <div className="space-y-4">
                      {selectedEquipment.equipment.additional_attrs.map((attr: any, index: number) => {
                        const isSin = isSevenDeadlySin(attr.attr_type);
                        const textColor = isSin ? 'text-red-400' : 'text-purple-400';
                        const borderColor = isSin ? 'border-red-500/40' : 'border-purple-500/40';
                        const bgColor = isSin ? 'bg-gradient-to-r from-red-500/10 to-red-500/5' : 'bg-gradient-to-r from-purple-500/10 to-purple-500/5';
                        const glowColor = isSin ? 'rgba(255,0,0,0.3)' : 'rgba(128,0,128,0.3)';
                        
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
                          <div key={index} className={`${bgColor} p-4 rounded-lg border-2 ${borderColor} hover:shadow-[0_0_15px_${glowColor}] transition-all duration-300`}>
                            <div className="flex justify-between items-center">
                              <div className={`text-xs sm:text-sm font-bold ${textColor} uppercase tracking-wide`}>{formattedAttrName}</div>
                              <div className={`text-sm font-bold ${textColor} sm:text-lg`}>+{attr.attr_value}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Bottom Buttons */}
            <div className="mt-10 flex justify-center gap-6">
              {/* 宝物只显示出售按钮 */}
              {selectedEquipment.type === 'treasure' ? (
                <button 
                  onClick={() => {
                    if (selectedEquipment) {
                      handleSellClick(selectedEquipment);
                      closeDetails();
                    }
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 border-2 border-yellow-500/50 text-white font-bold rounded-lg shadow-lg hover:bg-gradient-to-r from-yellow-500 to-amber-500 transition-all hover:shadow-[0_0_20px_rgba(255,215,0,0.8)] hover:scale-105 active:scale-95"
                >
                  出售
                </button>
              ) : (
                /* 装备显示装备/卸下按钮 */
                <>
                  {/* Check if this equipment is already equipped */}
                  {Object.values(equippedItems).some(equipped => equipped.id === selectedEquipment?.id) ? (
                    <button 
                      onClick={() => {
                        if (selectedEquipment) {
                          unequipItem(selectedEquipment.id);
                          closeDetails();
                        }
                      }}
                      className="px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 border-2 border-red-500/50 text-white font-bold rounded-lg shadow-lg hover:bg-gradient-to-r from-red-500 to-rose-500 transition-all hover:shadow-[0_0_20px_rgba(255,0,0,0.8)] hover:scale-105 active:scale-95"
                    >
                      卸下装备
                    </button>
                  ) : (
                    <button 
                      onClick={handleEquipClick}
                      className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 border-2 border-green-500/50 text-white font-bold rounded-lg shadow-lg hover:bg-gradient-to-r from-green-500 to-emerald-500 transition-all hover:shadow-[0_0_20px_rgba(0,255,128,0.8)] hover:scale-105 active:scale-95"
                    >
                      穿戴装备
                    </button>
                  )}
                </>
              )}
              
              {/* 关闭详情按钮 */}
              <button 
                onClick={closeDetails}
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-purple-600 border-2 border-cyan-500/50 text-white font-bold rounded-lg shadow-lg hover:bg-gradient-to-r from-cyan-500 to-purple-500 transition-all hover:shadow-[0_0_20px_rgba(0,255,255,0.8)] hover:scale-105 active:scale-95"
              >
                关闭详情
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && sellItem && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
          <div className="bg-slate-800 p-6 rounded-lg border border-white/20 max-w-sm w-full mx-4">
            <div className="text-xl font-bold text-white mb-4">出售 {sellItem.name}</div>
            <div className="mb-4">
              <div className="text-slate-400 mb-2">单价: {sellItem.value} 金币</div>
              <div className="text-slate-400 mb-2">当前拥有: {sellItem.quantity || 1} 个</div>
            </div>
            
            {/* Quantity Input */}
            {sellItem.quantity && sellItem.quantity > 1 && (
              <div className="mb-6">
                <label className="text-slate-400 block mb-2">出售数量</label>
                <input
                  type="number"
                  min="1"
                  max={sellItem.quantity}
                  value={sellQuantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1 && value <= sellItem.quantity!) {
                      setSellQuantity(value);
                    }
                  }}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white"
                />
              </div>
            )}
            
            <div className="text-yellow-400 font-bold mb-6">
              总售价: {sellItem.value * sellQuantity} 金币
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => setShowSellModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white"
                disabled={isSelling}
              >
                取消
              </button>
              <button
                onClick={sellMultipleItems}
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded text-white"
                disabled={isSelling}
              >
                {isSelling ? '出售中...' : '确认出售'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed bottom-4 right-4 z-50 p-4 rounded-lg backdrop-blur-sm transition-all duration-300">
          <div className={`
            px-4 py-3 rounded-lg text-white font-medium
            ${toast.type === 'success' ? 'bg-green-500/80 border border-green-600/50' : ''}
            ${toast.type === 'error' ? 'bg-red-500/80 border border-red-600/50' : ''}
            ${toast.type === 'info' ? 'bg-blue-500/80 border border-blue-600/50' : ''}
          `}>
            {toast.message}
          </div>
        </div>
      )}

      {/* Character Attributes Modal */}
      {showAttributesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={() => setShowAttributesModal(false)}></div>
          
          <div className="relative z-10 w-80 bg-slate-900 border-2 border-slate-700 rounded-lg shadow-2xl p-6 transform transition-all scale-100">
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-2">
              <h3 className="text-amber-500 font-bold tracking-widest uppercase text-sm">角色属性详情</h3>
              <button onClick={() => setShowAttributesModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="space-y-4">
              {/* Avatar Circle */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-slate-700 overflow-hidden bg-slate-800 shadow-inner ring-2 ring-slate-800">
                  {skinData?.idle_image_urls && skinData.idle_image_urls.length > 0 ? (
                    <img 
                      src={skinData.idle_image_urls[currentIdleImageIndex]} 
                      alt="Character"
                      className="w-full h-full object-contain scale-125"
                      style={{ transform: `scale(${skinData?.scale ? (skinData.scale / 100) * 1.1 : 1.1})` }}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <span className="text-slate-500 text-xs">No image</span>
                    </div>
                  )}
                </div>
              </div>

              {isLoadingAttributes ? (
                <div className="flex justify-center items-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : attributesData ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {Object.entries(attributesData).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded border border-slate-800 hover:border-slate-600 transition-colors">
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
        </div>
      )}
  </>
);
};

<style>{`
@keyframes glow {
  0%, 100% { filter: drop-shadow(0 0 5px currentColor); }
  50% { filter: drop-shadow(0 0 15px currentColor); }
}
.animate-glow { animation: glow 2s ease-in-out infinite; }
`}</style>