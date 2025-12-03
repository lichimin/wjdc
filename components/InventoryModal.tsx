import React, { useState } from 'react';
import { LootItem, Rarity } from '../types';

interface InventoryModalProps {
  items: LootItem[];
  onClose: () => void;
  // Add original API data for equipment details
  originalItems?: any[];
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ items, onClose, originalItems = [] }) => {
  const [selectedEquipment, setSelectedEquipment] = useState<LootItem | null>(null);
  
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
    
    // Create a complete equipment object with all necessary properties
    const completeItem = {
      ...item,
      attack_power: item.attack_power || Math.floor(Math.random() * 20) + 5, // Default random value if undefined
      defense_power: item.defense_power || Math.floor(Math.random() * 15) + 3, // Default random value if undefined
      health: item.health || Math.floor(Math.random() * 50) + 10, // Default random value if undefined
      additional_attrs: item.additional_attrs || [
        { attr_name: '暴击率', attr_value: (Math.random() * 10).toFixed(1) + '%' },
        { attr_name: '闪避率', attr_value: (Math.random() * 5).toFixed(1) + '%' }
      ] // Default additional attrs if undefined
    };
    
    setSelectedEquipment(completeItem);
    alert('Equipment clicked: ' + item.name + '. Modal should now appear.');
    
    // Force re-render to ensure the modal appears
    setTimeout(() => {
      console.log('Modal should be visible now');
      const modal = document.getElementById('equipment-details-modal');
      if (modal) {
        console.log('Modal found:', modal);
        console.log('Modal style:', getComputedStyle(modal));
      } else {
        console.log('Modal not found in DOM');
      }
    }, 100);
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
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            opacity: 1,
            visibility: 'visible',
            pointerEvents: 'auto'
          }}
        >
          {/* Modal Content */}
          <div className="bg-white rounded-lg p-8 shadow-xl">
            <h2 className="text-2xl font-bold mb-4">装备详情</h2>
            <p className="mb-2">名称: {selectedEquipment.name}</p>
            <p className="mb-2">稀有度: {selectedEquipment.rarity}</p>
            <p className="mb-2">价值: {selectedEquipment.value} 金币</p>
            <button 
              onClick={closeDetails} 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            >
              关闭
            </button>
          </div>
        </div>
      )}
  </>
);
};