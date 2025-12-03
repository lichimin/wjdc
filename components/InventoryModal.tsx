import React from 'react';
import { LootItem, Rarity } from '../types';

interface InventoryModalProps {
  items: LootItem[];
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ items, onClose }) => {
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

  const totalValue = items.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
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

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
              <div className="w-16 h-16 border-2 border-slate-800 border-dashed rounded-lg"></div>
              <p className="font-mono text-sm">NO ITEMS COLLECTED</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((item) => {
                 const rarityClass = getRarityStyle(item.rarity);
                 const isGenesis = item.rarity === Rarity.GENESIS;

                 return (
                   <div key={item.id} className="group relative bg-slate-950 p-2 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors">
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
  );
};