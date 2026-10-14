import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WdkWallet } from '../../apps/local-service/wallet.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = join(root, 'native-data/e2e');
const secrets = JSON.parse(await readFile(join(directory, 'test-passwords.json'), 'utf8'));
const { assetId } = JSON.parse(await readFile(join(directory, 'rgb-asset.json'), 'utf8'));
const rpc = async (method, params = [], rpcWallet = '') => {
  const auth = Buffer.from(`${process.env.BITCOIND_RPC_USER}:${process.env.BITCOIND_RPC_PASSWORD}`).toString('base64');
  const response = await fetch(`http://127.0.0.1:${process.env.BITCOIND_RPC_PORT ?? 18443}${rpcWallet ? `/wallet/${rpcWallet}` : ''}`, {
    method: 'POST', headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '1.0', id: 'airgb-rgb-channel', method, params }),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(`Bitcoin RPC ${method}: ${data.error?.message ?? response.status}`);
  return data.result;
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
process.env.AIRGB_LDK_PEER_PORT = '9745';
const a = new WdkWallet(join(directory, 'a'));
process.env.AIRGB_LDK_PEER_PORT = '9746';
const b = new WdkWallet(join(directory, 'b'));
try {
  await a.unlock(secrets.a); await b.unlock(secrets.b);
  const bPeer = (await b.summary()).peerUri;
  await a.connectPeer(bPeer);
  const channels = await a.channels();
  const unspents = await a.account.listUnspents();
  const colorableSat = unspents.reduce((sum, entry) => sum + (entry.utxo.colorable ? BigInt(entry.utxo.btc_amount) : 0n), 0n);
  process.stdout.write(JSON.stringify({ step: 'rgb_utxo_state', colorableSat: colorableSat.toString(), balance: await a.assetBalance(assetId) }) + '\n');
  if (!channels.some(channel => channel.assetId === assetId)) {
    const balance = await a.assetBalance(assetId);
    if (BigInt(balance.spendable ?? '0') < 10000n) throw new Error('Asset RGB insufficiente per canale');
    if (colorableSat < 175000n) {
      const utxoMarker = join(directory, 'rgb-channel-large-utxos.json');
      let requested = false;
      try { requested = JSON.parse(await readFile(utxoMarker, 'utf8')).requested === true; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (!requested) {
        await a.account.createUtxos({ up_to: false, num: 2, size: 200000, fee_rate: 2, skip_sync: false });
        await writeFile(utxoMarker, JSON.stringify({ requested: true }), { mode: 0o600, flag: 'wx' });
      }
      process.stdout.write(JSON.stringify({ step: 'rgb_large_utxos_need_confirmation', colorableSat: colorableSat.toString() }) + '\n');
      process.exitCode = 2;
    } else {
      const opened = await a.openChannel({ peer: bPeer, capacitySat: '150000', assetId, assetAmount: '10000' });
      process.stdout.write(JSON.stringify({ step: 'rgb_channel_requested', opened }) + '\n');
    }
  }
  if (process.exitCode !== 2) {
    let mined = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      await a.sync(); await b.sync();
      const channel = (await a.account.listChannels()).find(row => row.asset_id === assetId);
      const receiver = (await b.account.listChannels()).find(row => row.channel_id === channel?.channel_id);
      if (channel?.is_usable && receiver?.is_usable) break;
      if (!mined && channel?.funding_txid) {
        try {
          await rpc('getmempoolentry', [channel.funding_txid]);
          const mineTo = await rpc('getnewaddress', [], 'miner');
          await rpc('generatetoaddress', [6, mineTo]);
          mined = true;
          process.stdout.write(JSON.stringify({ step: 'rgb_channel_funding_confirmed', fundingTxid: channel.funding_txid }) + '\n');
        } catch (error) { if (!String(error.message).includes('Transaction not in mempool')) throw error; }
      }
      await pause(1500);
    }
  }
  const aChannels = await a.account.listChannels();
  const bChannels = await b.account.listChannels();
  process.stdout.write(JSON.stringify({ step: 'rgb_channels', a: aChannels.filter(row => row.asset_id === assetId), b: bChannels.filter(row => aChannels.some(aRow => aRow.asset_id === assetId && aRow.channel_id === row.channel_id)) }) + '\n');
  if (process.exitCode !== 2 && !aChannels.some(row => row.asset_id === assetId && row.is_usable)) throw new Error('Canale RGB non utilizzabile entro 90 secondi');
} finally { await Promise.allSettled([a.shutdown(), b.shutdown()]); }
