
import React, { useRef, useEffect, useState } from 'react';
import { DungeonData, PlayerState, TileType, ItemType } from '../types';

interface MiniMapProps {
  dungeon: DungeonData;
  playerRef: React.MutableRefObject<PlayerState>;
  visitedRef: React.MutableRefObject<boolean[][]>;
  onRegenerate: () => void;
}

const TILE_SIZE = 32; // Size of tiles in the main game world
const MAP_SCALE = 4;  // Size of a tile in the expanded mini-map (pixels)
const COLLAPSED_SCALE = 6; // Scale for the small radar view

export const MiniMap: React.FC<MiniMapProps> = ({ dungeon, playerRef, visitedRef, onRegenerate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [expanded, setExpanded] = useState(false);

  // Use state to force re-render when expanding, ensuring canvas resizes
  useEffect(() => {
    // Just a trigger
  }, [expanded]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Clear
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const p = playerRef.current;
      const playerCenterX = p.x + TILE_SIZE / 2;
      const playerCenterY = p.y + TILE_SIZE / 2;
      
      const visited = visitedRef.current;
      if (!visited || visited.length === 0) return;

      if (expanded) {
        // --- EXPANDED MODE: Show entire map with fog of war ---
        const scale = MAP_SCALE;
        
        // Draw visited tiles
        for (let y = 0; y < dungeon.height; y++) {
          for (let x = 0; x < dungeon.width; x++) {
            if (visited[y][x]) {
               const tile = dungeon.grid[y][x];
               const mx = x * scale;
               const my = y * scale;

               if (tile === TileType.WALL) {
                 ctx.fillStyle = '#475569';
                 ctx.fillRect(mx, my, scale, scale);
               } else if (tile === TileType.FLOOR || tile === TileType.CORRIDOR) {
                 ctx.fillStyle = '#334155';
                 ctx.fillRect(mx, my, scale, scale);
               }
            }
          }
        }

        // Draw Special Items (Exits) on visible tiles
        dungeon.rooms.forEach(room => {
           room.items.forEach(item => {
             if (item.type === ItemType.EXIT && visited[item.y][item.x]) {
               const mx = item.x * scale;
               const my = item.y * scale;
               ctx.fillStyle = '#22d3ee'; // Cyan
               ctx.beginPath();
               ctx.arc(mx + scale/2, my + scale/2, scale, 0, Math.PI*2);
               ctx.fill();
             }
           });
        });

        // Draw Player
        const minimapX = (playerCenterX / TILE_SIZE) * scale;
        const minimapY = (playerCenterY / TILE_SIZE) * scale;

        ctx.fillStyle = '#fbbf24'; 
        ctx.beginPath();
        ctx.arc(minimapX, minimapY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw Player Field of View Cone (approximate)
        ctx.save();
        ctx.translate(minimapX, minimapY);
        if (p.facingLeft) ctx.scale(-1, 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(20, -10);
        ctx.lineTo(20, 10);
        ctx.fill();
        ctx.restore();

      } else {
        // --- COLLAPSED MODE: Radar View (Centered on Player) ---
        const scale = COLLAPSED_SCALE;
        const viewSize = canvas.width; // Should be square
        const halfView = viewSize / 2;
        
        // We render relative to player center being at halfView, halfView
        const pGx = Math.floor(playerCenterX / TILE_SIZE);
        const pGy = Math.floor(playerCenterY / TILE_SIZE);
        const radius = Math.ceil((halfView / scale)); // How many tiles visible in radar radius

        const startY = Math.max(0, pGy - radius);
        const endY = Math.min(dungeon.height, pGy + radius + 1);
        const startX = Math.max(0, pGx - radius);
        const endX = Math.min(dungeon.width, pGx + radius + 1);

        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            if (visited[y][x]) {
              const tile = dungeon.grid[y][x];
              // Relative position in pixels
              const dx = (x * TILE_SIZE - playerCenterX) / TILE_SIZE * scale + halfView;
              const dy = (y * TILE_SIZE - playerCenterY) / TILE_SIZE * scale + halfView;

              if (tile === TileType.WALL) {
                ctx.fillStyle = '#64748b'; // Lighter walls for radar
                ctx.fillRect(dx, dy, scale, scale);
              } else if (tile === TileType.FLOOR || tile === TileType.CORRIDOR) {
                ctx.fillStyle = '#334155';
                ctx.fillRect(dx, dy, scale, scale);
              }
            }
          }
        }

        // Draw Special Items (Exits) on visible radar tiles
        dungeon.rooms.forEach(room => {
           room.items.forEach(item => {
             if (item.type === ItemType.EXIT && visited[item.y][item.x]) {
                 // Check if inside radar bounds logic handles itself via the draw loop for grid, 
                 // but items are entities, so we calculate directly.
                 const dx = (item.x * TILE_SIZE - playerCenterX) / TILE_SIZE * scale + halfView;
                 const dy = (item.y * TILE_SIZE - playerCenterY) / TILE_SIZE * scale + halfView;
                 
                 // Simple bounds check to clip
                 if (dx >= 0 && dx <= viewSize && dy >= 0 && dy <= viewSize) {
                   ctx.fillStyle = '#22d3ee'; // Cyan
                   ctx.beginPath();
                   ctx.arc(dx + scale/2, dy + scale/2, scale * 0.8, 0, Math.PI*2);
                   ctx.fill();
                 }
             }
           });
        });

        // Draw Player (Always Center)
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(halfView, halfView, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [dungeon, playerRef, visitedRef, expanded]);

  return (
    <>
      {/* Expanded Modal Backdrop */}
      {expanded && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setExpanded(false)}
        ></div>
      )}

      <div 
        className={`
          transition-all duration-300 ease-in-out bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden
          ${expanded 
            ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-lg flex flex-col' 
            : 'rounded-full hover:scale-105 cursor-pointer border-2 border-slate-600 hover:border-amber-500'
          }
        `}
        style={{
          width: expanded ? 'auto' : '80px',
          height: expanded ? 'auto' : '80px',
        }}
        onClick={() => !expanded && setExpanded(true)}
      >
        {expanded && (
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-700 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               <h3 className="text-sm font-bold text-slate-200 tracking-wider">TACTICAL MAP</h3>
             </div>
             <button 
               onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
               className="text-slate-500 hover:text-white"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
               </svg>
             </button>
          </div>
        )}

        <div className={`relative ${expanded ? 'p-4 bg-[#020617]' : 'w-full h-full'}`}>
           <canvas 
              ref={canvasRef} 
              width={expanded ? dungeon.width * MAP_SCALE : 80}
              height={expanded ? dungeon.height * MAP_SCALE : 80}
              className="block image-pixelated"
              style={{
                borderRadius: expanded ? '4px' : '50%'
              }}
           />
           
           {!expanded && (
             <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none"></div>
           )}
        </div>

        {expanded && (
           <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-3 shrink-0">
              <div className="flex-1 text-[10px] text-slate-500 self-center">
                 SECTOR VISIBILITY: {
                   Math.floor((visitedRef.current.flat().filter(Boolean).length / (dungeon.width * dungeon.height)) * 100)
                 }%
              </div>
              <button
                onClick={(e) => {
                   e.stopPropagation();
                   onRegenerate();
                   setExpanded(false);
                }}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded flex items-center gap-2 transition-colors shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                REGENERATE SECTOR
              </button>
           </div>
        )}
      </div>
    </>
  );
};
