import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface LoginPageProps {
  onLoginSuccess: (userData: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // API基础URL
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://8.130.43.130:10005';

  const handleLogin = async (username: string, password: string) => {
  const handleLogin = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError('');
      
      // 这里将连接到authService，暂时使用模拟数据
      // 实际实现会在authService中完成
      const response = await fetch(`${apiBaseUrl}/api/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (response.ok && data.code === 200) {
        // 登录成功
        onLoginSuccess(data.data);
        // 保存token
        if (data.token) {
          localStorage.setItem('authToken', data.token);
        }
      } else {
        setError(data.message || '登录失败，请检查用户名和密码');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError('');
      
      // 注册API调用
      const response = await fetch(`${apiBaseUrl}/api/v1/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (response.ok && data.code === 200) {
        // 注册成功后切换到登录模式
        setIsRegisterMode(false);
        setError('注册成功，请登录');
      } else {
        setError(data.message || '注册失败，请稍后重试');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('Register error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#020205] flex items-center justify-center font-sans relative overflow-hidden text-gray-100">
      {/* --- CYBERPUNK BACKGROUND ELEMENTS --- */}
      {/* Moving Grid Floor */}
      <div className="absolute inset-0 perspective-grid pointer-events-none opacity-30"></div>
      
      {/* Scanlines */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiAvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LDI1NSwgMC4wNSkiIC8+Cjwvc3ZnPg==')] opacity-20 pointer-events-none z-0"></div>

      {/* Glowing Circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-900/10 rounded-full filter blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/10 rounded-full filter blur-3xl animate-pulse delay-1000"></div>

      {/* --- LOGIN CONTAINER --- */}
      <div className="relative z-10 w-full max-w-3xl">
        {/* Decorative Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 font-['Press_Start_2P',monospace] tracking-tight">
            CYBERQUEST
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto rounded-full shadow-[0_0_10px_rgba(6,182,212,0.6)]"></div>
          <p className="mt-4 text-slate-400 text-sm font-mono tracking-wider">
            ENTER THE DIGITAL REALM
          </p>
        </div>

        {/* Form Container */}
        <div className="mx-auto max-w-md bg-slate-900/60 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-8 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          {/* Animated Border */}
          <div className="absolute inset-0 rounded-xl border border-cyan-400/0 shadow-[0_0_15px_rgba(6,182,212,0.2)] pointer-events-none animate-[pulse_3s_ease-in-out_infinite]"></div>
          
          {/* Mode Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-slate-800/50 p-1 rounded-full inline-flex">
              <button
                onClick={() => setIsRegisterMode(false)}
                className={`px-5 py-2 rounded-full text-sm font-mono transition-all ${!
                  isRegisterMode 
                    ? 'bg-cyan-900/80 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                登录
              </button>
              <button
                onClick={() => setIsRegisterMode(true)}
                className={`px-5 py-2 rounded-full text-sm font-mono transition-all ${isRegisterMode
                  ? 'bg-cyan-900/80 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                注册
              </button>
            </div>
          </div>

          {/* Form Switching */}
          {isRegisterMode ? (
            <RegisterForm
              onRegister={handleRegister}
              onSwitchToLogin={() => setIsRegisterMode(false)}
              loading={loading}
              error={error}
            />
          ) : (
            <LoginForm
              onLogin={handleLogin}
              onSwitchToRegister={() => setIsRegisterMode(true)}
              loading={loading}
              error={error}
            />
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-10 text-xs text-slate-600 font-mono">
          <p>© 2077 CYBERQUEST. ALL RIGHTS RESERVED.</p>
          <p className="mt-1">SYSTEM VERSION 2.1.0</p>
        </div>
      </div>

      {/* Custom CSS for grid animation */}
      <style jsx>{`
        .perspective-grid {
          background-image: 
            linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px);
          background-size: 40px 40px;
          background-position: 0 0;
          animation: gridMove 20s linear infinite;
        }

        @keyframes gridMove {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 40px;
          }
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 15px rgba(6, 182, 212, 0.2);
            border-color: rgba(6, 182, 212, 0);
          }
          50% {
            box-shadow: 0 0 25px rgba(6, 182, 212, 0.4);
            border-color: rgba(6, 182, 212, 0.3);
          }
        }
      `}</style>
    </div>
  );
};