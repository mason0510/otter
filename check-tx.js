/**
 * 检查交易详情
 */

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({
  url: getFullnodeUrl('mainnet'),
});

const TX_DIGEST = 'BSwLFRE467Tw3XsSWB3BYxzCcdziMDBonb2EBsytUdSF';

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

  console.log('=== 交易状态 ===');
  console.log('Status:', txDetails.effects?.status?.status);

  console.log('\n=== Balance Changes ===');
  if (txDetails.balanceChanges) {
    txDetails.balanceChanges.forEach(change => {
      console.log(`- ${change.coinType}:`);
      if (change.changes) {
        change.changes.forEach(c => {
          console.log(`  ${c.variant}: ${BigInt(c.amount).toString()}`);
        });
      }
    });
  }

  console.log('\n=== Events ===');
  if (txDetails.events && txDetails.events.length > 0) {
    txDetails.events.forEach((e, i) => {
      console.log(`${i + 1}. ${e.type.split('::').pop()}:`);
      console.log(`   ${JSON.stringify(e.parsedJson, null, 2)}`);
    });
  }

  console.log('\n=== Created Objects ===');
  if (txDetails.objectChanges) {
    txDetails.objectChanges
      .filter(obj => obj.type === 'created')
      .forEach(obj => {
        console.log(`- ${obj.objectType?.split('::')[1]}:`);
        console.log(`  ID: ${obj.objectId}`);
      });
  }
}

checkTransaction().catch(console.error);
