const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({
  url: getFullnodeUrl('mainnet'),
});

const KRIYA_PACKAGE = '0xbd8d4489782042c6fafad4de4bc6a5e0b84a43c6c00647ffd7062d1e2bb7549e';

async function findSwapEntry() {
  const modules = await client.getNormalizedMoveModulesByPackage({
    package: KRIYA_PACKAGE,
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
