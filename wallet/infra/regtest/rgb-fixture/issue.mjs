import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import WalletManagerRgb from '@utexo/wdk-wallet-rgb';
import { VaultStore } from '../../../apps/local-service/vault.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const directory = join(root, 'native-data/e2e');
await mkdir(directory, { recursive: true, mode: 0o700 });
const secretsPath = join(directory, 'test-passwords.json');
const secrets = JSON.parse(await readFile(secretsPath, 'utf8'));
if (!secrets.rgb) {
  secrets.rgb = randomBytes(32).toString('hex');
  await writeFile(secretsPath, JSON.stringify(secrets), { mode: 0o600 });
}
const vault = new VaultStore(join(directory, 'rgb-issuer'));
if (!(await vault.exists())) await vault.create(secrets.rgb);
const mnemonic = await vault.unlockMnemonic(secrets.rgb);
const manager = new WalletManagerRgb(mnemonic, {
  network: 'regtest', dataDir: join(directory, 'rgb-issuer/state'),
  indexerUrl: process.env.INDEXER_URL, transportEndpoint: process.env.RGB_PROXY_ENDPOINT,
});
let account;
try {
  account = await manager.getAccount(0);
  await account.registerWallet();
  account.syncWallet();
  const address = account.getAddress();
  const balance = await account.getBalance();
  process.stdout.write(JSON.stringify({ step: 'rgb_issuer_ready', address, btcSat: balance.toString() }) + '\n');
  if (balance < 100000n) {
    process.stdout.write(JSON.stringify({ step: 'fund_rgb_issuer_first', address }) + '\n');
    process.exitCode = 2;
  } else {
    const inventory = account.listAssets();
    process.stdout.write(JSON.stringify({ step: 'asset_inventory', inventory }) + '\n');
    const assets = Array.isArray(inventory) ? inventory : Object.values(inventory).flatMap(value => Array.isArray(value) ? value : []);
    let asset = assets.find(item => item.ticker === 'AIRTEST');
    if (!asset) {
      const count = await account.createUtxos({ upTo: true, num: 4, size: 10000, feeRate: 2 });
      process.stdout.write(JSON.stringify({ step: 'rgb_utxos', count }) + '\n');
      account.syncWallet();
      asset = account.issueAssetNia({ ticker: 'AIRTEST', name: 'AIR GB regtest', amounts: [1000000], precision: 0 });
      process.stdout.write(JSON.stringify({ step: 'rgb_issued', asset }) + '\n');
    }
    const assetId = asset.assetId ?? asset.asset_id ?? asset.id ?? asset.asset?.asset_id;
    if (!assetId) throw new Error('Contract ID non riconosciuto dopo issuance');
    await writeFile(join(directory, 'rgb-asset.json'), JSON.stringify({ assetId }), { mode: 0o600 });
    process.stdout.write(JSON.stringify({ step: 'rgb_asset_ready', assetId }) + '\n');
  }
} finally {
  account?.dispose();
  manager._accounts = {};
  manager.dispose();
}
