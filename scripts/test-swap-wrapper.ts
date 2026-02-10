#!/usr/bin/env tsx

/**
 * Swap Wrapper 合约测试脚本
 *
 * 功能：
 * 1. 创建测试授权对象
 * 2. 执行授权 Swap
 * 3. 测试启用/禁用功能
 *
 * 使用方法：
 *   pnpm tsx scripts/test-swap-wrapper.ts [command] [options]
 *
 * 命令：
 *   create-auth    创建测试授权对象
 *   execute-swap   执行授权 Swap
 *   disable-auth   禁用授权
 *   enable-auth    启用授权
 *   test-all       运行所有测试
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

// 配置
const PACKAGE_ID = '0x584aeac7ed367b595b453547ab6caa0c2b0dd8f580b88227585c914b26324f3f';
const MODULE_NAME = 'swap_wrapper';
const NETWORK = 'mainnet';

// 初始化客户端
const client = new SuiClient({ url: getFullnodeUrl(NETWORK) });

// 测试参数
const TEST_PARAMS = {
  agentAddress: '0x6c90dc192d728b32c20e34336137775bf632e51035d784dfea0df73c3aaba225',
  tokenType: 'SUI',           // 代币类型
  dailyLimit: 100_000_000n,   // 0.1 SUI (in MIST)
  perTxLimit: 100_000_000n,   // 0.1 SUI (in MIST)
  validityDays: 30n,          // 有效期（天）
};

/**
 * 获取私钥（从环境变量或 Sui CLI）
 */
function getKeypair(): Ed25519Keypair {
  // 方法1: 从环境变量读取（支持 bech32 格式：suiprivkey1...）
  if (process.env.SUI_PRIVATE_KEY) {
    const privateKeyStr = process.env.SUI_PRIVATE_KEY;

    // 解码 Sui 私钥（支持 bech32 格式）
    const { schema, secretKey } = decodeSuiPrivateKey(privateKeyStr);

    if (schema !== 'ED25519') {
      console.error('❌ 错误: 仅支持 ED25519 密钥');
      process.exit(1);
    }

    return Ed25519Keypair.fromSecretKey(secretKey);
  }

  // 方法2: 提示用户使用 Sui CLI
  console.error('❌ 错误: 未找到私钥');
  console.error('\n请设置环境变量 SUI_PRIVATE_KEY，或使用 Sui CLI：');
  console.error('  export SUI_PRIVATE_KEY=$(sui keytool export --key-identity $(sui client active-address) --json | jq -r .exportedPrivateKey)');
  process.exit(1);
}

/**
 * 创建测试授权对象
 */
async function createTestAuthorization() {
  console.log('🔨 创建测试授权对象...\n');

  const keypair = getKeypair();
  const sender = keypair.getPublicKey().toSuiAddress();

  console.log(`发送者地址: ${sender}`);
  console.log(`Package ID: ${PACKAGE_ID}`);
  console.log(`Agent 地址: ${TEST_PARAMS.agentAddress}`);
  console.log(`代币类型: ${TEST_PARAMS.tokenType}`);
  console.log(`每日限额: ${Number(TEST_PARAMS.dailyLimit) / 1e9} SUI`);
  console.log(`单笔限额: ${Number(TEST_PARAMS.perTxLimit) / 1e9} SUI`);
  console.log(`有效期: ${Number(TEST_PARAMS.validityDays)} 天\n`);

  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::create_test_authorization`,
    arguments: [
      tx.pure.address(TEST_PARAMS.agentAddress),
      tx.pure.string(TEST_PARAMS.tokenType),
      tx.pure.u64(TEST_PARAMS.dailyLimit),
      tx.pure.u64(TEST_PARAMS.perTxLimit),
      tx.pure.u64(TEST_PARAMS.validityDays),
    ],
  });

  try {
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    console.log('✅ 授权对象创建成功！\n');
    console.log(`Transaction Digest: ${result.digest}`);
    console.log(`Explorer: https://suiscan.xyz/${NETWORK}/tx/${result.digest}\n`);

    // 提取创建的授权对象 ID
    const createdObjects = result.objectChanges?.filter(
      (change: any) => change.type === 'created'
    );

    if (createdObjects && createdObjects.length > 0) {
      console.log('创建的对象：');
      createdObjects.forEach((obj: any) => {
        console.log(`  - ${obj.objectType}: ${obj.objectId}`);
      });
    }

    return result.digest;
  } catch (error: any) {
    console.error('❌ 创建授权对象失败：', error.message);
    throw error;
  }
}

/**
 * 执行授权 Swap（模拟）
 */
