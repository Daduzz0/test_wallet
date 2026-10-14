import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import WalletManagerRgb from '@utexo/wdk-wallet-rgb';
import { VaultStore } from '../../../apps/local-service/vault.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const directory = join(root, 'native-data/e2e');
const secrets = JSON.parse(await readFile(join(directory, 'test-passwords.json'), 'utf8'));
const { assetId, invoice } = JSON.parse(await readFile(join(directory, 'rgb-ln-invoice.json'), 'utf8'));
const marker = join(directory, 'rgb-send.json');
try { const prior = JSON.parse(await readFile(marker, 'utf8')); if (prior.status !== 'preflight_failed') throw new Error(`Invio RGB già avviato: ${prior.status}`); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const vault = new VaultStore(join(directory, 'rgb-issuer'));
const mnemonic = await vault.unlockMnemonic(secrets.rgb);
const manager = new WalletManagerRgb(mnemonic, { network: 'regtest', dataDir: join(directory, 'rgb-issuer/state'), indexerUrl: process.env.INDEXER_URL, transportEndpoint: process.env.RGB_PROXY_ENDPOINT });
let account;
try {
  account = await manager.getAccount(0);
  await account.registerWallet();
  account.syncWallet();
  const balance = await account.getTokenBalance(assetId);
  if (balance < 10000n) throw new Error('Saldo RGB insufficiente nel fixture');
  await writeFile(marker, JSON.stringify({ status: 'unknown', assetId }), { mode: 0o600 });
  const sent = await account.transfer({ recipient: invoice, token: assetId, amount: 10000, feeRate: 2 });
  // In this pinned SDK the transfer remains WaitingCounterparty until refresh.
  account.refreshWallet();
  await writeFile(marker, JSON.stringify({ status: 'submitted', assetId, txid: sent.hash, fee: sent.fee?.toString() ?? null }), { mode: 0o600 });
  process.stdout.write(JSON.stringify({ step: 'rgb_sent', txid: sent.hash, fee: sent.fee?.toString() ?? null }) + '\n');
} finally {
  account?.dispose(); manager._accounts = {}; manager.dispose();
}
