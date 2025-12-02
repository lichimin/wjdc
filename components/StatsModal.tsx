import React from 'react';
import { PlayerState } from '../types';

interface StatsModalProps {
  playerState: PlayerState;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ playerState, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={onClose}></div>
      
      <div className="relative z-10 w-80 bg-slate-900 border-2 border-slate-700 rounded-lg shadow-2xl p-6 transform transition-all scale-100">
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-2">
          <h3 className="text-amber-500 font-bold tracking-widest uppercase text-sm">Hero Attributes</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold">✕</button>
        </div>

        <div className="space-y-4">
           {/* Avatar Circle */}
           <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-slate-700 overflow-hidden bg-slate-800 shadow-inner ring-2 ring-slate-800">
                 <img src="https://czrimg.godqb.com/game/v2/play2/1.png" className="w-full h-full object-cover scale-125 translate-y-2" alt="Hero" />
              </div>
           </div>

           <div className="space-y-3">
              <StatRow label="Attack Power" value={playerState.damage} icon="⚔️" color="text-red-400" />
              <StatRow label="Move Speed" value={playerState.speed} icon="👟" color="text-blue-400" />
              <StatRow label="Projectile Spd" value={playerState.projectileSpeed} icon="🏹" color="text-green-400" />
              <StatRow label="Max Health" value={playerState.maxHealth} icon="❤️" color="text-pink-400" />
              <StatRow label="Attack Speed" value="2.5/s" icon="⚡" color="text-yellow-400" />
           </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-700 text-center">
           <span className="text-[10px] text-slate-500 font-mono">CLASS: VOID WALKER</span>
        </div>
      </div>
      <style>{`
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

const StatRow: React.FC<{ label: string, value: string | number, icon: string, color: string }> = ({ label, value, icon, color }) => (
  <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded border border-slate-800 hover:border-slate-600 transition-colors">
     <div className="flex items-center gap-3 text-xs text-slate-300">
       <span className="text-base">{icon}</span>
       <span className="uppercase tracking-wide font-bold">{label}</span>
     </div>
     <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
  </div>
);