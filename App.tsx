import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateDungeon } from './services/dungeonGenerator';
import { generateRoomDescription } from './services/geminiService';
import { generateLoot } from './services/lootService';
import { authService, UserData } from './services/authService';
import { DungeonCanvas } from './components/DungeonCanvas';
import { MiniMap } from './components/MiniMap';
import { ChestModal } from './components/ChestModal';
import { InventoryModal } from './components/InventoryModal';
import { AdventureInventoryModal } from './components/AdventureInventoryModal';
import { StatsModal } from './components/StatsModal';
import { SummaryModal } from './components/SummaryModal';
import { Home } from './components/Home'; // Imported Home
import SimpleLogin from './components/SimpleLogin';
import { DungeonData, Room, ItemType, InputState, PlayerState, Enemy, Projectile, FloatingText, LootItem, Rarity, UserAttributes, UserSkin, SkinData } from './types';
import { playerBaseStats } from './configs/playerConfig';
import { GoogleGenAI } from "@google/genai";

// --- CYBERPUNK JOYSTICK --- 
const Joystick: React.FC<{ 
  onMove: (x: number, y: number) => void,
  onStop: () => void 
}> = ({ onMove, onStop }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  // Adjust default position to be higher up (from bottom: 5rem to bottom: 8rem)
  const [touchPos, setTouchPos] = useState({ x: 64, y: window.innerHeight - 192 }); // Default position at bottom-left, higher up
  const touchIdRef = useRef<number | null>(null); // Track specific touch ID
  const activeTouchCountRef = useRef(0); // Track active touches
  // Store default position (higher up)
  const defaultPosRef = useRef({ x: 64, y: window.innerHeight - 192 });

  const handleStart = (clientX: number, clientY: number, touchId?: number) => {
    if (!active) {
      setActive(true);
      if (touchId !== undefined) {
        touchIdRef.current = touchId;
      }
      // Set joystick position to touch location
      setTouchPos({ x: clientX, y: clientY });
      activeTouchCountRef.current = 1;
    }
    handleMove(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!active) return;
    // Calculate joystick movement relative to touch start position
    let dx = clientX - touchPos.x;
    let dy = clientY - touchPos.y;
    const distance = Math.sqrt(dx*dx + dy*dy);
    const maxRadius = 64; // Fixed radius (128px joystick / 2)
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
    // Reset to default position at bottom-left when not active
    setTouchPos(defaultPosRef.current);
    touchIdRef.current = null;
    activeTouchCountRef.current = 0;
    onStop();
  };

  // Global listeners for touch events and drag outside
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => { 
      if (active) {
        handleMove(e.clientX, e.clientY); 
      } 
    };
    const onMouseUp = (e: MouseEvent) => { 
      if (active) {
        handleEnd(); 
      } 
    };
    const onTouchStart = (e: TouchEvent) => {
      // Handle touch events on left half of screen
      const touch = e.touches[0];
      if (touch.clientX < window.innerWidth / 2) {
        // Only generate new joystick if not already active
        if (!active) {
          e.preventDefault();
          handleStart(touch.clientX, touch.clientY, touch.identifier);
        }
      }
    };
    const onTouchMove = (e: TouchEvent) => { 
      if (active) {
        // Only handle the specific touch that started the joystick
        const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current);
        if (touch) {
          try {
            e.preventDefault();
          } catch (err) {
            // Ignore the warning about preventDefault in passive listener
          }
          handleMove(touch.clientX, touch.clientY);
        }
      } 
    };
    const onTouchEnd = (e: TouchEvent) => { 
      if (active) {
        // Only end if the specific touch that started the joystick has ended
        const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
        if (touch) {
          handleEnd();
        }
      } 
    };

    // Always listen for touch start events to generate joystick
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    
    if (active) {
      // Use normal event listeners instead of capture phase to avoid conflicts
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      // Remove passive: false to avoid warning, since preventDefault is wrapped in try-catch
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
      window.addEventListener('touchcancel', onTouchEnd);
    }
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [active]);

  return (
    <div 
      ref={containerRef} 
      className={`w-32 h-32 relative touch-none select-none group`}
      onMouseDown={(e) => {
        // Only prevent default for the initial click
        if (!active) {
          e.preventDefault();
          handleStart(e.clientX, e.clientY);
        }
      }}
      style={{
        // Position joystick at touch location when active
        position: active ? 'fixed' : 'absolute',
        left: active ? `${touchPos.x - 64}px` : '1rem',
        top: active ? `${touchPos.y - 64}px` : 'calc(100% - 8rem)',
        // Prevent text selection and touch highlighting
        userSelect: 'none',
        touchAction: 'none',
        // Ensure high z-index to capture events
        zIndex: 1000
      }}
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
      onTouchStart={onPress} onTouchEnd={onRelease}
      // Prevent text selection but allow touch events to propagate
      style={{
        userSelect: 'none',
        touchAction: 'manipulation'
      }}
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
  const [difficultyLevel, setDifficultyLevel] = useState('B'); // 新增difficultyLevel状态
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loginError, setLoginError] = useState('');
  const [userSkin, setUserSkin] = useState<UserSkin | null>(null);
  const [userAttributes, setUserAttributes] = useState<UserAttributes | null>(null);

  // Game View State
  const [dungeon, setDungeon] = useState<DungeonData | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [lore, setLore] = useState<string>("");
  const [loadingLore, setLoadingLore] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false); // Loading state for game startup
  
  // Treasure Data State
  const [treasureData, setTreasureData] = useState<any[]>([]);
  
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

  // Removed auto-fullscreen on game start as per user request

  // Check authentication status on mount
  useEffect(() => {
    // 清除之前的认证数据以方便测试
    // localStorage.removeItem('auth_token');
    // localStorage.removeItem('user_data');
    
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
  
  // Fetch user skins when authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserSkins();
    }
  }, [isAuthenticated]);

  // Fetch user skins data from API
  const fetchUserSkins = async () => {
    console.log('=== App: 开始获取用户皮肤数据 ===');
    if (!isAuthenticated) {
      console.log('1. 用户未认证，跳过获取皮肤数据');
      return;
    }
    
    try {
      const token = authService.getAuthToken();
      console.log('2. 获取令牌:', token ? '存在' : '不存在');
      if (!token) throw new Error('No authentication token found');
      
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://8.130.43.130:10005';
      console.log('3. API基础URL:', apiBaseUrl);
      console.log('4. 开始发起网络请求获取皮肤数据...');
      const response = await fetch(`${apiBaseUrl}/api/v1/user/skins?&is_active=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('5. 网络请求完成，响应状态:', response.status);
      
      // 处理token过期情况
      if (response.status === 401) {
        console.log('6. Token已过期，执行登出操作');
        handleLogout();
        return;
      }
      
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch skins');
      
      console.log('7. 皮肤数据获取成功:', data.data);
      // 从返回的数组中获取第一个皮肤（应该是唯一的激活皮肤）
      setUserSkin(data.data.length > 0 ? data.data[0] : null);
    } catch (error) {
      console.error('8. 获取皮肤数据失败:', error);
      // 如果是token过期，执行登出
      if (error instanceof Error && error.message.includes('401')) {
        handleLogout();
      }
    }
  };

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
      
      // 登录成功后获取用户皮肤数据
      await fetchUserSkins();
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
  const [runInventory, setRunInventory] = useState<LootItem[]>([]); // 临时背包：保存本次对局获得的宝物
  const [inventoryLoading, setInventoryLoading] = useState(false);
  
  const [isInventoryOpen, setIsInventoryOpen] = useState(false); // 控制临时背包的显示
  const [isHomeInventoryOpen, setIsHomeInventoryOpen] = useState(false); // 控制home页面的inventory显示
  const [forceUpdateCount, setForceUpdateCount] = useState(0);
  
  // 强制更新整个应用
  const forceUpdate = () => {
    console.log('强制更新整个应用');
    setForceUpdateCount(prev => prev + 1);
  };
  
  // 将forceUpdate添加到window对象，以便在组件中调用
  useEffect(() => {
    (window as any).forceUpdate = forceUpdate;
    return () => {
      delete (window as any).forceUpdate;
    };
  }, []);
  
  // Fetch backpack items from API
  const fetchBackpackItems = async () => {
    console.log('=== App: 开始获取背包数据 ===');
    if (!isAuthenticated) {
      console.log('1. 用户未认证，跳过获取背包数据');
      return;
    }
    
    console.log('2. 设置加载状态为true');
    setInventoryLoading(true);
    try {
      const token = authService.getAuthToken();
      console.log('3. 获取令牌:', token ? '存在' : '不存在');
      if (!token) throw new Error('No authentication token found');
      
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      console.log('4. API基础URL:', apiBaseUrl);
      console.log('5. 开始发起网络请求获取背包数据...');
      const response = await fetch(`${apiBaseUrl}/api/v1/my-items?position=backpack`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('6. 网络请求完成，响应状态:', response.status);
      
      // 处理token过期情况
      if (response.status === 401) {
        console.log('7. Token已过期，执行登出操作');
        handleLogout();
        return;
      }
      
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
        
        // Use the original API returned id field as the unique identifier
        // According to API documentation, id is guaranteed to be unique across all items
        // Fallback to a unique generated ID if id is not available
        const generatedId = item.id || `${index}-${Math.random().toString(36).substr(2, 9)}`;
        
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
      
      // Check for duplicate IDs in mappedItems
      const ids = mappedItems.map(item => item.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.error('=== 发现重复ID ===');
        const idCounts: Record<string, number> = {};
        ids.forEach(id => {
          idCounts[id] = (idCounts[id] || 0) + 1;
        });
        const duplicateIds = Object.entries(idCounts).filter(([_, count]) => count > 1);
        console.error('重复的ID:', duplicateIds);
        console.error('所有ID:', ids);
      }
      
      // Save original API data for equipment details
      setOriginalInventoryItems(data.data);
      setInventory(mappedItems);
    } catch (error) {
      console.error('Failed to fetch backpack items:', error);
    } finally {
      setInventoryLoading(false);
    }
  };  
  
  // Fetch treasure data from API
  const fetchTreasureData = async () => {
    if (!isAuthenticated) return [];
    
    try {
      const token = authService.getAuthToken();
      if (!token) throw new Error('No authentication token found');
      
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/api/v1/treasures`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // 处理token过期情况
      if (response.status === 401) {
        console.log('Token已过期，执行登出操作');
        handleLogout();
        return [];
      }
      
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch treasure data');
      
      return data.data;
    } catch (error) {
      console.error('Error fetching treasure data:', error);
      return [];
    }
  };
  
  // Fetch user attributes
  const fetchUserAttributes = async () => {
    console.log('=== App: 开始获取用户属性数据 ===');
    if (!isAuthenticated) {
      console.log('1. 用户未认证，跳过获取用户属性数据');
      return;
    }
    
    try {
      const token = authService.getAuthToken();
      console.log('2. 获取令牌:', token ? '存在' : '不存在');
      if (!token) throw new Error('No authentication token found');
      
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      console.log('3. API基础URL:', apiBaseUrl);
      console.log('4. 开始发起网络请求获取用户属性数据...');
      const response = await fetch(`${apiBaseUrl}/api/v1/user/attributes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('5. 网络请求完成，响应状态:', response.status);
      
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch user attributes');
      
      setUserAttributes(data.data);
      
      // Apply attributes to player
      if (data.data) {
        console.log('6. 应用用户属性到玩家:', data.data);
        playerRef.current.damage = (playerBaseStats.damage || 15) + data.data.攻击力;
        playerRef.current.speed = (playerBaseStats.speed || 3.5) + parseFloat(data.data.移动速度) / 100;
        playerRef.current.projectileSpeed = (playerBaseStats.projectileSpeed || 8) + parseFloat(data.data.子弹速度) / 100;
        playerRef.current.attackSpeed = (playerBaseStats.attackSpeed || 1) + parseFloat(data.data.攻击速度) / 100;
        playerRef.current.maxHealth = (playerBaseStats.maxHealth || 100) + data.data.生命值;
        playerRef.current.health = Math.min(playerRef.current.health, playerRef.current.maxHealth);
        playerRef.current.critRate = (playerBaseStats.critRate || 0.05) + parseFloat(data.data.暴击率) / 100;
        playerRef.current.critDamage = (playerBaseStats.critDamage || 0.15) + (parseFloat(data.data.暴击伤害) / 100 - 1); // Convert to decimal (e.g., 150% -> 0.5)
        playerRef.current.lifesteal = (playerBaseStats.lifesteal || 0.03) + parseFloat(data.data.吸血) / 100;
        playerRef.current.dodgeRate = (playerBaseStats.dodgeRate || 0.05) + parseFloat(data.data.闪避) / 100;
        playerRef.current.instantKillRate = (playerBaseStats.instantKillRate || 0.01) + parseFloat(data.data.秒杀) / 100;
        playerRef.current.damageReduction = (playerBaseStats.damageReduction || 0) + parseFloat(data.data.减伤) / 100;
        playerRef.current.regen = (playerBaseStats.regen || 5) + data.data.恢复;
      }
    } catch (error) {
      console.error('=== App: 获取用户属性数据失败:', error);
    }
  };
  
  // 移除了Home背包打开时的fetchBackpackItems调用，因为InventoryModal组件内部已经会调用refreshInventoryData()获取数据
  
  // Fetch user attributes when entering adventure
  useEffect(() => {
    if (gameState === 'PLAYING') {
      fetchUserAttributes();
    }
  }, [gameState]);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryType, setSummaryType] = useState<'success' | 'failure'>('success');

  // Input State
  const [dashBtnActive, setDashBtnActive] = useState(false);
  const [skillCooldown, setSkillCooldown] = useState(0);
  const [skillActive, setSkillActive] = useState(false);
  const [skillDirection, setSkillDirection] = useState<'left' | 'right'>('right');
  const activateSkillRef = useRef<((direction: 'left' | 'right') => void) | null>(null);
  
  // Heal Skill State
  const [healSkillCooldown, setHealSkillCooldown] = useState(0);
  const [healSkillActive, setHealSkillActive] = useState(false);
  const activateHealSkillRef = useRef<(() => void) | null>(null);
  
  // Roll Skill State
  const [rollSkillCooldown, setRollSkillCooldown] = useState(0);
  const rollSkillRef = useRef<() => void>(null);
  const inputRef = useRef<InputState>({ dx: 0, dy: 0, isAttacking: false, attackPressed: false, isDodging: false });
  const playerRef = useRef<PlayerState>({
    x: 0, y: 0, facingLeft: false, isMoving: false, frameIndex: 0, lastFrameTime: 0,
    health: playerBaseStats.maxHealth || 100, 
    maxHealth: playerBaseStats.maxHealth || 100, 
    attackCooldown: 0, 
    fireCooldown: 0, 
    invincibilityTimer: 0,
    damage: playerBaseStats.damage || 15, 
    speed: playerBaseStats.speed || 3.5, 
    projectileSpeed: playerBaseStats.projectileSpeed || 8, 
    attackSpeed: playerBaseStats.attackSpeed || 1,
    attackRange: playerBaseStats.attackRange || 250,
    critRate: playerBaseStats.critRate || 0.05, 
    critDamage: playerBaseStats.critDamage || 0.15, 
    dodgeRate: playerBaseStats.dodgeRate || 0.05, 
    regen: playerBaseStats.regen || 5, 
    regenTimer: 0, 
    lifesteal: playerBaseStats.lifesteal || 0.03, 
    instantKillRate: playerBaseStats.instantKillRate || 0.01,
    damageReduction: playerBaseStats.damageReduction || 0,
    rollTimer: 0, 
    rollCooldown: 0, 
    rollVx: 0, 
    rollVy: 0,
    interactionTargetId: null, 
    interactionTimer: 0
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
  
  // Skill Cooldown Timer
  useEffect(() => {
    if (skillCooldown > 0) {
      const timer = setTimeout(() => {
        setSkillCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [skillCooldown]);
  
  // Heal Skill Cooldown Timer
  useEffect(() => {
    if (healSkillCooldown > 0) {
      const timer = setTimeout(() => {
        setHealSkillCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [healSkillCooldown]);
  
  // Roll Skill Cooldown Timer
  useEffect(() => {
    if (rollSkillCooldown > 0) {
      const timer = setTimeout(() => {
        setRollSkillCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [rollSkillCooldown]);

  // Function to preload all treasure images
  const preloadImages = async (treasures: any[]) => {
    if (!treasures || treasures.length === 0) return Promise.resolve();
    
    const imagePromises = treasures.map(treasure => {
      return new Promise<void>((resolve, reject) => {
        if (!treasure.image_url) {
          resolve();
          return;
        }
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Continue even if some images fail to load
        img.src = treasure.image_url.replace(/`/g, ''); // Remove any backticks from URL
      });
    });
    
    return Promise.all(imagePromises);
  };
  
  // Function to preload player skin images
  const preloadSkinImages = async (skin: any) => {
    if (!skin) return Promise.resolve();
    
    const loadImages = (urls: string[]): Promise<void[]> => {
      return Promise.all(
        urls.map(url => {
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            img.onload = () => resolve();
            img.onerror = () => {
              console.error(`Failed to load skin image: ${url}`);
              resolve(); // 即使加载失败也继续，避免游戏中断
            };
          });
        })
      );
    };
    
    return Promise.all([
      loadImages(skin.idle_image_urls),
      loadImages(skin.attack_image_urls),
      loadImages(skin.move_image_urls)
    ]);
  };
  
  const startGame = async (selectedDifficulty: number) => {
    if (!isAuthenticated) {
      // 如果未登录，可以选择跳转到登录页或者弹出提示
      // 这里我们选择直接开始游戏，但在实际场景中可能需要强制登录
      console.warn('Playing without authentication');
    }
    
    setDifficulty(selectedDifficulty);
    
    // Set game state to playing first
    setGameState('PLAYING');
    
    // Show loading overlay after entering dungeon
    setLoadingGame(true);
    
    // Fetch treasure data
    const treasures = await fetchTreasureData();
    setTreasureData(treasures);
    
    // Fetch user attributes data
    await fetchUserAttributes();
    
    // Preload all treasure images
    await preloadImages(treasures);
    
    // Preload player skin images
    if (userSkin?.skin) {
      await preloadSkinImages(userSkin.skin);
    }
    
    // Regenerate dungeon with new treasure data
    regenerate(selectedDifficulty);
    
    // Close loading overlay once everything is ready
    setLoadingGame(false);
  };

  const regenerate = (diff: number = 1) => {
    // Convert difficulty number to difficulty level string
    const difficultyLevelMap = {
      1: 'B',
      2: 'A',
      3: 'S',
      4: 'SS',
      5: 'SSS'
    };
    const newDifficultyLevel = difficultyLevelMap[diff as keyof typeof difficultyLevelMap] || 'B';
    
    // 更新difficultyLevel状态
    setDifficultyLevel(newDifficultyLevel);
    
    const newData = generateDungeon(diff, newDifficultyLevel);
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
    setRunInventory([]); // 清空临时背包，准备新的对局
    
    // 打印地图难度和宝箱数量
    console.log(`地图难度: ${newDifficultyLevel} (数值: ${diff})`);
    // 统计所有房间中的宝箱数量
    const chestCount = newData.rooms.flatMap(room => 
      room.items.filter(item => item.type === 'CHEST').length
    ).reduce((sum, count) => sum + count, 0);
    console.log(`当前地图宝箱数量: ${chestCount}`);
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
    // Find the chest in the dungeon
    let chestType: 'normal' | 'large' = 'normal';
    if (dungeon) {
      for (const room of dungeon.rooms) {
        const chest = room.items.find(item => item.id === chestId && item.type === ItemType.CHEST);
        if (chest) {
          chestType = chest.chestType || 'normal';
          break;
        }
      }
    }
    
    // 根据难度等级生成不同数量的宝物（减半，最少1个）
    let count: number;
    switch (difficultyLevel) {
      case 'B':
        count = 1; // 1件（原1-3件减半后最少1件）
        break;
      case 'A':
        count = Math.floor(Math.random() * 2) + 1; // 1-2件（原2-4件减半）
        break;
      case 'S':
        count = 2; // 2件（原3-5件减半）
        break;
      case 'SS':
        count = Math.floor(Math.random() * 2) + 2; // 2-3件（原4-6件减半）
        break;
      case 'SSS':
        count = Math.floor(Math.random() * 2) + 3; // 3-4件（原5-8件减半）
        break;
      default:
        count = 1; // 默认1件（原1-3件减半后最少1件）
    }
    const loot = generateLoot(count, treasureData, difficulty, difficultyLevel, chestType);
    setCurrentLoot(loot);
    setIsChestOpen(true);
    
    // 打印开启的宝物信息
    console.log(`开启宝箱获得的宝物:`);
    loot.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} - 等级: ${item.level}, 数量: ${item.quantity}, 稀有度: ${item.rarity}`);
    });
  };

  const handleConfirmLoot = (selectedItems: LootItem[]) => {
    // Generate unique IDs for each item to prevent duplicate keys
    const itemsWithUniqueIds = selectedItems.map((item, index) => ({
      ...item,
      id: `loot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${index}`
    }));
    
    // 创建临时背包的副本用于更新
    const updatedRunInventory = [...runInventory];
    
    // 实现物品合并逻辑（相同item_id的物品合并，quantity+1）
    itemsWithUniqueIds.forEach(newItem => {
      // 检查临时背包中是否已有相同item_id的物品
      const existingItemIndex = updatedRunInventory.findIndex(item => item.item_id === newItem.item_id);
      
      if (existingItemIndex !== -1) {
        // 如果已有相同item_id的物品，合并数量
        const existingItem = updatedRunInventory[existingItemIndex];
        updatedRunInventory[existingItemIndex] = {
          ...existingItem,
          quantity: (existingItem.quantity || 1) + (newItem.quantity || 1)
        };
      } else {
        // 如果没有相同item_id的物品，直接添加
        updatedRunInventory.push(newItem);
      }
    });
    
    // 更新临时背包状态
    setRunInventory(updatedRunInventory);
    
    // 打印临时背包中的数据
    console.log('=== 临时背包数据 (获得新物品后) ===');
    console.log(updatedRunInventory);
    
    setIsChestOpen(false);
    setCurrentLoot([]);
  };

  const handleExtract = useCallback(async () => {
    try {
      // 打印临时背包当前数据
      console.log('=== 临时背包数据 (准备撤离时) ===');
      console.log(runInventory);
      
      // 准备请求参数：只包含item_id和quantity
      const requestData = runInventory.map(item => ({
        item_id: item.item_id, // 使用宝物的item_id字段
        quantity: item.quantity || 1 // 数量
      }));
      
      // 打印请求保存物品接口的传参
      console.log('=== 撤离保存接口传参 (api/v1/my-items) ===');
      console.log(JSON.stringify(requestData, null, 2));
      
      // 获取认证token
      const token = authService.getAuthToken();
      if (!token) {
        console.error('No authentication token found');
        // 如果没有token，显示失败的结算界面
        setSummaryType('failure');
        setIsSummaryOpen(true);
        return;
      }
      
      // 获取API基础URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://8.130.43.130:10005';
      
      // 发送请求到/api/v1/my-items接口保存物品
      const response = await fetch(`${apiBaseUrl}/api/v1/my-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        console.log('Items sent successfully:', requestData);
        // 请求成功后显示成功的结算界面
        setSummaryType('success');
        setIsSummaryOpen(true);
      } else {
        console.error('Failed to send items:', response.status, await response.text());
        // 请求失败时显示失败的结算界面
        setSummaryType('failure');
        setIsSummaryOpen(true);
      }
    } catch (error) {
      console.error('Error sending items:', error);
      // 发生错误时显示失败的结算界面
      setSummaryType('failure');
      setIsSummaryOpen(true);
    }
  }, [runInventory, authService]);

  const handleGameOver = useCallback(() => {
    // 打印对局失败前的临时背包数据
    console.log('=== 临时背包数据 (对局失败前) ===');
    console.log(runInventory);
    
    setRunInventory([]); // 对局失败，清空临时背包
    setSummaryType('failure');
    setIsSummaryOpen(true);
  }, [runInventory]);

  const handleReturnHome = (shouldClearRunInventory: boolean = true) => {
    // 打印返回主页前的临时背包数据
    console.log('=== 临时背包数据 (返回主页前) ===');
    console.log(runInventory);
    
    // 根据传入的参数决定是否清空临时背包
    if (shouldClearRunInventory) {
      setRunInventory([]);
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
              onOpenInventory={() => setIsHomeInventoryOpen(true)}
              onLogout={handleLogout}
              onSkinLoaded={setUserSkin}
              onGoldUpdate={(newGold) => {
                setUserData(prev => prev ? { ...prev, gold: newGold } : null);
                authService.updateUserGold(newGold);
              }}
              userSkin={userSkin}
            />
          )}
        {/* Inventory Overlay for Home */}
        {isHomeInventoryOpen && (
          <InventoryModal 
              items={inventory} 
              onClose={() => setIsHomeInventoryOpen(false)} 
              originalItems={originalInventoryItems} 
              skinData={userSkin?.skin || null}
              onInventoryUpdate={(updatedItems) => {
                console.log('=== App: 收到首页背包更新通知 ===');
                console.log('1. 更新首页背包状态:', updatedItems);
                setInventory(updatedItems);
                // 移除了重复的fetchBackpackItems调用，因为InventoryModal已经获取了最新数据
              }}
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
            <img src="/res/game/v2/play2/1.png" alt="Hero" className="w-full h-full object-cover scale-125 translate-y-1" style={{ transform: `scale(${userSkin?.skin?.scale ? (userSkin.skin.scale / 100) * 1.1 * 1.25 : 1.375})` }} />
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
          {/* 右上角的临时背包（INVENTORY） */}
          <button onClick={() => setIsInventoryOpen(true)} className="relative p-2 bg-slate-900 border border-cyan-900 rounded hover:border-cyan-500 transition-colors group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-500 group-hover:text-cyan-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            {/* 显示临时背包中的物品数量 */}
            <span className="absolute -top-1 -right-1 bg-slate-900 text-[8px] font-bold text-cyan-400 border border-cyan-800 rounded px-1">{runInventory.length}</span>
          </button>
          
          <button onClick={() => setIsStatsOpen(true)} className="p-2 bg-slate-900 border border-slate-700 rounded hover:border-slate-500 transition-colors text-slate-400 hover:text-white">
            <span className="font-serif italic font-bold">i</span>
          </button>
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
               onActivateSkill={(skillFn) => { activateSkillRef.current = skillFn; }}
               onActivateHealSkill={(healSkillFn) => { activateHealSkillRef.current = healSkillFn; }}
               onRollCooldown={(cooldown) => { setRollSkillCooldown(cooldown); }}
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
           
           {/* 临时背包的模态窗口 */}
           {isInventoryOpen && (
             <InventoryModal 
                 items={runInventory} 
                 onClose={() => setIsInventoryOpen(false)} 
                 // 临时背包不需要原始API数据，因为只是显示本次对局获得的物品
                 skinData={userSkin?.skin || null}
               />
           )}

           {/* Joystick (Bottom Left) */}
           <div className="absolute bottom-8 left-8 z-50">
              <Joystick onMove={handleJoystickMove} onStop={handleJoystickStop} />
           </div>
           
           {/* Action Buttons (Bottom Right) */}
           <div className="absolute bottom-8 right-8 z-50 flex flex-col items-end gap-2">
              {/* Top Row: Skill & Heal */}
              <div className="flex gap-2">
                {/* Heal Button - Top Left */}
                <button 
                  className={`w-14 h-14 bg-gradient-to-br from-green-900/70 to-green-800/70 border-3 border-green-700/80 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(74,222,128,0.6)] transition-all active:scale-95 relative ${healSkillCooldown > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-800/80 hover:to-green-700/80 cursor-pointer'}`}
                  disabled={healSkillCooldown > 0}
                  onClick={() => {
                    if (healSkillCooldown === 0 && !healSkillActive) {
                      setHealSkillActive(true);
                      setHealSkillCooldown(60); // 60 seconds cooldown
                      
                      if (activateHealSkillRef.current) {
                        activateHealSkillRef.current();
                      }
                      
                      setTimeout(() => {
                        setHealSkillActive(false);
                      }, 10000);
                    }
                  }}
                >
                  {/* Pixel Heal Icon */}
                  <svg width="32" height="32" viewBox="0 0 8 8" className="w-8 h-8">
                    <circle cx="4" cy="2" r="1" fill="white" />
                    <path d="M4,3 L4,6" stroke="white" strokeWidth="1" />
<path d="M2,5 L6,5" stroke="white" strokeWidth="1" />
<path d="M1,6 L3,8 M5,8 L7,6" stroke="white" strokeWidth="1" />
                  </svg>
                  
                  {healSkillCooldown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center font-pixel text-xs font-bold text-white">
                      {healSkillCooldown}
                    </div>
                  )}
                </button>
                
                {/* Skill Button - Top Right */}
                <button 
                  className={`w-14 h-14 bg-gradient-to-br from-purple-900/70 to-purple-800/70 border-3 border-purple-700/80 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(168,85,247,0.6)] transition-all active:scale-95 relative ${skillCooldown > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:from-purple-800/80 hover:to-purple-700/80 cursor-pointer'}`}
                  disabled={skillCooldown > 0}
                  onClick={() => {
                    if (skillCooldown === 0 && !skillActive) {
                      const direction = inputRef.current.dx < 0 ? 'left' : 'right';
                      setSkillDirection(direction);
                      setSkillActive(true);
                      setSkillCooldown(30); // 30 seconds cooldown
                      
                      if (activateSkillRef.current) {
                        activateSkillRef.current(direction);
                      }
                      
                      setTimeout(() => {
                        setSkillActive(false);
                      }, 1500);
                    }
                  }}
                >
                  {/* Pixel Skill Icon */}
                  <svg width="32" height="32" viewBox="0 0 8 8" className="w-8 h-8">
                    <rect x="2" y="0" width="4" height="2" fill="white" />
                    <rect x="1" y="2" width="6" height="4" fill="white" />
                    <rect x="0" y="6" width="8" height="2" fill="white" />
                  </svg>
                  
                  {skillCooldown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center font-pixel text-xs font-bold text-white">
                      {skillCooldown}
                    </div>
                  )}
                </button>
              </div>
              
              {/* Bottom Row: Dodge & Attack */}
              <div className="flex items-end gap-2">
                {/* Dodge Button - Bottom Left */}
                <button 
                  className={`w-14 h-14 bg-gradient-to-br from-blue-900/70 to-blue-800/70 border-3 border-blue-700/80 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all active:scale-95 relative ${dashBtnActive ? 'from-blue-800/80 to-blue-700/80' : 'hover:from-blue-800/80 hover:to-blue-700/80 cursor-pointer'} ${rollSkillCooldown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={rollSkillCooldown > 0}
                  onMouseDown={(e) => { if (rollSkillCooldown === 0) { inputRef.current.isDodging = true; setDashBtnActive(true); } }}
                  onMouseUp={(e) => { inputRef.current.isDodging = false; setDashBtnActive(false); }}
                  onMouseLeave={(e) => { inputRef.current.isDodging = false; setDashBtnActive(false); }}
                  onTouchStart={(e) => { if (rollSkillCooldown === 0) { inputRef.current.isDodging = true; setDashBtnActive(true); } }}
                  onTouchEnd={(e) => { inputRef.current.isDodging = false; setDashBtnActive(false); }}
                  onTouchCancel={(e) => { inputRef.current.isDodging = false; setDashBtnActive(false); }}
                  onClick={() => {
                    if (rollSkillCooldown === 0) {
                      // 设置冷却时间，与playerConfig.ts中的配置一致
                      setRollSkillCooldown(Math.round((playerBaseStats.rollCooldown || 20000) / 1000));
                    }
                  }}
                >
                  {/* Pixel Dash Icon */}
                  <svg width="32" height="32" viewBox="0 0 8 8" className="w-8 h-8">
                    <path d="M1,4 L6,4" stroke="white" strokeWidth="1" strokeDasharray="1,1" />
<path d="M4,2 L7,5 L4,8" stroke="white" strokeWidth="1" fill="none" />
                    <circle cx="1" cy="4" r="1" fill="white" />
                  </svg>
                  {rollSkillCooldown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center font-pixel text-xs font-bold text-white">
                      {rollSkillCooldown}
                    </div>
                  )}
                </button>
              </div>
           </div>
        </div>
      </main>

      {/* OVERLAYS */}
      {/* Loading Overlay */}
      {loadingGame && (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-950 to-black opacity-95 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 border-4 border-cyan-900 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
            <div className="text-cyan-500 font-mono tracking-wider text-lg">LOADING DUNGEON...</div>
            <div className="text-slate-500 text-sm mt-2">Initializing systems and loading assets</div>
          </div>
        </div>
      )}
      
      {isChestOpen && <ChestModal loot={currentLoot} onConfirm={handleConfirmLoot} />}
      {isInventoryOpen && <AdventureInventoryModal 
        items={runInventory} 
        onClose={() => setIsInventoryOpen(false)} 
      />}
      {isStatsOpen && <StatsModal playerState={playerRef.current} userAttributes={userAttributes} onClose={() => setIsStatsOpen(false)} />}
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