import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';

// 宝物类型定义
interface Treasure {
  id: number;
  name: string;
  image_url: string;
  value: number;
  level: number;
  is_active: boolean;
  description: string;
  created_at: number;
  updated_at: number;
  quantity: number; // 宝物数量
}

// 选择的宝物类型定义
interface SelectedTreasure {
  id: number;
  quantity: number;
  name: string;
  image_url: string;
}

// 合成结果类型定义
interface ForgeResult {
  cost_gold: number;
  current_gold: number;
  equipment_level: number;
  message: string;
  selected_treasure_index: number;
  used_treasures: Treasure[];
  user_equipment: {
    id: number;
    user_id: number;
    equipment_id: number;
    is_equipped: boolean;
    position: string;
    enhance_level: number;
    created_at: number;
    updated_at: number;
    equipment_template: {
      id: number;
      name: string;
      level: number;
      slot: string;
      hp: number;
      attack: number;
      attack_speed: number;
      move_speed: number;
      bullet_speed: number;
      drain: number;
      critical: number;
      dodge: number;
      instant_kill: number;
      recovery: number;
      trajectory: number;
      image_url: string;
      description: string;
      is_active: boolean;
      created_at: number;
      updated_at: number;
    };
    additional_attrs: {
      id: number;
      user_equipment_id: number;
      attr_type: string;
      attr_name: string;
      attr_value: string;
      created_at: number;
      updated_at: number;
    }[];
  };
}

// Forge组件属性类型
interface ForgeComponentProps {
  isOpen: boolean;
  onClose: () => void;
  onGoldUpdate: (newGold: number) => void;
}

