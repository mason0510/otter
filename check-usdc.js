const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({
  url: getFullnodeUrl('mainnet'),
});

const ADDRESS = '0x6c90dc192d728b32c20e34336137775bf632e51035d784dfea0df73c3aaba225';
const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
const TX_DIGEST = 'B3ELG8vbj41GfF3bP1GNYVvpdg8CaaJ9ymfsot9suCWN';

async function checkTransaction() {
  const txDetails = await client.getTransactionBlock({
    digest: TX_DIGEST,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
      showBalanceChanges: true,
    },
  });

  console.log('=== Balance Changes ===');
  if (txDetails.balanceChanges) {
    txDetails.balanceChanges.forEach(change => {
      console.log('Coin Type:', change.coinType);
      if (change.changes) {
        change.changes.forEach(c => {
          console.log('  ', c.variant + ':', c.amount);
        });
      }
    });
  }

  console.log('\n=== Created Objects ===');
  if (txDetails.objectChanges) {
    txDetails.objectChanges
      .filter(obj => obj.type === 'created')
      .forEach(obj => {
        console.log('-', obj.objectType);
        console.log('  ID:', obj.objectId);
      });
  }

  console.log('\n=== Current USDC Balance ===');
  const usdcBalance = await client.getBalance({
    owner: ADDRESS,
    coinType: USDC_TYPE,
  });
  console.log('Total:', usdcBalance.totalBalance, 'smallest unit');
  console.log('Total:', Number(usdcBalance.totalBalance) / 1e6, 'USDC');

  console.log('\n=== All USDC Coins ===');
  const coins = await client.getCoins({
    owner: ADDRESS,
    coinType: USDC_TYPE,
  });
  console.log('Number of coins:', coins.data.length);
  coins.data.forEach(coin => {
    console.log('-', coin.coinObjectId + ':', coin.balance, '(' + (Number(coin.balance) / 1e6) + ' USDC)');
  });
}

checkTransaction().catch(console.error);
