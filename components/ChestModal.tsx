import React, { useEffect, useState } from 'react';
import { LootItem, Rarity } from '../types';

interface ChestModalProps {
  loot: LootItem[];
  onConfirm: (selectedItems: LootItem[]) => void;
}

const PHASE_BG_SETUP = 0;
const PHASE_SCANNING = 1;
const PHASE_SELECTION = 2;

const SCAN_DURATION = 650; // ms per item

export const ChestModal: React.FC<ChestModalProps> = ({ loot, onConfirm }) => {
  const [phase, setPhase] = useState(PHASE_BG_SETUP);
  const [scanIndex, setScanIndex] = useState(-1);
  const [revealedCount, setRevealedCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Trigger Scanning Sequence
  useEffect(() => {
    // Start scanning shortly after mount
    const startTimeout = setTimeout(() => {
      setPhase(PHASE_SCANNING);
      setScanIndex(0);
    }, 500);
    return () => clearTimeout(startTimeout);
  }, []);

  // Handle Scanning Loop
  useEffect(() => {
    if (phase === PHASE_SCANNING && scanIndex >= 0 && scanIndex < loot.length) {
      const timer = setTimeout(() => {
        setRevealedCount(prev => prev + 1);
        
        if (scanIndex < loot.length - 1) {
          setScanIndex(prev => prev + 1);
        } else {
          // Finished scanning
          setTimeout(() => {
             setPhase(PHASE_SELECTION);
             setScanIndex(-1); // Hide glass
          }, 500);
        }
      }, SCAN_DURATION);
      
      return () => clearTimeout(timer);
    }
  }, [phase, scanIndex, loot.length]);

  const toggleSelect = (id: string) => {
    if (phase !== PHASE_SELECTION) return;
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleConfirm = () => {
    const selectedItems = loot.filter(item => selectedIds.has(item.id));
    onConfirm(selectedItems);
  };

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

  const getRarityLabel = (rarity: Rarity) => {
    switch (rarity) {
      case Rarity.GENESIS: return 'bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-yellow-500 font-extrabold';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fadeIn"></div>

      <div className="relative z-10 w-full max-w-4xl p-4 flex flex-col items-center">
        
        {/* Title */}
        <div className={`mb-8 transition-opacity duration-1000 ${phase >= PHASE_SCANNING ? 'opacity-100' : 'opacity-0'}`}>
          <h2 className="text-3xl font-bold text-amber-500 tracking-[0.2em] font-serif uppercase drop-shadow-[0_2px_10px_rgba(245,158,11,0.8)]">
            Treasure Found
          </h2>
        </div>

        {/* Grid Container */}
        <div className={`
          grid gap-4 transition-all duration-500
          ${loot.length <= 5 ? 'grid-flow-col auto-cols-max' : 'grid-cols-4 md:grid-cols-5'}
        `}>
          {loot.map((item, index) => {
             const isRevealed = index < revealedCount;
             const isScanning = index === scanIndex;
             const rarityClass = getRarityStyle(item.rarity);
             const isGenesis = item.rarity === Rarity.GENESIS;
             const isSelected = selectedIds.has(item.id);

             return (
               <div 
                  key={item.id} 
                  className={`relative group perspective ${phase === PHASE_SELECTION ? 'cursor-pointer' : ''}`}
                  onClick={() => toggleSelect(item.id)}
               >
                 
                 {/* Slot Placeholder (Black Box) */}
                 <div className={`
                    w-24 h-28 bg-black border-2 rounded-lg flex items-center justify-center relative overflow-hidden transition-all duration-300 transform
                    ${isSelected ? 'border-green-500 ring-2 ring-green-500/50 scale-105 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'border-slate-800'}
                 `}>
                    
                    {/* Selected Checkmark Indicator */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 z-20 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Inner Content (Revealed) */}
                    <div className={`
                       absolute inset-0 flex flex-col items-center justify-center p-2 text-center transition-all duration-500 bg-slate-900
                       ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
                       ${isGenesis ? '' : `border-2 ${rarityClass}`}
                       ${isGenesis ? 'm-[2px] rounded-md' : 'rounded-lg'}
                    `}>
                        {/* Icon */}
                        <div 
                          className="w-8 h-8 mb-2 rounded shadow-inner"
                          style={{ backgroundColor: item.iconColor }}
                        ></div>
                        
                        {/* Name */}
                        <div className={`text-[9px] font-bold leading-tight mb-1 ${getRarityLabel(item.rarity)}`}>
                          {item.name}
                        </div>
                        
                        {/* Value */}
                        <div className="text-[8px] text-slate-400 font-mono">
                          {item.value} G
                        </div>
                    </div>
                 </div>

                 {/* MAGNIFYING GLASS OVERLAY */}
                 {isScanning && (
                   <div className="absolute -top-4 -left-4 w-32 h-32 pointer-events-none z-20 animate-scan-horizontal">
                      {/* Glass Body */}
                      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                        {/* Handle */}
                        <path d="M65 65 L90 90" stroke="#5d4037" strokeWidth="8" strokeLinecap="round" />
                        {/* Rim */}
                        <circle cx="45" cy="45" r="25" fill="rgba(255,255,255,0.1)" stroke="#d4af37" strokeWidth="4" />
                        {/* Reflection */}
                        <path d="M30 35 Q 45 20 60 35" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      {/* Light Cone */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-amber-100/10 rounded-full blur-xl"></div>
                   </div>
                 )}
               </div>
             );
          })}
        </div>

        {/* Action Buttons */}
        <div className={`
           mt-12 flex gap-4 transition-all duration-500
           ${phase === PHASE_SELECTION ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}
        `}>
           <button 
             onClick={() => {
               if (selectedIds.size === loot.length) setSelectedIds(new Set());
               else setSelectedIds(new Set(loot.map(i => i.id)));
             }}
             className="px-6 py-2 rounded bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 font-mono text-sm"
           >
             {selectedIds.size === loot.length ? 'DESELECT ALL' : 'SELECT ALL'}
           </button>
           
           <button 
             onClick={handleConfirm}
             className="px-8 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-transform hover:scale-105 active:scale-95"
           >
             CONFIRM ({selectedIds.size})
           </button>
        </div>

      </div>

      <style>{`
        @keyframes scan-horizontal {
          0% { transform: translateX(-20px) rotate(-10deg); }
          50% { transform: translateX(20px) rotate(10deg); }
          100% { transform: translateX(-20px) rotate(-10deg); }
        }
        .animate-scan-horizontal {
          animation: scan-horizontal 0.65s ease-in-out infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};