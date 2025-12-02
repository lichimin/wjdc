import React, { useState } from 'react';

interface RegisterFormProps {
  onRegister: (username: string, password: string) => Promise<void>;
  onSwitchToLogin: () => void;
  loading?: boolean;
  error?: string;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ 
  onRegister, 
  onSwitchToLogin,
  loading = false,
  error = ''
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证表单
    if (!username.trim()) {
      setLocalError('请输入用户名');
      return;
    }
    
    if (username.length < 3 || username.length > 20) {
      setLocalError('用户名长度应在3-20个字符之间');
      return;
    }
    
    if (!password.trim()) {
      setLocalError('请输入密码');
      return;
    }
    
    if (password.length < 6) {
      setLocalError('密码长度至少为6个字符');
      return;
    }
    
    if (password !== confirmPassword) {
      setLocalError('两次输入的密码不一致');
      return;
    }
    
    setLocalError('');
    await onRegister(username, password);
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label 
            htmlFor="reg-username" 
            className="block text-xs text-cyan-400 font-mono tracking-wider"
          >
            USERNAME
          </label>
          <div className="relative">
            <input
              id="reg-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="设置用户名"
              className="w-full bg-slate-900/80 border border-cyan-500/30 rounded px-4 py-3 text-gray-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 transition-all"
              disabled={loading}
            />
            <div className="absolute inset-0 pointer-events-none border border-cyan-400/0 rounded animate-pulse transition-all"></div>
          </div>
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="reg-password" 
            className="block text-xs text-cyan-400 font-mono tracking-wider"
          >
            PASSWORD
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="设置密码"
              className="w-full bg-slate-900/80 border border-cyan-500/30 rounded px-4 py-3 text-gray-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 transition-all"
              disabled={loading}
            />
            <div className="absolute inset-0 pointer-events-none border border-cyan-400/0 rounded animate-pulse transition-all"></div>
          </div>
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="reg-confirm-password" 
            className="block text-xs text-cyan-400 font-mono tracking-wider"
          >
            CONFIRM PASSWORD
          </label>
          <div className="relative">
            <input
              id="reg-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="确认密码"
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
              <span>注册中...</span>
            </div>
          ) : (
            '注册'
          )}
        </button>

        <div className="text-center pt-2">
          <span className="text-sm text-slate-400">已有账号？</span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="ml-2 text-cyan-400 text-sm hover:text-cyan-300 transition-colors font-mono"
          >
            返回登录
          </button>
        </div>
      </form>
    </div>
  );
};