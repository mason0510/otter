const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({
  url: getFullnodeUrl('mainnet'),
});

const CETUS_PACKAGE = '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb';

async function listCetusPoolFunctions() {
  const modules = await client.getNormalizedMoveModulesByPackage({
    package: CETUS_PACKAGE,
  });

  const poolModule = modules.pool;

  if (poolModule && poolModule.exposedFunctions) {
    console.log(`\nCetus Pool Module (${Object.keys(poolModule.exposedFunctions).length} functions):\n`);

    const funcs = [];
    for (const key in poolModule.exposedFunctions) {
      const func = poolModule.exposedFunctions[key];
      if (func && func.name) {
        funcs.push(func.name);
      }
    }

    funcs.sort().forEach((f, i) => {
      console.log(`${String(i + 1).padStart(2, '0')}. ${f}`);
    });
  }
}

listCetusPoolFunctions().catch(console.error);