async function executeSwapWithAuth(authObjectId: string) {
  console.log('\n🔄 执行授权 Swap...\n');

  const keypair = getKeypair();
  const sender = keypair.getPublicKey().toSuiAddress();

  console.log(`发送者地址: ${sender}`);
  console.log(`授权对象 ID: ${authObjectId}\n`);

  const tx = new Transaction();

  // 从 gas coin 分割出一小部分作为输入（0.01 SUI = 10,000,000 MIST）
  const inputAmount = 10_000_000n;
  const [splitCoin] = tx.splitCoins(tx.gas, [inputAmount]);

  const minOutputAmount = 1000n; // 最小输出金额（占位值）

  console.log(`输入金额: ${Number(inputAmount) / 1e9} SUI`);
  console.log(`最小输出金额: ${Number(minOutputAmount) / 1e9} SUI\n`);

  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::execute_swap_with_auth`,
    arguments: [
      tx.object(authObjectId),
      splitCoin,
      tx.pure.u64(minOutputAmount),
      tx.object('0x6'), // Clock 对象
    ],
  });

  try {
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    console.log('✅ Swap 执行成功！\n');
    console.log(`Transaction Digest: ${result.digest}`);
    console.log(`Explorer: https://suiscan.xyz/${NETWORK}/tx/${result.digest}\n`);

    // 显示事件
    if (result.events && result.events.length > 0) {
      console.log('事件：');
      result.events.forEach((event: any) => {
        console.log(`  - ${event.type}`);
        console.log(`    ${JSON.stringify(event.parsedJson, null, 2)}`);
      });
    }

    return result.digest;
  } catch (error: any) {
    console.error('❌ Swap 执行失败：', error.message);
    throw error;
  }
}

/**
 * 禁用授权
 */
async function disableAuthorization(authObjectId: string) {
  console.log('\n🔒 禁用授权...\n');

  const keypair = getKeypair();
  const sender = keypair.getPublicKey().toSuiAddress();

  console.log(`发送者地址: ${sender}`);
  console.log(`授权对象 ID: ${authObjectId}\n`);

  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::disable_authorization`,
    arguments: [tx.object(authObjectId)],
  });

  try {
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
      },
    });

    console.log('✅ 授权已禁用！\n');
    console.log(`Transaction Digest: ${result.digest}`);
    console.log(`Explorer: https://suiscan.xyz/${NETWORK}/tx/${result.digest}\n`);

    return result.digest;
  } catch (error: any) {
    console.error('❌ 禁用授权失败：', error.message);
    throw error;
  }
}

/**
 * 启用授权
 */
async function enableAuthorization(authObjectId: string) {
  console.log('\n🔓 启用授权...\n');

  const keypair = getKeypair();
  const sender = keypair.getPublicKey().toSuiAddress();

  console.log(`发送者地址: ${sender}`);
  console.log(`授权对象 ID: ${authObjectId}\n`);

  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::enable_authorization`,
    arguments: [tx.object(authObjectId)],
  });

  try {
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
      },
    });

    console.log('✅ 授权已启用！\n');
    console.log(`Transaction Digest: ${result.digest}`);
    console.log(`Explorer: https://suiscan.xyz/${NETWORK}/tx/${result.digest}\n`);

    return result.digest;
  } catch (error: any) {
    console.error('❌ 启用授权失败：', error.message);
    throw error;
  }
}

/**
 * 运行所有测试
 */
async function testAll() {
  console.log('========================================');
  console.log('  Swap Wrapper 完整测试流程');
  console.log('========================================\n');

  try {
    // 1. 创建授权对象
    console.log('📝 步骤 1/4: 创建授权对象');
    await createTestAuthorization();

    console.log('\n⚠️  请从上面的输出中复制授权对象 ID，然后运行：');
    console.log('  pnpm tsx scripts/test-swap-wrapper.ts execute-swap <AUTH_OBJECT_ID>');
    console.log('  pnpm tsx scripts/test-swap-wrapper.ts disable-auth <AUTH_OBJECT_ID>');
    console.log('  pnpm tsx scripts/test-swap-wrapper.ts enable-auth <AUTH_OBJECT_ID>\n');

    // 注意：后续步骤需要授权对象 ID，所以这里只演示创建
  } catch (error: any) {
    console.error('\n❌ 测试失败：', error.message);
    process.exit(1);
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test-all';

  console.log(`\n🚀 Swap Wrapper 测试工具\n`);
  console.log(`网络: ${NETWORK}`);
  console.log(`Package ID: ${PACKAGE_ID}\n`);

  switch (command) {
    case 'create-auth':
      await createTestAuthorization();
      break;

    case 'execute-swap':
      if (!args[1]) {
        console.error('❌ 错误: 请提供授权对象 ID');
        console.error('用法: pnpm tsx scripts/test-swap-wrapper.ts execute-swap <AUTH_OBJECT_ID>');
        process.exit(1);
      }
      await executeSwapWithAuth(args[1]);
      break;

    case 'disable-auth':
      if (!args[1]) {
        console.error('❌ 错误: 请提供授权对象 ID');
        console.error('用法: pnpm tsx scripts/test-swap-wrapper.ts disable-auth <AUTH_OBJECT_ID>');
        process.exit(1);
      }
      await disableAuthorization(args[1]);
      break;

    case 'enable-auth':
      if (!args[1]) {
        console.error('❌ 错误: 请提供授权对象 ID');
        console.error('用法: pnpm tsx scripts/test-swap-wrapper.ts enable-auth <AUTH_OBJECT_ID>');
        process.exit(1);
      }
      await enableAuthorization(args[1]);
      break;

    case 'test-all':
      await testAll();
      break;

    default:
      console.error(`❌ 未知命令: ${command}`);
      console.error('\n可用命令:');
      console.error('  create-auth     创建测试授权对象');
      console.error('  execute-swap    执行授权 Swap');
      console.error('  disable-auth    禁用授权');
      console.error('  enable-auth     启用授权');
      console.error('  test-all        运行所有测试（默认）');
      process.exit(1);
  }

  console.log('\n✅ 测试完成\n');
}

// 运行主函数
main().catch((error) => {
  console.error('💥 执行失败:', error);
  process.exit(1);
});