const ForgeComponent: React.FC<ForgeComponentProps> = ({ isOpen, onClose, onGoldUpdate }) => {
  // 状态定义
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [selectedTreasures, setSelectedTreasures] = useState<(SelectedTreasure | null)[]>([null, null, null]);
  const [showTreasureSelect, setShowTreasureSelect] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [forging, setForging] = useState(false);
  const [forgeResult, setForgeResult] = useState<ForgeResult | null>(null);

  // 获取宝物列表
  const fetchTreasures = async () => {
    try {
      setLoading(true);
      const token = authService.getAuthToken();
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://8.130.43.130:10005';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/my-items?position=backpack`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // 检查响应状态码
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // 过滤出宝物类型的物品，注意API返回的结构是data.data直接是数组
        const treasureItems = data.data.filter((item: any) => item.type === 'treasure').map((item: any) => ({
          ...item,
          // 确保image_url没有反引号和多余空格
          image_url: item.treasure?.image_url?.trim()?.replace(/^`|`$/g, '') || '',
          // 从item中获取quantity属性
          quantity: item.quantity || 1
        }));
        setTreasures(treasureItems);
      } else {
        throw new Error(`API返回错误: ${data.message}`);
      }
    } catch (error) {
      console.error('获取宝物列表失败:', error);
      // 显示错误信息
      alert('获取宝物列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 当弹窗打开时，获取宝物列表
  useEffect(() => {
    if (isOpen) {
      fetchTreasures();
    }
  }, [isOpen]);

  // 过滤可用的宝物（排除已选择的数量）
  const getAvailableTreasures = (index: number) => {
    // 如果treasures数组为空，直接返回空数组
    if (!treasures || treasures.length === 0) {
      return [];
    }

    return treasures.map(treasure => {
      // 计算已选择的数量
      const selectedQuantity = selectedTreasures.reduce((total, selected, i) => {
        if (i !== index && selected && selected.id === treasure.id) {
          return total + selected.quantity;
        }
        return total;
      }, 0);

      // 计算剩余可选择的数量
      const availableQuantity = treasure.quantity - selectedQuantity;
      
      // 如果没有可用数量，不返回该宝物
      if (availableQuantity <= 0) {
        return null;
      }

      return {
        ...treasure,
        quantity: availableQuantity
      };
    }).filter(Boolean) as Treasure[];
  };

  // 选择宝物
  const handleSelectTreasure = (index: number, treasure: Treasure) => {
    const newSelectedTreasures = [...selectedTreasures];
    newSelectedTreasures[index] = {
      id: treasure.id,
      quantity: 1, // 每次选择1个
      name: treasure.name,
      image_url: treasure.image_url
    };
    setSelectedTreasures(newSelectedTreasures);
    setShowTreasureSelect(null);
  };

  // 清除选择的宝物
  const handleClearTreasure = (index: number) => {
    const newSelectedTreasures = [...selectedTreasures];
    newSelectedTreasures[index] = null;
    setSelectedTreasures(newSelectedTreasures);
  };

  // 检查是否可以合成
  const canForge = () => {
    return selectedTreasures.every(treasure => treasure !== null);
  };

  // 合成宝物
  const handleForge = async () => {
    try {
      if (!canForge()) return;
      
      setForging(true);
      const token = authService.getAuthToken();
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://8.130.43.130:10005';
      
      // 准备请求参数
      const itemIds = selectedTreasures.map(treasure => treasure!.id);
      
      const response = await fetch(`${apiBaseUrl}/api/v1/equipments/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemids: itemIds }),
      });

      const data = await response.json();
      
      if (data.success) {
        setForgeResult(data.data);
        // 更新用户金币
        onGoldUpdate(data.data.current_gold);
        // 清空选择的宝物
        setSelectedTreasures([null, null, null]);
        // 重新获取宝物列表
        fetchTreasures();
      }
    } catch (error) {
      console.error('合成失败:', error);
    } finally {
      setForging(false);
    }
  };

  // 关闭合成结果
  const handleCloseResult = () => {
    setForgeResult(null);
  };

  // 获取装备等级对应的颜色
  const getEquipmentColor = (level: number) => {
    if (level <= 2) return 'text-white';
    if (level === 3) return 'text-blue-400';
    if (level === 4) return 'text-purple-400';
    return 'text-yellow-400';
  };

  // 获取装备等级对应的光效
  const getEquipmentGlow = (level: number) => {
    if (level <= 2) return 'shadow-[0_0_20px_rgba(255,255,255,0.5)]';
    if (level === 3) return 'shadow-[0_0_20px_rgba(59,130,246,0.7)]';
    if (level === 4) return 'shadow-[0_0_20px_rgba(168,85,247,0.7)]';
    return 'shadow-[0_0_20px_rgba(234,179,8,0.7)]';
  };

  // 如果弹窗未打开，不渲染
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border-2 border-cyan-500 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.3)] overflow-hidden">
        {/* 弹窗头部 */}
        <div className="flex justify-between items-center bg-slate-800 p-4">
          <h2 className="text-xl text-cyan-400 font-['Press_Start_2P']">合成装备</h2>
          <button onClick={onClose} className="text-red-500 hover:text-white font-mono text-xl">[X]</button>
        </div>

        {/* 弹窗内容 */}
        <div className="p-6 bg-[#0a0a0c]">
          {/* 三个选择框 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {selectedTreasures.map((treasure, index) => (
              <div key={index} className="relative">
                {treasure ? (
                  // 已选择宝物
                  <div className="flex flex-col items-center gap-2 p-3 bg-slate-800 border border-cyan-500 rounded-lg">
                    <img src={treasure.image_url} alt={treasure.name} className="w-16 h-16 object-cover rounded" />
                    <div className="text-xs text-cyan-400 font-bold">{treasure.name}</div>
                    <button
                      onClick={() => handleClearTreasure(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  // 选择框
                  <button
                    onClick={() => setShowTreasureSelect(index)}
                    className="w-full h-32 bg-slate-800 border-2 border-dashed border-cyan-500 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
                  >
                    <span className="text-cyan-400 text-lg">+</span>
                    <span className="text-xs text-cyan-300">选择宝物</span>
                  </button>
                )}

                {/* 宝物选择下拉框 */}
                {showTreasureSelect === index && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-slate-800 border border-cyan-500 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.5)] max-h-60 overflow-y-auto z-10">
                    {loading ? (
                      <div className="p-4 text-center text-cyan-400">加载中...</div>
                    ) : getAvailableTreasures(index).length === 0 ? (
                      <div className="p-4 text-center text-slate-400">没有可用的宝物</div>
                    ) : (
                      getAvailableTreasures(index).map((availableTreasure) => (
                        <button
                          key={availableTreasure.id}
                          onClick={() => handleSelectTreasure(index, availableTreasure)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-slate-700 transition-colors text-left"
                        >
                          <img src={availableTreasure.image_url} alt={availableTreasure.name} className="w-10 h-10 object-cover rounded" />
                          <div className="flex flex-col">
                            <div className="text-xs text-cyan-400 font-bold">{availableTreasure.name}</div>
                            <div className="text-xs text-slate-400">数量: {availableTreasure.quantity}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 合成按钮 */}
          <button
            onClick={handleForge}
            disabled={!canForge() || forging}
            className={`
              w-full py-3 rounded-lg font-bold tracking-widest transition-all
              ${canForge() ? 'bg-gradient-to-r from-cyan-600 to-cyan-800 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'bg-slate-700 cursor-not-allowed'}
              ${forging ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {forging ? '合成中...' : '合成(50000)'}
          </button>
        </div>
      </div>

      {/* 合成结果弹窗 */}
      {forgeResult && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border-2 border-cyan-500 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.3)] overflow-hidden">
            {/* 结果头部 */}
            <div className="flex justify-between items-center bg-slate-800 p-4">
              <h2 className="text-xl text-cyan-400 font-['Press_Start_2P']">合成结果</h2>
              <button onClick={handleCloseResult} className="text-red-500 hover:text-white font-mono text-xl">[X]</button>
            </div>

            {/* 结果内容 */}
            <div className="p-6 bg-[#0a0a0c]">
              <div className="text-center mb-6">
                <div className="text-lg text-green-400 font-bold mb-2">{forgeResult.message}</div>
                <div className="text-sm text-slate-400">消耗金币: {forgeResult.cost_gold}</div>
                <div className="text-sm text-slate-400">剩余金币: {forgeResult.current_gold}</div>
              </div>

              {/* 合成的装备 */}
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className={`
                  p-4 bg-slate-800 border-2 border-cyan-500 rounded-lg
                  ${getEquipmentGlow(forgeResult.equipment_level)}
                `}>
                  <img 
                    src={forgeResult.user_equipment.equipment_template.image_url} 
                    alt={forgeResult.user_equipment.equipment_template.name} 
                    className="w-32 h-32 object-cover rounded"
                  />
                </div>
                <div className={`text-xl font-bold ${getEquipmentColor(forgeResult.equipment_level)}`}>
                  {forgeResult.user_equipment.equipment_template.name}
                </div>
                <div className="text-sm text-slate-400">等级: {forgeResult.equipment_level}</div>
                <div className="text-sm text-slate-400">类型: {forgeResult.user_equipment.equipment_template.slot}</div>
              </div>

              {/* 装备属性 */}
              <div className="space-y-2 mb-6">
                <div className="text-sm text-cyan-400 font-bold mb-2">装备属性</div>
                <div className="grid grid-cols-2 gap-2">
                  {forgeResult.user_equipment.equipment_template.attack > 0 && (
                    <div className="flex justify-between p-2 bg-slate-800 rounded">
                      <span className="text-xs text-slate-400">攻击</span>
                      <span className="text-xs text-red-400">+{forgeResult.user_equipment.equipment_template.attack}</span>
                    </div>
                  )}
                  {forgeResult.user_equipment.equipment_template.hp > 0 && (
                    <div className="flex justify-between p-2 bg-slate-800 rounded">
                      <span className="text-xs text-slate-400">生命值</span>
                      <span className="text-xs text-green-400">+{forgeResult.user_equipment.equipment_template.hp}</span>
                    </div>
                  )}
                  {forgeResult.user_equipment.equipment_template.attack_speed > 0 && (
                    <div className="flex justify-between p-2 bg-slate-800 rounded">
                      <span className="text-xs text-slate-400">攻击速度</span>
                      <span className="text-xs text-yellow-400">+{forgeResult.user_equipment.equipment_template.attack_speed}</span>
                    </div>
                  )}
                  {forgeResult.user_equipment.equipment_template.critical > 0 && (
                    <div className="flex justify-between p-2 bg-slate-800 rounded">
                      <span className="text-xs text-slate-400">暴击</span>
                      <span className="text-xs text-purple-400">+{forgeResult.user_equipment.equipment_template.critical}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={handleCloseResult}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-800 rounded-lg text-cyan-400 font-bold tracking-widest hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 动画效果 - 宝物融合 */}
      {forging && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/90">
          <div className="relative w-64 h-64">
            {/* 三个宝物旋转融合 */}
            {selectedTreasures.map((treasure, index) => {
              if (!treasure) return null;
              return (
                <div
                  key={index}
                  className="absolute w-24 h-24 animate-rotate"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) rotate(${index * 120}deg) translateX(60px) rotate(${-index * 120}deg)`,
                    animationDelay: `${index * 0.2}s`
                  }}
                >
                  <img src={treasure.image_url} alt={treasure.name} className="w-full h-full object-cover rounded-full" />
                </div>
              );
            })}
            {/* 融合光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-yellow-500 rounded-full animate-pulse opacity-50"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgeComponent;