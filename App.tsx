import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateDungeon } from './services/dungeonGenerator';
import { generateRoomDescription } from './services/geminiService';
import { generateLoot } from './services/lootService';
import { authService, UserData } from './services/authService';
import { DungeonCanvas } from './components/DungeonCanvas';
import { MiniMap } from './components/MiniMap';
import { ChestModal } from './components/ChestModal';
import { InventoryModal } from './components/InventoryModal';
import { StatsModal } from './components/StatsModal';
import { SummaryModal } from './components/SummaryModal';
import { Home } from './components/Home'; // Imported Home
import SimpleLogin from './components/SimpleLogin';
import { DungeonData, Room, ItemType, InputState, PlayerState, Enemy, Projectile, FloatingText, LootItem, Rarity } from './types';
import { GoogleGenAI } from "@google/genai";

// --- CYBERPUNK JOYSTICK ---
const Joystick: React.FC<{ 
  onMove: (x: number, y: number) => void,
  onStop: () => void 
}> = ({ onMove, onStop }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleStart = (clientX: number, clientY: number) => {
    setActive(true);
    handleMove(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.sqrt(dx*dx + dy*dy);
    const maxRadius = rect.width / 2;
    if (distance > maxRadius) {
      const ratio = maxRadius / distance;
      dx *= ratio; dy *= ratio;
    }
    setPos({ x: dx, y: dy });
    onMove(dx / maxRadius, dy / maxRadius);
  };

  const handleEnd = () => {
    setActive(false);
    setPos({ x: 0, y: 0 });
    onStop();
  };

  // Global listeners for drag outside
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => { if (active) { e.preventDefault(); handleMove(e.clientX, e.clientY); } };
    const onMouseUp = () => { if (active) handleEnd(); };
    const onTouchMove = (e: TouchEvent) => { if (active) { handleMove(e.touches[0].clientX, e.touches[0].clientY); } };
    const onTouchEnd = () => { if (active) handleEnd(); };

    if (active) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [active]);

  return (
    <div 
      ref={containerRef} 
      className="w-32 h-32 relative touch-none select-none group"
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
    >
      {/* Outer Ring */}
      <div className={`
        absolute inset-0 rounded-full border-2 border-cyan-500/50 bg-slate-900/80 backdrop-blur-sm
        shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all duration-300
        ${active ? 'border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.5)] scale-105' : ''}
      `}>
        {/* Inner Grid Lines */}
        <div className="absolute inset-2 border border-dashed border-cyan-500/20 rounded-full"></div>
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-cyan-500/20"></div>
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-cyan-500/20"></div>
      </div>

      {/* Thumbstick */}
      <div 
        className={`
          absolute top-1/2 left-1/2 -ml-6 -mt-6 w-12 h-12 rounded-full 
          bg-gradient-to-br from-cyan-400 to-blue-600 border border-cyan-200
          shadow-[0_0_10px_rgba(34,211,238,0.8)] pointer-events-none transition-transform duration-75 ease-out
          flex items-center justify-center
        `}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      >
        <div className="w-4 h-4 bg-white/50 rounded-full blur-[2px]"></div>
      </div>
    </div>
  );
};

// --- CYBER ACTION BUTTON (DASH ONLY) ---
const CyberDashButton: React.FC<{ 
  active: boolean,
  onPress: () => void,
  onRelease: () => void
}> = ({ active, onPress, onRelease }) => {
  return (
    <button
      className={`
        relative w-20 h-20 flex items-center justify-center transition-all duration-100 touch-none select-none
        ${active ? 'scale-90' : 'scale-100 hover:scale-105'}
      `}
      onMouseDown={onPress} onMouseUp={onRelease} onMouseLeave={onRelease}
      onTouchStart={(e) => { e.preventDefault(); onPress(); }} onTouchEnd={onRelease}
    >
      {/* Glow Backdrop */}
      <div className={`
        absolute inset-0 rounded-xl bg-blue-600 blur-xl opacity-20 transition-opacity duration-300
        ${active ? 'opacity-60' : ''}
      `}></div>

      {/* Main Button Body */}
      <div className={`
        absolute inset-0 bg-slate-900 border-2 rounded-xl backdrop-blur-md flex items-center justify-center
        shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all
        ${active ? 'border-blue-400 bg-blue-900/40 shadow-[0_0_25px_rgba(59,130,246,0.6)] translate-y-1' : 'border-blue-600/60'}
      `}>
         {/* Tech Lines */}
         <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-blue-400 rounded-tl-sm"></div>
         <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-blue-400 rounded-tr-sm"></div>
         <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-blue-400 rounded-bl-sm"></div>
         <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-blue-400 rounded-br-sm"></div>
         
         {/* Icon */}
         <span className={`text-3xl transition-transform ${active ? 'scale-110 text-white' : 'text-blue-400'}`}>
           ⚡
         </span>
      </div>

      {/* Label */}
      <span className={`
        absolute -bottom-6 text-[10px] font-mono font-bold tracking-widest
        ${active ? 'text-blue-300' : 'text-slate-500'}
      `}>
        FLASH
      </span>
    </button>
  );
};

