
import React from 'react';
import { LootItem, Rarity } from '../types';

interface SummaryModalProps {
  type: 'success' | 'failure';
  inventory: LootItem[];
  onRestart: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({ type, inventory, onRestart }) => {
  const isSuccess = type === 'success';
  const totalValue = isSuccess ? inventory.reduce((sum, item) => sum + item.value, 0) : 0;

  const getRarityColor = (rarity: Rarity) => {
    switch (rarity) {
      case Rarity.RARE: return 'text-blue-400';
      case Rarity.EPIC: return 'text-purple-400';
      case Rarity.LEGENDARY: return 'text-amber-400';
      case Rarity.MYTHIC: return 'text-red-500';
      case Rarity.GENESIS: return 'text-pink-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-fadeIn"></div>

      <div className="relative z-10 w-full max-w-md p-8 flex flex-col items-center bg-slate-900 border-2 border-slate-700 rounded-xl shadow-2xl animate-slideUp">
        
        <div className={`
          w-20 h-20 mb-6 rounded-full flex items-center justify-center shadow-lg ring-4 
          ${isSuccess ? 'bg-gradient-to-br from-green-500 to-emerald-700 ring-green-500/30' : 'bg-gradient-to-br from-red-500 to-rose-700 ring-red-500/30'}
        `}>
           {isSuccess ? (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
             </svg>
           ) : (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
             </svg>
           )}
        </div>

        <h2 className={`
          text-3xl font-bold mb-2 font-serif uppercase tracking-widest drop-shadow-sm
          ${isSuccess ? 'text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600' : 'text-red-500'}
        `}>
          {isSuccess ? '撤离成功' : '撤离失败'}
        </h2>
        <p className="text-slate-400 font-mono text-xs mb-8 tracking-wider">
          {isSuccess ? 'SECURE EXTRACTION COMPLETE' : 'CRITICAL MISSION FAILURE'}
        </p>

        <div className="w-full bg-slate-950/50 rounded-lg border border-slate-800 p-4 mb-6">
           <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-500 uppercase">总价值</span>
              <span className={`text-xl font-bold font-mono ${isSuccess ? 'text-amber-400' : 'text-slate-600'}`}>
                {totalValue.toLocaleString()} G
              </span>
           </div>
           
           <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
             {!isSuccess || inventory.length === 0 ? (
               <div className="text-center text-xs text-slate-600 italic py-2">
                 {isSuccess ? '本次未收集到宝物' : '宝物已全部丢失'}
               </div>
             ) : (
               inventory.map((item, idx) => (
                 <div key={idx} className="flex justify-between items-center text-xs">
                    <span className={`font-medium ${getRarityColor(item.rarity)}`}>{item.name}</span>
                    <span className="text-slate-500">{item.value} G</span>
                 </div>
               ))
             )}
           </div>
        </div>

        <button 
          onClick={onRestart}
          className={`
            w-full py-3 font-bold rounded shadow-lg transition-transform hover:scale-105 active:scale-95 tracking-wide text-sm text-white
            ${isSuccess ? 'bg-amber-600 hover:bg-amber-500' : 'bg-red-600 hover:bg-red-500'}
          `}
        >
          {isSuccess ? '返回主页' : '返回主页'}
        </button>
      </div>

      <style>{`
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};
