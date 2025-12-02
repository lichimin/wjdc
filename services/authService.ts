// API基础URL
const API_BASE_URL = 'http://8.130.43.130:10005';

// 存储键名常量
const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
};

// 用户数据类型
interface UserData {
  id: number;
  username: string;
  gold: number;
  level: number;
}

// API响应类型
interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  token?: string;
}

// 认证服务类
class AuthService {
  // 登录方法
  async login(username: string, password: string): Promise<{ userData: UserData; token: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data: ApiResponse<UserData> = await response.json();
      
      if (!response.ok || data.code !== 200) {
        throw new Error(data.message || '登录失败');
      }
      
      if (!data.token) {
        throw new Error('服务器未返回认证令牌');
      }
      
      // 保存用户数据和token
      this.saveAuthData(data.data, data.token);
      
      return {
        userData: data.data,
        token: data.token,
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // 注册方法
  async register(username: string, password: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data: ApiResponse = await response.json();
      
      if (!response.ok || data.code !== 200) {
        throw new Error(data.message || '注册失败');
      }
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  // 登出方法
  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  // 获取当前用户信息
  getCurrentUser(): UserData | null {
    try {
      const userDataStr = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userDataStr ? JSON.parse(userDataStr) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // 获取认证令牌
  getAuthToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  // 检查用户是否已登录
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  // 保存认证数据到本地存储
  private saveAuthData(userData: UserData, token: string): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  }

  // 刷新用户信息（可选）
  async refreshUserData(): Promise<UserData | null> {
    try {
      const token = this.getAuthToken();
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/api/v1/user/info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data: ApiResponse<UserData> = await response.json();
      
      if (response.ok && data.code === 200) {
        // 更新本地存储的用户信息
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data.data));
        return data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return null;
    }
  }

  // 更新用户金币数量（游戏内常用功能）
  updateUserGold(gold: number): void {
    const userData = this.getCurrentUser();
    if (userData) {
      userData.gold = gold;
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    }
  }

  // 更新用户等级
  updateUserLevel(level: number): void {
    const userData = this.getCurrentUser();
    if (userData) {
      userData.level = level;
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    }
  }
}

// 导出单例实例
export const authService = new AuthService();

// 导出相关类型
export type { UserData };