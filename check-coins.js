const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({
  url: getFullnodeUrl('mainnet'),
});

const ADDRESS = '0x6c90dc192d728b32c20e34336137775bf632e51035d784dfea0df73c3aaba225';

async function checkCoins() {
  // 获取所有 SUI coins
  const coins = await client.getCoins({
    owner: ADDRESS,
    coinType: '0x2::sui::SUI',
  });

  console.log('=== SUI Coins ===');
  console.log('Total coins:', coins.data.length);

  const totalBalance = coins.data.reduce((sum, c) => sum + BigInt(c.balance), BigInt(0));
  console.log('Total balance:', totalBalance.toString(), 'MIST');
  console.log('Total balance:', Number(totalBalance) / 1e9, 'SUI');

  // 检查前几个 coins 的详细信息
  for (let i = 0; i < Math.min(5, coins.data.length); i++) {
    const coin = coins.data[i];
    console.log(`\nCoin ${i + 1}:`);
    console.log('  Coin ID:', coin.coinObjectId);
    console.log('  Balance:', coin.balance, 'MIST');
    console.log('  Balance:', Number(coin.balance) / 1e9, 'SUI');
  }

  // 检查是否有足够的余额
  const requiredAmount = 1000000n; // 0.001 SUI = 1,000,000 MIST (SUI has 9 decimals)

  console.log('\n=== Balance Check ===');
  console.log('Required:', requiredAmount.toString(), 'MIST (0.001 SUI)');
  console.log('Available:', totalBalance.toString(), 'MIST (' + (Number(totalBalance) / 1e9) + ' SUI)');
  console.log('Sufficient:', totalBalance >= requiredAmount ? '✅ Yes' : '❌ No');
}

checkCoins().catch(console.error);