const App: React.FC = () => {
  // Global App State
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [difficulty, setDifficulty] = useState(1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loginError, setLoginError] = useState('');
  const [userSkin, setUserSkin] = useState<UserSkin | null>(null);

  // Game View State
  const [dungeon, setDungeon] = useState<DungeonData | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [lore, setLore] = useState<string>("");
  const [loadingLore, setLoadingLore] = useState(false);
  
  // Authentication functions
  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUserData(null);
    setUsername('');
    setPassword('');
    setGameState('HOME');
  };

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Auto-fullscreen on mobile devices when game starts
  useEffect(() => {
    if (gameState === 'PLAYING' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      // Only attempt auto-fullscreen on user interaction
      const handleUserInteraction = () => {
        if (!isFullscreen) {
          toggleFullscreen();
        }
        window.removeEventListener('click', handleUserInteraction);
        window.removeEventListener('touchstart', handleUserInteraction);
      };

      window.addEventListener('click', handleUserInteraction);
      window.addEventListener('touchstart', handleUserInteraction);

      return () => {
        window.removeEventListener('click', handleUserInteraction);
        window.removeEventListener('touchstart', handleUserInteraction);
      };
    }
  }, [gameState, isFullscreen]);

  // Check authentication status on mount
  useEffect(() => {
    // 清除之前的认证数据以方便测试
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    
    const checkAuthStatus = async () => {
      setCheckingAuth(true);
      try {
        if (authService.isAuthenticated()) {
          const user = authService.getCurrentUser();
          if (user) {
            setUserData(user);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  // Handle login
  const handleLogin = async () => {
    if (!username || !password) {
      setLoginError('请输入用户名和密码');
      return;
    }
    
    setCheckingAuth(true);
    setLoginError('');
    
    try {
      const result = await authService.login(username, password);
      setUserData(result.userData);
      setIsAuthenticated(true);
      setGameState('HOME');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '登录失败，请重试');
    } finally {
      setCheckingAuth(false);
    }
  };
  
  // Loot & Inventory State
  const [isChestOpen, setIsChestOpen] = useState(false);
  const [currentLoot, setCurrentLoot] = useState<LootItem[]>([]);
  const [inventory, setInventory] = useState<LootItem[]>([]);
  const [originalInventoryItems, setOriginalInventoryItems] = useState<any[]>([]);
  const [runInventory, setRunInventory] = useState<LootItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  
  // Fetch backpack items from API
  const fetchBackpackItems = async () => {
    if (!isAuthenticated) return;
    
    setInventoryLoading(true);
    try {
      const token = authService.getAuthToken();
      if (!token) throw new Error('No authentication token found');
      
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/api/v1/my-items?position=backpack`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch items');
      
      // Map API response to LootItem format with error handling
      const mappedItems = data.data.map((item: any, index: number) => {
        let itemData: any;
        let itemType: string = item.type || 'treasure';
        
        // Handle different item types
        if (itemType === 'equipment') {
          // Equipment data structure
          itemData = item.equipment?.equipment_template || {};
        } else {
          // Treasure data structure
          itemData = item.treasure || item;
        }
        
        // Calculate value based on item type
        let itemValue = 0;
        if (itemType === 'equipment') {
          // For equipment, value can be based on level and attack power
          itemValue = (itemData.level || 1) * 10 + (itemData.attack || 0);
        } else {
          // For treasure, use direct value
          itemValue = itemData.value || 0;
        }
        
        // Generate ID - prioritize the top-level item.id first
        const generatedId = item.id || Math.random().toString(36).substr(2, 9);
        
        return {
          id: generatedId,
          name: itemData.name || 'Unknown Item',
          value: itemValue,
          iconColor: itemType === 'equipment' ? '#4ade80' : '#ffd700', // Different color for equipment vs treasure
          rarity: (itemData.rarity || 'LEGENDARY') as Rarity,
          imageUrl: itemData.image_url || itemData.imageUrl || '',
          quantity: itemType === 'equipment' ? 1 : (item.quantity || itemData.quantity || 1),
          type: itemType // Store item type for future use
        };
      });
      
      // Save original API data for equipment details
      setOriginalInventoryItems(data.data);
      setInventory(mappedItems);
    } catch (error) {
      console.error('Failed to fetch backpack items:', error);
    } finally {
      setInventoryLoading(false);
    }
  };
  
  // Fetch backpack items when inventory is opened
  useEffect(() => {
    if (isInventoryOpen) {
      fetchBackpackItems();
    }
  }, [isInventoryOpen]);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryType, setSummaryType] = useState<'success' | 'failure'>('success');

  // Input State
  const [dashBtnActive, setDashBtnActive] = useState(false);

  const inputRef = useRef<InputState>({ dx: 0, dy: 0, isAttacking: false, isDodging: false });
  const playerRef = useRef<PlayerState>({
    x: 0, y: 0, facingLeft: false, isMoving: false, frameIndex: 0, lastFrameTime: 0,
    health: 100, maxHealth: 100, attackCooldown: 0, fireCooldown: 0, invincibilityTimer: 0,
    damage: 15, speed: 3.5, projectileSpeed: 8,
    critRate: 0.05, critDamage: 0.15, dodgeRate: 0.05, regen: 5, regenTimer: 0, lifesteal: 0.03, instantKillRate: 0.01,
    rollTimer: 0, rollCooldown: 0, rollVx: 0, rollVy: 0,
    interactionTargetId: null, interactionTimer: 0
  });

  const visitedRef = useRef<boolean[][]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // Initial Key Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space is now Dash
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Shift') { 
         inputRef.current.isDodging = true; 
         setDashBtnActive(true); 
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Shift') { 
         inputRef.current.isDodging = false; 
         setDashBtnActive(false); 
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const startGame = (selectedDifficulty: number) => {
    if (!isAuthenticated) {
      // 如果未登录，可以选择跳转到登录页或者弹出提示
      // 这里我们选择直接开始游戏，但在实际场景中可能需要强制登录
      console.warn('Playing without authentication');
    }
    
    setDifficulty(selectedDifficulty);
    regenerate(selectedDifficulty);
    setGameState('PLAYING');
  };

  const regenerate = (diff: number = 1) => {
    const newData = generateDungeon(diff);
    visitedRef.current = Array.from({ length: newData.height }, () => Array(newData.width).fill(false));
    enemiesRef.current = newData.enemies.map(e => ({ ...e }));
    projectilesRef.current = [];
    floatingTextsRef.current = [];
    
    // Reset Player Status
    const p = playerRef.current;
    p.health = 100;
    p.maxHealth = 100;
    p.invincibilityTimer = 0;
    p.fireCooldown = 0;
    p.rollTimer = 0;
    p.rollCooldown = 0;
    p.interactionTargetId = null;
    p.interactionTimer = 0;
    
    setDungeon(newData);
    setSelectedRoom(null);
    setLore("");
    setRunInventory([]); 
  };

  const handleRoomSelect = useCallback(async (room: Room | null) => {
    setSelectedRoom(room);
    if (!room) { setLore(""); return; }
    setLoadingLore(true);
    setLore("Deciphering runes...");
    const description = await generateRoomDescription(room);
    setLore(description);
    setLoadingLore(false);
  }, []);

  const handleJoystickMove = useCallback((x: number, y: number) => { inputRef.current.dx = x; inputRef.current.dy = y; }, []);
  const handleJoystickStop = useCallback(() => { inputRef.current.dx = 0; inputRef.current.dy = 0; }, []);

  const handleOpenChest = (chestId: string) => {
    const count = Math.floor(Math.random() * 6) + 3;
    const loot = generateLoot(count);
    setCurrentLoot(loot);
    setIsChestOpen(true);
  };

  const handleConfirmLoot = (selectedItems: LootItem[]) => {
    // Generate unique IDs for each item to prevent duplicate keys
    const itemsWithUniqueIds = selectedItems.map((item, index) => ({
      ...item,
      id: `loot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${index}`
    }));
    setRunInventory(prev => [...prev, ...itemsWithUniqueIds]);
    setIsChestOpen(false);
    setCurrentLoot([]);
  };

  const handleExtract = useCallback(() => {
    setSummaryType('success');
    setIsSummaryOpen(true);
  }, []);

  const handleGameOver = useCallback(() => {
    setRunInventory([]); 
    setSummaryType('failure');
    setIsSummaryOpen(true);
  }, []);

  const handleReturnHome = () => {
    if (summaryType === 'success') {
       setInventory(prev => [...prev, ...runInventory]);
       const totalVal = runInventory.reduce((sum, i) => sum + i.value, 0);
       setGold(prev => prev + totalVal);
    }
    setIsSummaryOpen(false);
    setGameState('HOME');
  };

  // --- RENDER ---

  // 未认证时显示登录页面
  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-[#020617] text-gray-200 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 border border-cyan-500/50 rounded-lg p-8 backdrop-blur-sm shadow-[0_0_30px_rgba(6,182,212,0.2)]">
          <h1 className="text-2xl font-bold text-cyan-400 text-center mb-6 font-mono">登录账号</h1>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="用户名" 
              className="w-full bg-slate-800 border border-cyan-900/50 rounded px-4 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="密码" 
              className="w-full bg-slate-800 border border-cyan-900/50 rounded px-4 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {loginError && (
              <div className="text-red-500 text-sm">{loginError}</div>
            )}
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white py-3 rounded-md font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
            >
              登录
            </button>
          </div>
          <div className="text-center mt-4 text-cyan-300 text-sm">
            游戏登录界面 - 默认显示
          </div>
        </div>
      </div>
    );
  }

  // 已认证后显示Home页面
  if (gameState === 'HOME') {
    return (
        <>
          {userData && (
            <Home 
              userData={userData}
              onStartAdventure={startGame} 
              onOpenInventory={() => setIsInventoryOpen(true)}
              onLogout={() => setIsAuthenticated(false)}
              onSkinLoaded={setUserSkin}
            />
          )}
        {/* Inventory Overlay for Home */}
        {isInventoryOpen && (
          <InventoryModal 
              items={inventory} 
              onClose={() => setIsInventoryOpen(false)} 
              originalItems={originalInventoryItems} 
            />
        )}
      </>
    );
  }

  return (
    <div className="h-screen bg-[#020617] text-gray-200 font-sans selection:bg-cyan-500 selection:text-black flex flex-col relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_80%)] pointer-events-none"></div>

      {/* GAME HEADER */}
      <header className="relative z-10 bg-slate-900/90 border-b border-cyan-900/50 backdrop-blur-sm p-3 flex justify-between items-center shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-slate-800 border border-cyan-500/50 overflow-hidden relative shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            <img src="https://czrimg.godqb.com/game/v2/play2/1.png" alt="Hero" className="w-full h-full object-cover scale-125 translate-y-1" />
          </div>
          
          <div className="flex flex-col gap-0.5">
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-400 tracking-wide font-['Press_Start_2P']">HERO</span>
                <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1 rounded">LV.{userData?.level || 1}</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-24 h-2 bg-slate-950 rounded-sm border border-slate-700 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 w-full shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>
                  <div className="absolute inset-0 bg-slate-900/80 transition-all duration-300"
                    style={{ left: `${(playerRef.current.health / playerRef.current.maxHealth) * 100}%` }}></div>
               </div>
               <span className="text-[8px] text-slate-400 font-mono">{Math.max(0, playerRef.current.health)}/{playerRef.current.maxHealth}</span>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => setIsInventoryOpen(true)} className="relative p-2 bg-slate-900 border border-cyan-900 rounded hover:border-cyan-500 transition-colors group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-500 group-hover:text-cyan-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="absolute -top-1 -right-1 bg-slate-900 text-[8px] font-bold text-cyan-400 border border-cyan-800 rounded px-1">{runInventory.length}</span>
          </button>
          
          <button onClick={() => setIsStatsOpen(true)} className="p-2 bg-slate-900 border border-slate-700 rounded hover:border-slate-500 transition-colors text-slate-400 hover:text-white">
            <span className="font-serif italic font-bold">i</span>
          </button>
          <button 
            onClick={toggleFullscreen} 
            className="p-2 bg-slate-900 border border-cyan-800 rounded hover:border-cyan-600 transition-colors text-cyan-400 hover:text-cyan-300"
          >
            {isFullscreen ? '退出全屏' : '全屏'}
          </button>
          {isAuthenticated && (
            <button 
              onClick={handleLogout}
              className="ml-2 px-3 py-1 text-xs bg-red-900/50 border border-red-800 text-red-400 hover:text-red-300 rounded transition-colors"
            >
              登出
            </button>
          )}
        </div>
      </header>

      {/* GAME MAIN CANVAS */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden w-full">
        <div className="flex-1 relative bg-black">
           {/* Canvas Container */}
           {dungeon ? (
             <DungeonCanvas 
               dungeon={dungeon} 
               onRoomSelect={handleRoomSelect} 
               selectedRoomId={selectedRoom?.id || null} 
               inputRef={inputRef} playerRef={playerRef}
               visitedRef={visitedRef} enemiesRef={enemiesRef}
               projectilesRef={projectilesRef} floatingTextsRef={floatingTextsRef}
               onOpenChest={handleOpenChest}
               onExtract={handleExtract}
               onGameOver={handleGameOver}
               skinData={userSkin?.skin || null}
             />
           ) : (
             <div className="absolute inset-0 flex items-center justify-center text-cyan-500 animate-pulse font-mono tracking-widest text-sm">
                SYSTEM INITIALIZING...
             </div>
           )}

           {/* --- CONTROLS OVERLAY --- */}
           
           {/* MiniMap (Top Right) */}
           <div className="absolute top-4 right-4 z-20">
             {dungeon && <MiniMap dungeon={dungeon} playerRef={playerRef} visitedRef={visitedRef} onRegenerate={() => regenerate(difficulty)} />}
           </div>

           {/* Joystick (Bottom Left) */}
           <div className="absolute bottom-12 left-12 z-50">
              <Joystick onMove={handleJoystickMove} onStop={handleJoystickStop} />
           </div>
           
           {/* Action Buttons (Bottom Right) */}
           <div className="absolute bottom-12 right-12 z-50">
              <CyberDashButton 
                active={dashBtnActive}
                onPress={() => { inputRef.current.isDodging = true; setDashBtnActive(true); }}
                onRelease={() => { inputRef.current.isDodging = false; setDashBtnActive(false); }}
              />
           </div>
        </div>
      </main>

      {/* OVERLAYS */}
      {isChestOpen && <ChestModal loot={currentLoot} onConfirm={handleConfirmLoot} />}
      {isInventoryOpen && <InventoryModal 
        items={runInventory} 
        onClose={() => setIsInventoryOpen(false)} 
        originalItems={originalInventoryItems} 
      />}
      {isStatsOpen && <StatsModal playerState={playerRef.current} onClose={() => setIsStatsOpen(false)} />}
      {isSummaryOpen && <SummaryModal type={summaryType} inventory={runInventory} onRestart={handleReturnHome} />}
      
      {/* 登录页面 - 覆盖整个应用 */}
      {!isAuthenticated && !checkingAuth && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999,
          pointerEvents: 'auto',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{
            backgroundColor: '#111',
            border: '3px solid #00ffff',
            borderRadius: '10px',
            padding: '30px',
            width: '400px',
            boxShadow: '0 0 30px rgba(0, 255, 255, 0.5)'
          }}>
            <h1 style={{
              color: '#00ffff',
              fontSize: '28px',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '20px',
              textShadow: '0 0 10px #00ffff'
            }}>
              赛博地牢登录
            </h1>
            
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="用户名"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '16px',
                  backgroundColor: '#222',
                  border: '2px solid #444',
                  borderRadius: '5px',
                  color: '#fff',
                  outline: 'none'
                }}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <input
                type="password"
                placeholder="密码"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '16px',
                  backgroundColor: '#222',
                  border: '2px solid #444',
                  borderRadius: '5px',
                  color: '#fff',
                  outline: 'none'
                }}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            {loginError && (
              <div style={{
                color: '#ff0000',
                fontSize: '14px',
                marginBottom: '15px',
                textAlign: 'center'
              }}>
                {loginError}
              </div>
            )}
            
            <button
              onClick={(e) => {
                // 立即执行alert确保用户看到反馈
                alert('登录按钮已点击！正在处理登录...');
                
                // 调用登录处理函数
                handleLogin();
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                backgroundColor: '#00ffff',
                color: '#000',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(0, 255, 255, 0.7)'
              }}
            >
              登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;