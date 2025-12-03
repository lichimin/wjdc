import React, { useState } from 'react';
import { UserData } from '../services/authService';

interface HomeProps {
  userData: UserData;
  onStartAdventure: (difficulty: number) => void;
  onOpenInventory: () => void;
}

const DIFFICULTIES = [
  { label: 'B-Class', multiplier: 1, color: 'text-cyan-400', border: 'border-cyan-500', bg: 'bg-cyan-900/20', desc: 'NORMAL' },
  { label: 'A-Class', multiplier: 2, color: 'text-green-400', border: 'border-green-500', bg: 'bg-green-900/20', desc: 'HARD (STATS x2)' },
  { label: 'S-Class', multiplier: 4, color: 'text-yellow-400', border: 'border-yellow-500', bg: 'bg-yellow-900/20', desc: 'EXPERT (STATS x4)' },
  { label: 'SS-Class', multiplier: 8, color: 'text-purple-400', border: 'border-purple-500', bg: 'bg-purple-900/20', desc: 'MASTER (STATS x8)' },
  { label: 'SSS-Class', multiplier: 16, color: 'text-red-500', border: 'border-red-500', bg: 'bg-red-900/20', desc: 'HELL (STATS x16)' },
];

// --- PIXEL ICONS (Modified for Neon Style) ---
const PixelIcon: React.FC<{ type: 'sword' | 'bag' | 'anvil' | 'shirt', scale?: number, color?: string }> = ({ type, scale = 3, color = '#22d3ee' }) => {
  // Simple 8x8 bitmaps
  const maps: Record<string, string[]> = {
    sword: [
      ".......1",
      "......1.",
      ".....1..",
      "....1...",
      "...1....",
      "..1.....",
      ".1......",
      "1.......",
    ],
    bag: [
      "..1111..",
      ".1....1.",
      "1......1",
      "1..11..1",
      "1......1",
      "1......1",
      ".111111.",
      "........",
    ],
    anvil: [
      "........",
      ".111111.",
      "..1..1..",
      "..1..1..",
      ".111111.",
      "11111111",
      "........",
      "........",
    ],
    shirt: [
      "1..1..1.",
      "11...11.",
      "1111111.",
      "1111111.",
      "1111111.",
      "1111111.",
      "1111111.",
      "........",
    ]
  };

  const grid = maps[type];

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: `repeat(8, ${scale}px)`,
      gridTemplateRows: `repeat(8, ${scale}px)`,
      opacity: 0.9
    }}>
      {grid.map((row, y) => row.split('').map((char, x) => (
        <div key={`${x}-${y}`} style={{ backgroundColor: char === '1' ? color : 'transparent', boxShadow: char === '1' ? `0 0 ${scale}px ${color}` : 'none' }} />
      )))}
    </div>
  );
};

