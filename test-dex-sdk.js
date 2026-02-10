/**
 * 测试 DEX Swap 功能（使用 Kriya SDK）
 * SUI → USDC swap，最小测试金额
 */

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { buildTransaction } = require('./dist/transaction-builder');

// 配置
const NETWORK = 'mainnet';
const SUI_RPC_URL = getFullnodeUrl(NETWORK);

// 最小测试金额
const SWAP_AMOUNT = '0.001'; // 0.001 SUI（最小安全金额）
const SLIPPAGE = '1'; // 1% 滑点

// 创建客户端
const client = new SuiClient({
  url: SUI_RPC_URL,
});

// 从 sui.keystore 读取密钥
function getKeypair(targetAddress) {
  const fs = require('fs');
  const os = require('os');
  const keystorePath = os.homedir() + '/.sui/sui_config/sui.keystore';
  const keystore = JSON.parse(fs.readFileSync(keystorePath, 'utf8'));

  for (const keyString of keystore) {
    const secretKeyBytes = Buffer.from(keyString, 'base64');
    const secretKey = secretKeyBytes.subarray(1);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const address = keypair.getPublicKey().toSuiAddress();

    if (address === targetAddress) {
      return keypair;
    }
  }

  throw new Error(`未找到地址 ${targetAddress} 对应的密钥`);
}

async function testDexSwap() {
  console.log('🔄 开始测试 DEX Swap...\n');
  console.log('🌐 Network:', NETWORK);

  const sender = '0x6c90dc192d728b32c20e34336137775bf632e51035d784dfea0df73c3aaba225';
  console.log('👤 Sender:', sender);

  const keypair = getKeypair(sender);

  console.log('\n💱 执行 SUI → USDC Swap...');
  console.log('   - 输入:', SWAP_AMOUNT, 'SUI');
  console.log('   - 滑点:', SLIPPAGE + '%');

  try {
    // 1. 查询当前余额
    const balance = await client.getBalance({
      owner: sender,
      coinType: '0x2::sui::SUI',
    });
    console.log('\n💰 当前 SUI 余额:', (Number(balance.totalBalance) / 1e9).toFixed(4), 'SUI');

    // 2. 构建 Swap Intent
    const swapIntent = {
      action: 'swap',
      params: {
        inputToken: 'SUI',
        outputToken: 'USDC',
        amount: SWAP_AMOUNT,
        slippage: SLIPPAGE,
      },
      confidence: 1.0,
    };

    console.log('\n🔨 构建交易...');
    // 3. 使用修复后的 buildTransaction 函数
    // 注意：Swap 不支持授权模式，所以不传递 authObjectId
    const tx = await buildTransaction([swapIntent], sender);

    // 4. 签名并执行交易
    console.log('📝 签名并执行交易...');
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
    });

    console.log('\n✅ Swap 交易已提交！');
    console.log('   Transaction Digest:', result.digest);

    // 5. 等待确认
    console.log('   ⏳ 等待交易确认...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const txDetails = await client.getTransactionBlock({
      digest: result.digest,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    console.log('\n📊 交易详情:');
    console.log('   Status:', txDetails.effects?.status?.status);

    if (txDetails.effects?.status?.status === 'success') {
      console.log('   ✅ Swap 成功！');

      // 查找创建的 USDC 对象
      const createdObjects = txDetails.objectChanges?.filter(
        obj => obj.type === 'created'
      ) || [];

      const usdcObjects = createdObjects.filter(obj =>
        obj.objectType?.includes('coin::COIN') &&
        obj.objectType?.includes('USDC')
      );

      console.log('   📦 收到的 USDC Objects:', usdcObjects.length);

      if (usdcObjects.length > 0) {
        usdcObjects.forEach(obj => {
          console.log('   - Object ID:', obj.objectId);
          console.log('     Type:', obj.objectType);
        });
      }

      // 显示事件
      if (txDetails.events && txDetails.events.length > 0) {
        console.log('\n📡 事件:');
        txDetails.events.forEach(e => {
          const eventType = e.type.split('::').pop();
          console.log('   -', eventType, ':', JSON.stringify(e.parsedJson));
        });
      }

      // 显示 Gas 消耗
      if (txDetails.effects?.gasUsed) {
        console.log('\n⛽ Gas 消耗:');
        console.log('   - Computation:', txDetails.effects.gasUsed.computationCost, 'MIST');
        console.log('   - Storage:', txDetails.effects.gasUsed.storageCost, 'MIST');
        console.log('   - Total:', txDetails.effects.gasUsed.totalPayment, 'MIST');
        console.log('   - Total (SUI):', (Number(txDetails.effects.gasUsed.totalPayment) / 1e9).toFixed(6), 'SUI');
      }

      // 6. 查询新的 USDC 余额
      const usdcBalance = await client.getBalance({
        owner: sender,
        coinType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      });
      const balance = Number(usdcBalance.totalBalance) / 1e6;
      console.log('\n💰 当前 USDC 余额:', balance.toFixed(6), 'USDC');

      // 显示具体的 USDC coins
      const usdcCoins = await client.getCoins({
        owner: sender,
        coinType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      });
      console.log('   📦 USDC Coins 数量:', usdcCoins.data.length);

    } else {
      console.log('   ❌ Swap 失败');
      if (txDetails.effects?.status?.error) {
        console.log('   Error:', txDetails.effects.status.error);
      }
    }

  } catch (e) {
    console.error('\n❌ DEX 测试失败:', e.message);
    if (e.stack) {
      console.error('   Stack:', e.stack.split('\n').slice(0, 5).join('\n'));
    }
  }

  console.log('\n🎉 测试完成！');
}

// 运行测试
testDexSwap().catch(console.error);
