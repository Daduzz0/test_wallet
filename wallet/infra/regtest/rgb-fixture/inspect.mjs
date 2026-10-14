import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import WalletManagerRgb from '@utexo/wdk-wallet-rgb';
import { VaultStore } from '../../../apps/local-service/vault.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const directory = join(root, 'native-data/e2e');
const secrets = JSON.parse(await readFile(join(directory, 'test-passwords.json'), 'utf8'));
const { assetId } = JSON.parse(await readFile(join(directory, 'rgb-asset.json'), 'utf8'));
const vault = new VaultStore(join(directory, 'rgb-issuer'));
const mnemonic = await vault.unlockMnemonic(secrets.rgb);
const manager = new WalletManagerRgb(mnemonic, { network: 'regtest', dataDir: join(directory, 'rgb-issuer/state'), indexerUrl: process.env.INDEXER_URL, transportEndpoint: process.env.RGB_PROXY_ENDPOINT });
let account;
try {
  account = await manager.getAccount(0);
  await account.registerWallet();
  account.syncWallet();
  const refreshed = account.refreshWallet();
  process.stdout.write(JSON.stringify({ step: 'rgb_issuer_state', refreshed, transfers: account.getTransfers({ assetId, limit: 20 }), balance: (await account.getTokenBalance(assetId)).toString() }) + '\n');
} finally { account?.dispose(); manager._accounts = {}; manager.dispose(); }