export const Home: React.FC<HomeProps> = ({ userData, onStartAdventure, onOpenInventory }) => {
  const [showDifficulty, setShowDifficulty] = useState(false);

  return (
    <div className="h-screen w-full bg-[#020205] flex flex-col font-sans relative overflow-hidden text-gray-100 selection:bg-cyan-500 selection:text-black">
      
      {/* --- CYBERPUNK BACKGROUND --- */}
      {/* Moving Grid Floor */}
      <div className="absolute inset-0 perspective-grid pointer-events-none opacity-30"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#020205] via-transparent to-[#020205] pointer-events-none"></div>
      {/* Scanlines */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiAvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LDI1NSwgMC4wNSkiIC8+Cjwvc3ZnPg==')] opacity-20 pointer-events-none z-0"></div>

      {/* --- HEADER (HUD) --- */}
      <header className="relative z-10 p-4 flex justify-between items-start">
        {/* Profile Badge */}
        <div className="flex items-center gap-3 bg-slate-900/80 border border-cyan-500/30 pl-1 pr-4 py-1 rounded-r-full shadow-[0_0_10px_rgba(6,182,212,0.2)] backdrop-blur-sm">
           <div className="w-10 h-10 rounded-full bg-cyan-900/50 border border-cyan-400 overflow-hidden relative">
              <img 
                src={userData.img || "https://czrimg.godqb.com/game/v2/play2/1.png"} 
                alt={userData.username || "Player"} 
                className="w-full h-full object-cover" 
              />
           </div>
           <div className="flex flex-col">
              <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase font-['Press_Start_2P']">{userData.username || 'Player_01'}</span>
              <span className="text-[8px] text-slate-400 font-mono">LV.{userData.level || 1} // {userData.className || 'WARRIOR'}</span>
           </div>
        </div>

        {/* Top Right Stats */}
        <div className="flex flex-col items-end gap-2">
           <div className="flex items-center gap-2 px-3 py-1 bg-black/60 border border-yellow-500/30 rounded skew-x-[-10deg]">
              <span className="text-yellow-400 text-xs font-mono font-bold skew-x-[10deg]">{userData.gold.toLocaleString()} G</span>
           </div>
           <div className="text-[8px] text-slate-500 font-mono tracking-widest">VER 2.1.0</div>
        </div>
      </header>

      {/* --- HERO SECTION (Character) --- */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 pointer-events-none">
         {/* Hologram Circle */}
         <div className="relative w-64 h-64 flex items-center justify-center">
            <div className="absolute inset-0 border-2 border-dashed border-cyan-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
            <div className="absolute inset-4 border border-cyan-500/10 rounded-full animate-[spin_5s_linear_infinite_reverse]"></div>
            
            {/* Character Sprite (Large) */}
            <img 
              src={userData.img || "https://czrimg.godqb.com/game/v2/play2/1.png"} 
              className="w-32 h-32 object-contain image-pixelated drop-shadow-[0_0_20px_rgba(34,211,238,0.4)] animate-float"
              alt={userData.username || "Hero"}
            />
            
            {/* Class Label */}
            <div className="absolute -bottom-4 bg-black/80 border border-cyan-500 px-4 py-1 rounded text-cyan-400 text-[10px] font-['Press_Start_2P'] shadow-[0_0_10px_rgba(6,182,212,0.5)]">
               {userData.className || 'VOID WALKER'}
            </div>
         </div>
      </div>

      {/* --- CONTROL DECK (Bottom Navigation) --- */}
      <div className="relative z-10 pb-8 px-6 flex flex-col gap-6">
         
         {/* Secondary Actions Grid */}
         <div className="grid grid-cols-3 gap-4">
            <CyberButton label="INVENTORY" icon="bag" color="cyan" onClick={onOpenInventory} />
            <CyberButton label="FORGE" icon="anvil" color="purple" onClick={() => alert("SYSTEM OFFLINE")} />
            <CyberButton label="SKINS" icon="shirt" color="pink" onClick={() => alert("SYSTEM OFFLINE")} />
         </div>

         {/* MAIN ACTION: ADVENTURE */}
         <button 
           onClick={() => setShowDifficulty(true)}
           className="group relative w-full h-20 bg-gradient-to-r from-red-900/80 to-red-950/80 border-2 border-red-500 rounded-lg flex items-center justify-between px-8 overflow-hidden transition-all active:scale-95 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]"
         >
            {/* Glitch Overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 group-hover:opacity-40 transition-opacity"></div>
            
            <div className="flex flex-col items-start relative z-10">
               <span className="text-red-100 font-['Press_Start_2P'] text-lg tracking-widest drop-shadow-md group-hover:text-white">ADVENTURE</span>
               <span className="text-[10px] text-red-400 font-mono tracking-[0.2em] mt-1 group-hover:text-red-300">SECTOR INCURSION</span>
            </div>

            <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-red-500/20 border border-red-500 rounded group-hover:bg-red-500 group-hover:text-black transition-colors">
               <span className="text-2xl">⚔️</span>
            </div>
         </button>
      </div>

      {/* --- DIFFICULTY MODAL --- */}
      {showDifficulty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fadeIn p-4">
           <div className="w-full max-w-sm bg-slate-900 border-2 border-slate-700 rounded-none p-1 relative shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              {/* Header */}
              <div className="flex justify-between items-center bg-slate-800 p-3 mb-1">
                 <h2 className="text-sm text-cyan-400 font-['Press_Start_2P']">SELECT THREAT</h2>
                 <button onClick={() => setShowDifficulty(false)} className="text-red-500 hover:text-white font-mono">[X]</button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3 bg-[#0a0a0c]">
                 {DIFFICULTIES.map((diff) => (
                   <button
                     key={diff.label}
                     onClick={() => onStartAdventure(diff.multiplier)}
                     className={`
                       w-full flex items-center justify-between px-4 py-3 border-l-4 transition-all group
                       ${diff.border} ${diff.bg} hover:bg-opacity-40
                     `}
                   >
                      <div className="flex flex-col items-start">
                         <span className={`font-bold font-mono text-lg ${diff.color} group-hover:translate-x-2 transition-transform`}>
                           {diff.label}
                         </span>
                      </div>
                      <div className="text-[8px] font-['Press_Start_2P'] text-slate-500 uppercase">
                         {diff.desc}
                      </div>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* GLOBAL STYLES */}
      <style>{`
        .image-pixelated { image-rendering: pixelated; }
        .perspective-grid {
          background-size: 40px 40px;
          background-image:
            linear-gradient(to right, rgba(0, 243, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 243, 255, 0.1) 1px, transparent 1px);
          transform: perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px);
          transform-origin: center top;
          animation: grid-move 20s linear infinite;
        }
        @keyframes grid-move {
          0% { transform: perspective(500px) rotateX(60deg) translateY(0) translateZ(-200px); }
          100% { transform: perspective(500px) rotateX(60deg) translateY(40px) translateZ(-200px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const CyberButton: React.FC<{ label: string, icon: 'bag' | 'anvil' | 'shirt', color: 'cyan' | 'purple' | 'pink', onClick: () => void }> = ({ label, icon, color, onClick }) => {
  const colors = {
    cyan: { text: 'text-cyan-400', border: 'border-cyan-500', shadow: 'hover:shadow-[0_0_15px_rgba(34,211,238,0.4)]', bg: 'bg-cyan-950/50' },
    purple: { text: 'text-purple-400', border: 'border-purple-500', shadow: 'hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]', bg: 'bg-purple-950/50' },
    pink: { text: 'text-pink-400', border: 'border-pink-500', shadow: 'hover:shadow-[0_0_15px_rgba(236,72,153,0.4)]', bg: 'bg-pink-950/50' },
  };
  const theme = colors[color];

  return (
    <button 
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-2 py-4 rounded bg-opacity-50 border border-opacity-50
        ${theme.bg} ${theme.border} ${theme.shadow} transition-all active:scale-95 group
      `}
    >
      <div className="scale-125 group-hover:-translate-y-1 transition-transform">
        <PixelIcon type={icon} color={color === 'cyan' ? '#22d3ee' : color === 'purple' ? '#a855f7' : '#ec4899'} />
      </div>
      <span className={`text-[10px] font-bold tracking-widest ${theme.text} mt-1`}>{label}</span>
    </button>
  );
};