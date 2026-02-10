/**
 * 测试 DEX Swap 功能（直接查询版本）
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
 * 查找 SUI/USDC Pool 对象
 * 通过查询 Kriya Package 下的对象来找到匹配的 Pool
 */
async function findSuiUsdcPool() {
  console.log('\n🔍 查找 SUI/USDC Pool...');

  try {
    // 方法1: 尝试使用已知的 Pool ID（从 GeckoTerminal 获取）
    // SUI/USDC pool on Kriya DEX - https://www.geckoterminal.com/sui-network/pools/0x5af4976b871fa1813362f352fa4cada3883a96191bb7212db1bd5d13685ae305
    const knownPools = [
      '0x5af4976b871fa1813362f352fa4cada3883a96191bb7212db1bd5d13685ae305', // SUI/USDC (verified)
    ];

    for (const poolId of knownPools) {
      try {
        console.log(`   尝试 Pool ID: ${poolId}`);
        const poolObj = await client.getObject({
          id: poolId,
          options: { showContent: true, showType: true },
        });

        if (poolObj.data?.content) {
          const content = poolObj.data.content;
          const type = poolObj.data.type;

          console.log(`   ✅ 找到 Pool 对象!`);
          console.log(`   Type: ${type}`);

          return {
            objectId: poolId,
            objectType: type,
          };
        }
      } catch (e) {
        console.log(`   ❌ Pool ID 无效: ${e.message}`);
        continue;
      }
    }

    // 方法2: 查询 Kriya Package 的对象（如果有权限）
    console.log('\n   尝试查询 Kriya Package 对象...');
    // 注意: 普通节点可能不支持包级别的对象查询

    console.warn('⚠️  未找到可用的 Pool');
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

  console.log('\n💱 执行 SUI → USDC Swap...');
  console.log('   - 输入:', SWAP_AMOUNT / 1e9, 'SUI');

  try {
    // 1. 查找 Pool
    const poolInfo = await findSuiUsdcPool();

    if (!poolInfo) {
      console.error('\n❌ 无法找到 Pool，交易中止');
      console.log('💡 建议: 请从 Sui Mainnet Explorer 或 Kriya DEX 文档获取正确的 Pool ID');
      return;
    }

    // 2. 构建交易
    console.log('\n🔨 构建交易...');
    const tx = new Transaction();
    tx.setGasBudget(50000000);

    // Split coins
    const [coinToSwap] = tx.splitCoins(tx.gas, [tx.pure.u64(SWAP_AMOUNT)]);

    // 调用 Kriya DEX swap（使用 Pool 对象）
    tx.moveCall({
      target: `${KRIYA_PACKAGE_ID}::pool::swap`,
      typeArguments: [TOKEN_TYPES.SUI, TOKEN_TYPES.USDC],
      arguments: [
        tx.object(poolInfo.objectId), // Pool 对象
        coinToSwap,
        tx.pure.u64(0), // min_out
      ],
    });

    // 3. 签名并执行交易
    console.log('📝 签名并执行交易...');
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
        console.log('   -', obj.objectType, ':', obj.objectId);
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
        console.log('   - Total (SUI):', (Number(txDetails.effects.gasUsed.totalPayment) / 1e9).toFixed(6), 'SUI');
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
