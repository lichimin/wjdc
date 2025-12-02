import React, { useState } from 'react';

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
  loading?: boolean;
  error?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  onLogin, 
  onSwitchToRegister,
  loading = false,
  error = ''
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 简单验证
    if (!username.trim()) {
      setLocalError('请输入用户名');
      return;
    }
    
    if (!password.trim()) {
      setLocalError('请输入密码');
      return;
    }
    
    setLocalError('');
    await onLogin(username, password);
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label 
            htmlFor="username" 
            className="block text-xs text-cyan-400 font-mono tracking-wider"
          >
            USERNAME
          </label>
          <div className="relative">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入用户名"
              className="w-full bg-slate-900/80 border border-cyan-500/30 rounded px-4 py-3 text-gray-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 transition-all"
              disabled={loading}
            />
            <div className="absolute inset-0 pointer-events-none border border-cyan-400/0 rounded animate-pulse transition-all"></div>
          </div>
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="password" 
            className="block text-xs text-cyan-400 font-mono tracking-wider"
          >
            PASSWORD
          </label>
          <div className="relative">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              className="w-full bg-slate-900/80 border border-cyan-500/30 rounded px-4 py-3 text-gray-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 transition-all"
              disabled={loading}
            />
            <div className="absolute inset-0 pointer-events-none border border-cyan-400/0 rounded animate-pulse transition-all"></div>
          </div>
        </div>

        {(localError || error) && (
          <div className="px-4 py-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm font-mono">
            {localError || error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-gradient-to-r from-cyan-900/80 to-blue-900/80 border-2 border-cyan-500 rounded-lg flex items-center justify-center font-mono text-cyan-400 tracking-wide active:scale-95 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <span>登录中...</span>
            </div>
          ) : (
            '登录'
          )}
        </button>

        <div className="text-center pt-2">
          <span className="text-sm text-slate-400">还没有账号？</span>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="ml-2 text-cyan-400 text-sm hover:text-cyan-300 transition-colors font-mono"
          >
            立即注册
          </button>
        </div>
      </form>
    </div>
  );
};