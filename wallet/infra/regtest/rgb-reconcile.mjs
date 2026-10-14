import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WdkWallet } from '../../apps/local-service/wallet.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = join(root, 'native-data/e2e');
const secrets = JSON.parse(await readFile(join(directory, 'test-passwords.json'), 'utf8'));
const { assetId } = JSON.parse(await readFile(join(directory, 'rgb-asset.json'), 'utf8'));
process.env.AIRGB_LDK_PEER_PORT = '9745';
const wallet = new WdkWallet(join(directory, 'a'));
try {
  await wallet.unlock(secrets.a);
  await wallet.sync();
  const before = await wallet.account.listTransfers(assetId).catch(error => ({ error: error.message }));
  const refreshed = await wallet.account.refreshTransfers({ filter: [], skip_sync: false });
  const after = await wallet.account.listTransfers(assetId).catch(error => ({ error: error.message }));
  const assets = await wallet.assets();
  const balance = await wallet.assetBalance(assetId).catch(error => ({ error: error.message }));
  process.stdout.write(JSON.stringify({ step: 'rgb_reconcile', before, refreshed, after, assets, balance }) + '\n');
} finally { await wallet.shutdown(); }
