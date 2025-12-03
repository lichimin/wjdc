import React, { useState } from 'react';
import { authService } from '../services/authService';
import { UserData } from '../services/authService';

interface SimpleLoginProps {
  onLogin: (userData: UserData) => void;
  setLoginError: (error: string | null) => void;
  checkingAuth: boolean;
}

const SimpleLogin: React.FC<SimpleLoginProps> = ({ onLogin, setLoginError, checkingAuth }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    console.log('SimpleLogin handleLogin called');
    console.log('Username:', username);
    console.log('Password:', password);

    if (!username || !password) {
      setLoginError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    setLoginError(null);

    try {
      console.log('Calling authService.login...');
      const userData = await authService.login(username, password);
      console.log('Login successful:', userData);
      onLogin(userData);
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error instanceof Error ? error.message : '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      pointerEvents: 'auto'
    }}>
      <div style={{
        backgroundColor: '#0f172a',
        border: '2px solid #06b6d4',
        borderRadius: '8px',
        padding: '2rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)'
      }}>
        <h1 style={{
          color: '#22d3ee',
          fontSize: '2rem',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '1.5rem'
        }}>
          赛博地牢
        </h1>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            color: '#94a3b8',
            fontSize: '0.875rem',
            fontWeight: '500',
            marginBottom: '0.5rem'
          }}>
            用户名
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '4px',
              padding: '0.75rem',
              color: 'white',
              fontSize: '1rem'
            }}
            placeholder="输入用户名"
            disabled={loading || checkingAuth}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            color: '#94a3b8',
            fontSize: '0.875rem',
            fontWeight: '500',
            marginBottom: '0.5rem'
          }}>
            密码
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '4px',
              padding: '0.75rem',
              color: 'white',
              fontSize: '1rem'
            }}
            placeholder="输入密码"
            disabled={loading || checkingAuth}
          />
        </div>

        {/* 错误信息显示将由App.tsx处理 */}

        <button
          onClick={() => {
            alert('SimpleLogin button clicked!');
            handleLogin();
          }}
          disabled={loading || checkingAuth}
          style={{
            width: '100%',
            backgroundColor: loading || checkingAuth ? '#475569' : '#06b6d4',
            color: 'white',
            fontWeight: 'bold',
            padding: '0.75rem',
            borderRadius: '4px',
            border: 'none',
            fontSize: '1rem',
            cursor: loading || checkingAuth ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          {loading || checkingAuth ? '登录中...' : '登录'}
        </button>
      </div>
    </div>
  );
};

export default SimpleLogin;