/**
 * 测试 DEX Swap 功能
 * 使用 Kriya DEX 进行 SUI → USDC swap
 */

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { Transaction } = require('@mysten/sui/transactions');

// 配置
const NETWORK = 'mainnet';
const SUI_RPC_URL = getFullnodeUrl(NETWORK);

// Kriya DEX 配置（Mainnet）
const KRIYA_PACKAGE_ID = '0xbd8d4489782042c6fafad4de4bc6a5e0b84a43c6c00647ffd7062d1e2bb7549e';

// Token 类型定义（Sui Mainnet）
const TOKEN_TYPES = {
  SUI: '0x2::sui::SUI',
  USDC: '0xce38bfa63cc41b7622f1ab4bdcf9f4e4aa78b57abd1e2e70a966f639b4da4f57::coin::COIN',
  USDT: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
};

// 最小测试金额
const SWAP_AMOUNT = 10000000; // 0.01 SUI

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

/**
 * 获取 Kriya Pool 信息
 */
async function getKriyaPool(tokenX, tokenY) {
  console.log(`\n🔍 查找 Pool: ${tokenX} / ${tokenY}`);

  try {
    // 动态导入 Kriya SDK（ES Module）
    const { KriyaSDK } = await import('kriya-v3-sdk');

    // 使用 Kriya SDK 获取 Pool
    const sdk = new KriyaSDK(SUI_RPC_URL, KRIYA_PACKAGE_ID, true);

    // 获取所有 Pool
    const pools = await sdk.Pool.getAllPools();

    // 查找匹配的 Pool
    const matchingPool = pools.find(
      (pool) =>
        (pool.token_x_type === tokenX && pool.token_y_type === tokenY) ||
        (pool.token_x_type === tokenY && pool.token_y_type === tokenX)
    );

    if (matchingPool) {
      console.log(`✅ 找到 Pool: ${matchingPool.pool_id}`);
      console.log(`   Token X: ${matchingPool.token_x_type}`);
      console.log(`   Token Y: ${matchingPool.token_y_type}`);
      return {
        objectId: matchingPool.pool_id,
        tokenXType: matchingPool.token_x_type,
        tokenYType: matchingPool.token_y_type,
      };
    }

    console.warn('⚠️  未找到匹配的 Pool');
    return null;
  } catch (error) {
    console.error('❌ 查询 Pool 失败:', error.message);
    return null;
  }
}

async function testDexSwap() {
  console.log('🔄 开始测试 DEX Swap...\n');
  console.log('🌐 Network:', NETWORK);

  const sender = '0x6c90dc192d728b32c20e34336137775bf632e51035d784dfea0df73c3aaba225';
  console.log('👤 Sender:', sender);

  const keypair = getKeypair(sender);

  // 测试 SUI → USDC swap
  const inputToken = TOKEN_TYPES.SUI;
  const outputToken = TOKEN_TYPES.USDC;

  console.log('\n💱 执行 SUI → USDC Swap...');
  console.log('   - 输入:', SWAP_AMOUNT / 1e9, 'SUI');

  try {
    // 1. 获取 Pool 信息
    const poolInfo = await getKriyaPool(inputToken, outputToken);

    if (!poolInfo) {
      console.error('❌ 无法找到 Pool，交易中止');
      return;
    }

    // 2. 构建交易
    const tx = new Transaction();
    tx.setGasBudget(50000000);

    // Split coins
    const [coinToSwap] = tx.splitCoins(tx.gas, [tx.pure.u64(SWAP_AMOUNT)]);

    // 调用 Kriya DEX swap（使用 Pool 对象）
    tx.moveCall({
      target: `${KRIYA_PACKAGE_ID}::pool::swap`,
      typeArguments: [inputToken, outputToken],
      arguments: [
        tx.object(poolInfo.objectId), // Pool 对象（不是 Clock！）
        coinToSwap,
        tx.pure.u64(0), // min_out (0 表示接受任何输出)
      ],
    });

    // 3. 签名并执行交易
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
    });

    console.log('\n✅ Swap 交易已提交！');
    console.log('   Transaction Digest:', result.digest);

    // 4. 等待确认
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
        obj.objectType?.includes('coin::COIN')
      );

      console.log('   📦 收到的 Objects:', usdcObjects.length);

      createdObjects.forEach(obj => {
        const amount = obj.objectType?.match(/<.*>/)?.[0] || '';
        console.log('   -', obj.objectType?.split('::')[1], amount, ':', obj.objectId);
      });

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
      }
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
