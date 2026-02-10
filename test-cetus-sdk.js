const { CetusClmmSDK } = require('@cetusprotocol/sui-clmm-sdk');
const { Ed25519Keypair } = require('@mysten/sui/keypair');
const { fromB64 } = require('@mysten/sui/utils');

// 测试 Cetus SDK 基本用法
async function testCetusSDK() {
  const sdk = CetusClmmSDK.createSDK({
    env: 'mainnet',
  });

  // 设置发送者
  const keypair = Ed25519Keypair.fromSecretKey(
    fromB64('your-secret-key-here')
  );
  sdk.setSenderAddress(keypair.getPublicKey().toSuiAddress());

  // 检查 SDK 方法
  console.log('SDK methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(sdk)));
  console.log('SDK.Swap:', Object.getOwnPropertyNames(sdk.Swap));
}

testCetusSDK().catch(console.error);
