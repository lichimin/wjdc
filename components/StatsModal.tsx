import React from 'react';
import { PlayerState, UserAttributes } from '../types';

interface StatsModalProps {
  playerState: PlayerState;
  userAttributes: UserAttributes | null;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ playerState, userAttributes, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={onClose}></div>
      
      <div className="relative z-10 w-80 bg-slate-900 border-2 border-slate-700 rounded-lg shadow-2xl p-6 transform transition-all scale-100">
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-2">
          <h3 className="text-amber-500 font-bold tracking-widest uppercase text-sm">英雄属性</h3>
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
              <StatRow 
                label="攻击力" 
                baseValue={15} 
                additionalValue={userAttributes?.攻击力 || 0} 
                totalValue={playerState.damage} 
                icon="⚔️" 
                color="text-red-400" 
              />
              <StatRow 
                label="移动速度" 
                baseValue={3.5} 
                additionalValue={parseFloat(userAttributes?.移动速度 || "0")} 
                totalValue={playerState.speed} 
                icon="👟" 
                color="text-blue-400" 
              />
              <StatRow 
                label="子弹速度" 
                baseValue={8} 
                additionalValue={parseFloat(userAttributes?.子弹速度 || "0")} 
                totalValue={playerState.projectileSpeed} 
                icon="🏹" 
                color="text-green-400" 
              />
              <StatRow 
                label="最大生命值" 
                baseValue={100} 
                additionalValue={userAttributes?.生命值 || 0} 
                totalValue={playerState.maxHealth} 
                icon="❤️" 
                color="text-pink-400" 
              />
              <StatRow 
                label="攻击速度" 
                baseValue={2.5} 
                additionalValue={userAttributes?.攻击速度 || 0} 
                totalValue={`${(2.5 + (userAttributes?.攻击速度 || 0)).toFixed(1)}/s`} 
                icon="⚡" 
                color="text-yellow-400" 
              />
              <StatRow 
                label="减伤" 
                baseValue={0} 
                additionalValue={parseFloat(userAttributes?.减伤 || "0")} 
                totalValue={`${parseFloat(userAttributes?.减伤 || "0")}%`} 
                icon="🛡️" 
                color="text-cyan-400" 
              />
              <StatRow 
                label="吸血" 
                baseValue={0} 
                additionalValue={parseFloat(userAttributes?.吸血 || "0")} 
                totalValue={`${parseFloat(userAttributes?.吸血 || "0")}%`} 
                icon="🩸" 
                color="text-red-500" 
              />
              <StatRow 
                label="Critical Rate" 
                baseValue={0} 
                additionalValue={parseFloat(userAttributes?.暴击率 || "0")} 
                totalValue={`${parseFloat(userAttributes?.暴击率 || "0")}%`} 
                icon="💥" 
                color="text-yellow-500" 
              />
              <StatRow 
                label="暴击伤害" 
                baseValue={150} 
                additionalValue={parseFloat(userAttributes?.暴击伤害 || "150") - 150} 
                totalValue={userAttributes?.暴击伤害 || "150%"} 
                icon="🎯" 
                color="text-orange-500" 
              />
              <StatRow 
                label="Dodge Rate" 
                baseValue={0} 
                additionalValue={parseFloat(userAttributes?.闪避 || "0")} 
                totalValue={`${parseFloat(userAttributes?.闪避 || "0")}%`} 
                icon="👻" 
                color="text-purple-500" 
              />
              <StatRow 
                label="Instant Kill" 
                baseValue={0} 
                additionalValue={parseFloat(userAttributes?.秒杀 || "0")} 
                totalValue={`${parseFloat(userAttributes?.秒杀 || "0")}%`} 
                icon="☠️" 
                color="text-gray-500" 
              />
              <StatRow 
                label="恢复" 
                baseValue={0} 
                additionalValue={userAttributes?.恢复 || 0} 
                totalValue={userAttributes?.恢复 || 0} 
                icon="✨" 
                color="text-teal-500" 
              />
              <StatRow 
                label="弹道" 
                baseValue={1} 
                additionalValue={(userAttributes?.弹道 || 1) - 1} 
                totalValue={userAttributes?.弹道 || 1} 
                icon="🎯" 
                color="text-indigo-500" 
              />
           </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-700 text-center">
           <span className="text-[10px] text-slate-500 font-mono">职业: 虚空行者</span>
        </div>
      </div>
      <style>{`
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

const StatRow: React.FC<{ label: string, baseValue: number, additionalValue: number, totalValue: string | number, icon: string, color: string }> = ({ label, baseValue, additionalValue, totalValue, icon, color }) => (
  <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded border border-slate-800 hover:border-slate-600 transition-colors">
     <div className="flex items-center gap-3 text-xs text-slate-300">
       <span className="text-base">{icon}</span>
       <span className="uppercase tracking-wide font-bold">{label}</span>
     </div>
     <div className={`text-sm font-bold font-mono ${color}`}>
       {typeof totalValue === 'number' ? totalValue.toFixed(1) : totalValue}
       {additionalValue > 0 && (
         <span className="text-green-400 ml-1">
           (+{additionalValue})
         </span>
       )}
     </div>
  </div>
);