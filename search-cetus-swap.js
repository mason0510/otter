const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({
  url: getFullnodeUrl('mainnet'),
});

const CETUS_PACKAGE = '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb';

async function findSwapEntry() {
  const modules = await client.getNormalizedMoveModulesByPackage({
    package: CETUS_PACKAGE,
  });

  console.log('Searching for trade/swap related functions...\n');

  for (const [moduleName, module] of Object.entries(modules)) {
    if (!module.exposedFunctions) continue;

    const funcs = [];
    for (const key in module.exposedFunctions) {
      const func = module.exposedFunctions[key];
      if (!func || !func.name) continue;
      const name = func.name;

      if (name.includes('trade') || name.includes('swap') ||
          name.includes('Trade') || name.includes('Swap') ||
          name === 'swap_exact_coin_for_coin' ||
          name === 'swap_coin_for_coin') {
        funcs.push(name);
      }
    }

    if (funcs.length > 0) {
      console.log(`${moduleName}:`);
      funcs.forEach(f => console.log(`  - ${f}`));
    }
  }
}

findSwapEntry().catch(console.error);
