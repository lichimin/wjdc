// 清除localStorage中的认证数据
localStorage.removeItem('auth_token');
localStorage.removeItem('user_data');
console.log('认证数据已清除');

// 检查清除结果
console.log('auth_token:', localStorage.getItem('auth_token'));
console.log('user_data:', localStorage.getItem('user_data'));
