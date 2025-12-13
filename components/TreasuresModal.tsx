import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface Treasure {
  id: number;
  my_item_id: number;
  name: string;
  image_url: string;
  level: number;
  value: number;
  quantity: number;
  description?: string; // 可选字段，接口可能不返回
}

interface SellResponse {
  success?: boolean;
  message?: string;
  data: {
    message?: string;
    total_price: number;
    current_gold: number;
    sold_count: number;
    sold_items: Array<{
      id: number;
      item_name: string;
      item_value: number;
      sell_quantity: number;
      sold_price: number;
    }>;
  };
}

interface TreasuresModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TreasuresModal: React.FC<TreasuresModalProps> = ({ isOpen, onClose }) => {
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [selectedTreasures, setSelectedTreasures] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSellConfirmation, setShowSellConfirmation] = useState(false);

  // Fetch treasures when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTreasures();
    }
  }, [isOpen]);

  // Fetch treasures from API
  const fetchTreasures = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error('未登录或登录已过期');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/my-items/treasures`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取宝物列表失败');
      }

      const result = await response.json();
      if (result.success) {
        // 处理图片URL中可能包含的额外引号
        const processedTreasures = result.data.map((treasure: Treasure) => ({
          ...treasure,
          image_url: treasure.image_url.replace(/^`|`$/g, ''), // 移除可能的反引号
          description: treasure.description || `${treasure.name} - 等级 ${treasure.level}` // 提供默认描述
        }));
        setTreasures(processedTreasures);
      } else {
        throw new Error(result.message || '获取宝物列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取宝物列表失败');
    } finally {
      setLoading(false);
    }
  };

  // Handle treasure selection
  const handleTreasureSelect = (treasureId: number, quantity: number = 1) => {
    setSelectedTreasures(prev => {
      const newMap = new Map(prev);
      const currentQuantity = newMap.get(treasureId) || 0;
      const newQuantity = currentQuantity + quantity;
      
      // Get the treasure to check max quantity
      const treasure = treasures.find(t => t.my_item_id === treasureId);
      if (!treasure) return newMap;
      
      // Don't exceed available quantity
      const finalQuantity = Math.min(newQuantity, treasure.quantity);
      
      if (finalQuantity <= 0) {
        newMap.delete(treasureId);
      } else {
        newMap.set(treasureId, finalQuantity);
      }
      
      return newMap;
    });
  };

  // Handle quantity change for selected treasure
  const handleQuantityChange = (treasureId: number, newQuantity: number) => {
    setSelectedTreasures(prev => {
      const newMap = new Map(prev);
      // Ensure quantity is between 1 and available quantity
      const treasure = treasures.find(t => t.my_item_id === treasureId);
      if (!treasure) return newMap;
      
      const validQuantity = Math.max(1, Math.min(newQuantity, treasure.quantity));
      newMap.set(treasureId, validQuantity);
      return newMap;
    });
  };

  // Handle sell confirmation
  const handleSellConfirmation = () => {
    if (selectedTreasures.size === 0) {
      setError('请选择要出售的宝物');
      return;
    }
    setShowSellConfirmation(true);
  };

  // Handle sell treasures
  const handleSellTreasures = async () => {
    if (selectedTreasures.size === 0) {
      setError('请选择要出售的宝物');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error('未登录或登录已过期');
      }

      // Prepare request data
      const items = Array.from(selectedTreasures.entries()).map(([my_item_id, quantity]) => ({
        my_item_id,
        quantity
      }));

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/my-items/sell-multiple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items })
      });

      if (!response.ok) {
        throw new Error('出售宝物失败');
      }

      const result: SellResponse = await response.json();
      if (result.success || result.data) {
        // Refresh treasures list
        fetchTreasures();
        // Clear selection
        setSelectedTreasures(new Map());
        setShowSellConfirmation(false);
      } else {
        throw new Error(result.message || '出售宝物失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '出售宝物失败');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total sell price
  const calculateTotalPrice = () => {
    let total = 0;
    selectedTreasures.forEach((quantity, my_item_id) => {
      const treasure = treasures.find(t => t.my_item_id === my_item_id);
      if (treasure) {
        total += treasure.value * quantity;
      }
    });
    return total;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-none border-b-2 border-slate-700/50 shadow-[0_0_30px_rgba(0,255,255,0.5)] w-full h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4 border-b-2 border-cyan-500/50 flex justify-between items-center">
          <h2 className="text-white text-xl font-bold">我的宝物</h2>
          <button 
            className="text-white hover:text-cyan-300 text-2xl font-bold transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 mb-4 text-red-300">
              {error}
        </div>
      )}

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-slate-300">加载中...</span>
            </div>
          ) : treasures.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              暂无宝物
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {treasures.map(treasure => {
                const isSelected = selectedTreasures.has(treasure.my_item_id);
                const selectedQuantity = selectedTreasures.get(treasure.my_item_id) || 0;
                
                return (
                  <div 
                    key={treasure.my_item_id} 
                    className={`bg-slate-800 border rounded-lg p-2 sm:p-3 cursor-pointer transition-all hover:scale-105 group ${isSelected ? 'border-cyan-500 bg-cyan-900/20' : 'border-slate-700'}`}
                    onClick={() => handleTreasureSelect(treasure.my_item_id)}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-cyan-500 text-white text-xs px-1 py-0.5 rounded-full">
                        {selectedQuantity}
                      </div>
                    )}
                    
                    <div className="aspect-square flex items-center justify-center bg-slate-900 rounded border border-slate-700 overflow-hidden mb-1 relative">
                      {treasure.image_url ? (
                        <img 
                          src={treasure.image_url} 
                          alt={treasure.name} 
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjAiIGZpbGw9IiM1MjU1NTIiLz4KPHBhdGggZD0iTTI1IDUwQzEzLjk1NDcgNTAgNSAzMS4wNDUzIDUgMjFDNSA4Ljk1NDY1IDEzLjk1NDcgMCAyNSAwQzM2LjA0NTMgMCA0NSA4Ljk1NDY1IDQ1IDIxQzQ1IDMxLjA0NTMgMzYuMDQ1MyA1MCAyNSA1MFoiIGZpbGw9IiM3Nzc3NzciLz4KPHBhdGggZD0iTTI1IDM1QzMyLjc2MTQgMzUgMzkgMjguNzYxNCAzOSAyMUMzOSAxMy4yMzkxIDMyLjc2MTQgNyAyNSA3QzE3LjIzODYgNyAxMSAxMy4yMzkxIDExIDIxQzExIDI4Ljc2MTQgMTcuMjM4NiAzNSAyNSAzNVoiIGZpbGw9IiNmZjMzMDAiIGZpbGwtb3BhY2l0eT0iMC41Ii8+Cjwvc3ZnPg==';
                            target.alt = '宝物图标';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-700 rounded flex items-center justify-center">
                          <span className="text-slate-400">宝物</span>
                        </div>
                      )}
                      
                      {/* 数量显示 */}
                      <div className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 rounded-tl">
                        {treasure.quantity}
                      </div>
                    </div>
                    
                    <h3 className="text-white font-bold text-center text-xs sm:text-sm line-clamp-1">{treasure.name}</h3>
                    
                    {/* Quantity controls (only show if selected) */}
                    {isSelected && (
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <button 
                          className="w-5 h-5 bg-slate-700 rounded text-white hover:bg-slate-600 transition-colors active:scale-95 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTreasureSelect(treasure.my_item_id, -1);
                          }}
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          min="1" 
                          max={treasure.quantity} 
                          value={selectedQuantity} 
                          onChange={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(treasure.my_item_id, parseInt(e.target.value) || 1);
                          }}
                          className="w-8 h-5 bg-slate-700 border border-slate-600 rounded text-white text-center text-xs"
                          inputMode="numeric"
                        />
                        <button 
                          className="w-5 h-5 bg-slate-700 rounded text-white hover:bg-slate-600 transition-colors active:scale-95 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTreasureSelect(treasure.my_item_id, 1);
                          }}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with sell button */}
        {selectedTreasures.size > 0 && (
          <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white">已选择: {selectedTreasures.size} 个宝物</span>
              <span className="text-yellow-400 font-bold">总价值: {calculateTotalPrice()} 金币</span>
            </div>
            <button 
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-3 px-4 rounded-lg font-bold hover:from-yellow-700 hover:to-orange-700 transition-all shadow-[0_0_10px_rgba(234,179,8,0.5)]"
              onClick={handleSellConfirmation}
            >
              出售选中的宝物
            </button>
          </div>
        )}
      </div>

      {/* Sell Confirmation Modal */}
      {showSellConfirmation && (
        <div className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-white text-xl font-bold mb-4">确认出售</h3>
            <p className="text-slate-300 mb-6">
              您确定要出售选中的 {selectedTreasures.size} 个宝物吗？
              总价值：<span className="text-yellow-400 font-bold">{calculateTotalPrice()} 金币</span>
            </p>
            <div className="flex gap-4">
              <button 
                className="flex-1 bg-slate-700 text-white py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors"
                onClick={() => setShowSellConfirmation(false)}
              >
                取消
              </button>
              <button 
                className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-2 px-4 rounded-lg font-bold hover:from-yellow-700 hover:to-orange-700 transition-all"
                onClick={handleSellTreasures}
              >
                确认出售
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
