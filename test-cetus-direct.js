/**
 * 直接测试 Cetus SDK 的 swap 功能
 */

const { CetusClmmSDK } = require('@cetusprotocol/sui-clmm-sdk');
const { SuiClient } = require('@mysten/sui/client');

const SUI_RPC_URL = 'https://fullnode.mainnet.sui.io:443';
const POOL_ID = '0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105';
const SUI_TYPE = '0x2::sui::SUI';
const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';

async function testCetusSwap() {
  console.log('=== 测试 Cetus SDK Swap ===\n');

  // 1. 创建 SDK 实例
  const sdk = CetusClmmSDK.createSDK({
    env: 'mainnet',
    full_rpc_url: SUI_RPC_URL,
  });

  console.log('✅ SDK 创建成功');

  // 2. 设置发送者地址（测试地址）
  const senderAddress = '0x6c90dc192d728b32c20e34336137775bf632e51035d784dfea0df73c3aaba225';
  sdk.setSenderAddress(senderAddress);
  console.log('✅ 发送者地址:', senderAddress);

  // 3. 获取 Pool 信息
  console.log('\n获取 Pool 信息...');
  const pool = await sdk.Pool.getPool(POOL_ID);
  console.log('✅ Pool 信息:');
  console.log('  - Pool object:', JSON.stringify(pool, null, 2).slice(0, 500) + '...');
  console.log('  - Token A:', pool.coin_type_a);
  console.log('  - Token B:', pool.coin_type_b);
  console.log('  - 当前价格:', pool.current_sqrt_price);

  // 4. 计算交易参数
  const inputAmount = '1000000'; // 0.001 SUI (MIST)
  const slippage = { numerator: 1, denominator: 100 }; // 1%
  const a2b = false; // SUI (token B) → USDC (token A)

  console.log('\n交易参数:');
  console.log('  - 方向:', a2b ? 'A → B' : 'B → A');
  console.log('  - 输入金额:', inputAmount, 'MIST (0.001 SUI)');
  console.log('  - 滑点:', slippage.numerator / slippage.denominator * 100 + '%');

  // 5. 创建 Swap Payload
  console.log('\n创建 Swap 交易...');
  try {
    const swapTx = await sdk.Swap.createSwapPayload({
      pool_id: POOL_ID,
      a2b: a2b,
      by_amount_in: true,
      amount: inputAmount,
      amount_limit: '0', // 最小输出量（暂设为0）
      coin_type_a: pool.coin_type_a,
      coin_type_b: pool.coin_type_b,
    });

    console.log('✅ Swap 交易创建成功');
    console.log('交易数据:');
    console.log(swapTx.serialize());

    // 6. 尝试验证交易（dry run）
    console.log('\n执行 Dry Run...');
    const client = new SuiClient({ url: SUI_RPC_URL });

    const txBytes = await swapTx.build({ client });
    console.log('交易长度:', txBytes.length, 'bytes');

    // devInspectTransactionBlock 需要 sender 地址
    const dryRunResult = await client.devInspectTransactionBlock({
      transactionBlock: txBytes,
      sender: senderAddress,
    });

    console.log('\nDry Run 结果:');
    console.log('  - 状态:', dryRunResult.effects.status.status);
    if (dryRunResult.effects.status.status === 'success') {
      console.log('  - ✅ 交易验证成功');
    } else {
      console.log('  - ❌ 交易验证失败');
      if (dryRunResult.effects.status.error) {
        console.log('  - 错误:', dryRunResult.effects.status.error);
      }
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.details) {
      console.error('详情:', error.details);
    }
  }
}

testCetusSwap().catch(console.error);
