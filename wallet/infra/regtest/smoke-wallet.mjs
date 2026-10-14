import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateMnemonic } from 'bip39';
import WalletManagerRgbLightning from '@utexo/wdk-rgb-lightning';

const keys = ['BITCOIND_RPC_USER', 'BITCOIND_RPC_PASSWORD', 'INDEXER_URL', 'RGB_PROXY_ENDPOINT'];
if (keys.some(key => !process.env[key])) throw new Error('Caricare prima native-data/regtest/wallet.env');
const directory = await mkdtemp(join(tmpdir(), 'airgb-wdk-smoke-'));
let manager;
try {
  manager = new WalletManagerRgbLightning(generateMnemonic(128), { network: 'regtest', dataDir: join(directory, 'node'), nodeSeedDerivation: 'auto' });
  const account = await manager.getAccount(0);
  await account.unlock({
    bitcoind_rpc_username: process.env.BITCOIND_RPC_USER,
    bitcoind_rpc_password: process.env.BITCOIND_RPC_PASSWORD,
    bitcoind_rpc_host: process.env.BITCOIND_RPC_HOST ?? '127.0.0.1',
    bitcoind_rpc_port: Number(process.env.BITCOIND_RPC_PORT ?? 18443),
    indexer_url: process.env.INDEXER_URL,
    proxy_endpoint: process.env.RGB_PROXY_ENDPOINT,
    announce_addresses: [], announce_alias: 'AIR-GB-smoke',
  });
  const address = await account.getAddressState();
  if (address.status !== 'ready' || !address.address.startsWith('bcrt1')) throw new Error('Indirizzo regtest non pronto');
  const btc = await account.getBalance();
  await account.getNodeInfo();
  await account.getNetworkInfo();
  await account.listChannels();
  await account.listPeers();
  process.stdout.write(JSON.stringify({ network: 'regtest', account: 0, addressReady: true, btcSpendableSat: btc.toString(), nodeReadings: 'ok' }) + '\n');
} finally {
  // beta.15 manager.dispose shuts the binding before generic WDK reads account.keyPair.
  if (manager) manager._accounts = {};
  manager?.dispose();
  await rm(directory, { recursive: true, force: true });
}
