import React, { useState, useEffect } from 'react';
import { LootItem, Rarity } from '../types';

interface AdventureInventoryModalProps {
  items: LootItem[];
  onClose: () => void;
}

export const AdventureInventoryModal: React.FC<AdventureInventoryModalProps> = ({ items, onClose }) => {
  const [selectedItem, setSelectedItem] = useState<LootItem | null>(null);

  // 关闭详情面板
  const closeDetails = () => {
    setSelectedItem(null);
  };

  // 获取稀有度样式
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

  // 计算总价值
  const totalValue = items.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-cyan-800 rounded-lg shadow-[0_0_20px_rgba(139,92,246,0.5)] w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b-2 border-cyan-800 bg-slate-950">
          <h2 className="text-2xl font-bold text-cyan-300">冒险背包</h2>
          <div className="text-sm text-cyan-200">
            <span className="mr-4">物品数量: {items.length}</span>
            <span>总价值: {totalValue} 金币</span>
          </div>
          <button
            onClick={onClose}
            className="text-cyan-300 hover:text-cyan-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Inventory Grid */}
          <div className="w-3/4 p-4 overflow-y-auto">
            <div className="grid grid-cols-5 gap-3">
              {items.map((item, index) => (
                <div
                  key={`${item.id || index}-${index}`}
                  className={`bg-slate-800 border rounded-lg p-2 cursor-pointer transition-all hover:scale-105 group relative ${getRarityStyle(item.rarity)}`}
                  onClick={() => setSelectedItem(item)}
                >
                  {/* Item Image */}
                  <div className="h-16 w-16 mx-auto mb-2 overflow-hidden rounded bg-slate-900">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    )}
                    <div className="hidden h-full w-full flex items-center justify-center text-slate-500">
                      {item.name}
                    </div>
                  </div>

                  {/* Item Name */}
                  <div className="text-xs text-center truncate mb-1">{item.name}</div>

                  {/* Item Quantity */}
                  {item.quantity && item.quantity > 1 && (
                    <div className="absolute top-1 left-1 bg-cyan-900 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {item.quantity}
                    </div>
                  )}

                  {/* Value Badge */}
                  <div className="text-xs text-center text-cyan-400">
                    {item.value} 金币
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Item Details */}
          {selectedItem && (
            <div className="w-1/4 p-4 border-l-2 border-cyan-800 bg-slate-950 overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className={`text-lg font-bold ${getRarityStyle(selectedItem.rarity)}`}>
                  {selectedItem.name}
                </h3>
                <button
                  onClick={closeDetails}
                  className="text-cyan-300 hover:text-cyan-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Item Image */}
              <div className="h-32 w-32 mx-auto mb-4 overflow-hidden rounded bg-slate-900">
                {selectedItem.imageUrl && (
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                )}
                <div className="hidden h-full w-full flex items-center justify-center text-slate-500">
                  {selectedItem.name}
                </div>
              </div>

              {/* Item Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">稀有度:</span>
                  <span className={getRarityStyle(selectedItem.rarity)}>
                    {selectedItem.rarity === Rarity.COMMON && '普通'}
                    {selectedItem.rarity === Rarity.RARE && '稀有'}
                    {selectedItem.rarity === Rarity.EPIC && '史诗'}
                    {selectedItem.rarity === Rarity.LEGENDARY && '传说'}
                    {selectedItem.rarity === Rarity.MYTHIC && '神话'}
                    {selectedItem.rarity === Rarity.GENESIS && '创世'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">类型:</span>
                  <span className="text-cyan-300">{selectedItem.type || '未知'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">价值:</span>
                  <span className="text-yellow-300">{selectedItem.value} 金币</span>
                </div>

                {selectedItem.quantity && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">数量:</span>
                    <span className="text-green-300">{selectedItem.quantity}</span>
                  </div>
                )}

                {/* Additional Details */}
                {selectedItem.equipment && (
                  <div className="mt-4 p-3 bg-slate-800 rounded border border-cyan-900">
                    <h4 className="text-sm font-bold text-cyan-300 mb-2">装备属性</h4>
                    <div className="space-y-1">
                      {selectedItem.equipment.attack && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">攻击力:</span>
                          <span className="text-red-300">+{selectedItem.equipment.attack}</span>
                        </div>
                      )}
                      {selectedItem.equipment.defense && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">防御力:</span>
                          <span className="text-blue-300">+{selectedItem.equipment.defense}</span>
                        </div>
                      )}
                      {selectedItem.equipment.health && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">生命值:</span>
                          <span className="text-green-300">+{selectedItem.equipment.health}</span>
                        </div>
                      )}
                      {selectedItem.equipment.speed && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">移动速度:</span>
                          <span className="text-purple-300">+{selectedItem.equipment.speed}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedItem.description && (
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-cyan-300 mb-2">描述</h4>
                    <p className="text-xs text-slate-300">{selectedItem.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
