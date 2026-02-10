/**
 * 测试授权合约
 * 使用最小金额测试所有功能
 */

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { Transaction } = require('@mysten/sui/transactions');

// 配置
const PACKAGE_ID = '0x91f2fdf66111c9eada5c6c17a360ea3a1bf6e54e72c4589b0b10279627cc6371';
const NETWORK = 'mainnet';

// 最小测试金额（1 MIST = 0.000000001 SUI）
const TEST_AMOUNT = 1000; // 0.000001 SUI
const DAILY_LIMIT = 10000; // 0.00001 SUI
const PER_TX_LIMIT = 5000; // 0.000005 SUI
const VALIDITY_DAYS = 1;

// 创建客户端
const client = new SuiClient({
  url: getFullnodeUrl(NETWORK),
});

// 从 sui.keystore 读取密钥
function getKeypair(targetAddress) {
  const fs = require('fs');
  const os = require('os');
  const keystorePath = os.homedir() + '/.sui/sui_config/sui.keystore';
  const keystore = JSON.parse(fs.readFileSync(keystorePath, 'utf8'));

  // 遍历所有密钥，找到匹配的地址
  for (const keyString of keystore) {
    const secretKeyBytes = Buffer.from(keyString, 'base64');
    const secretKey = secretKeyBytes.subarray(1); // 去掉第一个字节（flag）
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const address = keypair.getPublicKey().toSuiAddress();

    if (address === targetAddress) {
      console.log('🔑 找到匹配的密钥, 索引:', keystore.indexOf(keyString));
      return keypair;
    }
  }

  throw new Error(`未找到地址 ${targetAddress} 对应的密钥`);
}

async function testAuthContract() {
  console.log('🧪 开始测试授权合约...\n');
  console.log('📦 Package ID:', PACKAGE_ID);
  console.log('🌐 Network:', NETWORK);

  // 使用 active address
  const sender = '0x6c90dc192d728b32c20e34336137775bf632e51035d784dfea0df73c3aaba225';
  console.log('👤 Sender:', sender);

  const keypair = getKeypair(sender);

  console.log('');

  // 1. 创建授权
  console.log('📝 步骤 1: 创建授权...');
  console.log('   - 每日限额:', DAILY_LIMIT / 1e9, 'SUI');
  console.log('   - 单笔限额:', PER_TX_LIMIT / 1e9, 'SUI');
  console.log('   - 有效期:', VALIDITY_DAYS, '天');

  const tx1 = new Transaction();

  // Gas (降低到 0.05 SUI)
  tx1.setGasBudget(30000000);

  // 调用 create_authorization
  tx1.moveCall({
    target: `${PACKAGE_ID}::auth::create_authorization`,
    arguments: [
      tx1.pure.address(PACKAGE_ID), // agent = 合约地址
      tx1.pure.string('SUI'),
      tx1.pure.u64(DAILY_LIMIT),
      tx1.pure.u64(PER_TX_LIMIT),
      tx1.pure.u64(VALIDITY_DAYS),
    ],
  });

  let result1;
  let authObjectId;

  try {
    result1 = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx1,
    });

    console.log('✅ 交易已提交！');
    console.log('   Transaction Digest:', result1.digest);

    // 等待交易确认
    console.log('   ⏳ 等待交易确认...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 获取交易详情
    const txDetails = await client.getTransactionBlock({
      digest: result1.digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    console.log('   Status:', txDetails.effects?.status?.status);

    // 从交易结果中提取创建的对象
    const createdObjects = txDetails.objectChanges?.filter(
      obj => obj.type === 'created'
    ) || [];

    console.log('   Created Objects Count:', createdObjects.length);

    const authObject = createdObjects.find(obj =>
      obj.objectType?.includes('Authorization')
    );

    if (authObject) {
      authObjectId = authObject.objectId;
      console.log('   ✅ Authorization Object ID:', authObjectId);
    } else {
      console.log('   ⚠️  未找到 Authorization 对象');
      console.log('   Created Objects:', createdObjects.map(o => ({
        id: o.objectId,
        type: o.objectType
      })));
    }

  } catch (e) {
    console.error('❌ 创建授权失败:', e.message);
    console.error('   Stack:', e.stack);
    process.exit(1);
  }

  console.log('');

  // 2. 查询授权状态
  if (authObjectId) {
    console.log('📊 步骤 2: 查询授权状态...');

    try {
      const authObject = await client.getObject({
        id: authObjectId,
        options: { showContent: true },
      });

      console.log('✅ 授权对象状态:');
      console.log('   Content:', JSON.stringify(authObject.data?.content, null, 2));
    } catch (e) {
      console.error('❌ 查询失败:', e.message);
    }

    console.log('');

    // 3. 使用授权执行转账
    console.log('💰 步骤 3: 使用授权执行转账...');
    console.log('   - 转账金额:', TEST_AMOUNT / 1e9, 'SUI');
    console.log('   - 接收地址:', sender);

    const tx2 = new Transaction();
    tx2.setGasBudget(30000000);

    // 先 split 出要转账的币
    const [coinToTransfer] = tx2.splitCoins(tx2.gas, [tx2.pure.u64(TEST_AMOUNT)]);

    // 调用 execute_with_auth
    tx2.moveCall({
      target: `${PACKAGE_ID}::auth::execute_with_auth`,
      arguments: [
        tx2.object(authObjectId),
        tx2.pure.address(sender),
        tx2.pure.u64(TEST_AMOUNT),
        coinToTransfer,
        tx2.object('0x6'), // Clock
      ],
    });

    try {
      const result2 = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx2,
      });

      console.log('✅ 转账交易已提交！');
      console.log('   Transaction Digest:', result2.digest);

      // 等待确认
      await new Promise(resolve => setTimeout(resolve, 5000));

      const tx2Details = await client.getTransactionBlock({
        digest: result2.digest,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      console.log('   Status:', tx2Details.effects?.status?.status);

      if (tx2Details.effects?.status?.status === 'failure') {
        console.log('   ❌ 交易失败！');
        console.log('   Errors:', tx2Details.effects?.status?.error);
      }

      console.log('   Events:', tx2Details.events?.map(e => ({
        type: e.type,
        parsedJson: e.parsedJson
      })));

    } catch (e) {
      console.error('❌ 转账失败:', e.message);
      if (e.message.includes('insufficient_gas')) {
        console.log('💡 提示: 钱包余额不足以支付 Gas');
      }
    }

    console.log('');

    // 4. 再次查询状态
    console.log('📊 步骤 4: 再次查询授权状态...');

    try {
      const authObject2 = await client.getObject({
        id: authObjectId,
        options: { showContent: true },
      });

      console.log('✅ 更新后的授权状态:');
      console.log('   Content:', JSON.stringify(authObject2.data?.content, null, 2));
    } catch (e) {
      console.error('❌ 查询失败:', e.message);
    }
  }

  console.log('');
  console.log('🎉 测试完成！');
}

// 运行测试
testAuthContract().catch(console.error);
