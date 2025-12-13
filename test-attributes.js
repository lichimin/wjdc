// 简单的测试脚本，用于验证游戏属性是否正确加载和应用

// 模拟玩家状态
const playerState = {
  damage: 15,
  speed: 3.5,
  projectileSpeed: 8,
  maxHealth: 100,
  health: 100,
  critRate: 0.05,
  critDamage: 0.15,
  dodgeRate: 0.05,
  regen: 5,
  regenTimer: 0,
  lifesteal: 0.03,
  instantKillRate: 0.01,
  attackSpeed: 1
};

console.log('=== 游戏属性测试 ===');
console.log('1. 基础属性:');
console.log('   伤害:', playerState.damage);
console.log('   移动速度:', playerState.speed);
console.log('   子弹速度:', playerState.projectileSpeed);
console.log('   最大生命值:', playerState.maxHealth);
console.log('   当前生命值:', playerState.health);

console.log('\n2. 战斗属性:');
console.log('   暴击率:', playerState.critRate * 100 + '%');
console.log('   暴击伤害加成:', playerState.critDamage * 100 + '%');
console.log('   闪避率:', playerState.dodgeRate * 100 + '%');
console.log('   生命回复:', playerState.regen + '/分钟');
console.log('   吸血:', playerState.lifesteal * 100 + '%');
console.log('   秒杀率:', playerState.instantKillRate * 100 + '%');
console.log('   攻击速度:', playerState.attackSpeed + 'x');

// 测试伤害计算
console.log('\n3. 伤害计算测试:');
const baseDamage = playerState.damage + Math.floor(Math.random() * 5);
const isCritical = Math.random() < playerState.critRate;
let totalDamage = baseDamage;
if (isCritical) {
  totalDamage = Math.round(baseDamage * (1 + playerState.critDamage));
}
console.log('   基础伤害:', baseDamage);
console.log('   暴击:', isCritical ? '是' : '否');
console.log('   总伤害:', totalDamage);

// 测试吸血效果
const lifestealAmount = Math.round(totalDamage * playerState.lifesteal);
console.log('   吸血效果:', lifestealAmount + ' 生命值');

// 测试减伤效果
const enemyDamage = 20;
const damageReduction = 0.1; // 10%减伤
const actualDamage = Math.round(enemyDamage * (1 - damageReduction));
console.log('   敌人伤害:', enemyDamage);
console.log('   减伤率:', damageReduction * 100 + '%');
console.log('   实际伤害:', actualDamage);

console.log('\n=== 测试完成 ===');
