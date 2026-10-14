import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WdkWallet } from '../../apps/local-service/wallet.ts';
import { PaymentStore } from '../../apps/local-service/payments.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = join(root, 'native-data/e2e');
const secrets = JSON.parse(await readFile(join(directory, 'test-passwords.json'), 'utf8'));
const { assetId } = JSON.parse(await readFile(join(directory, 'rgb-asset.json'), 'utf8'));
const marker = join(directory, 'rgb-ln-payment.json');
process.env.AIRGB_LDK_PEER_PORT = '9745';
const a = new WdkWallet(join(directory, 'a'));
process.env.AIRGB_LDK_PEER_PORT = '9746';
const b = new WdkWallet(join(directory, 'b'));
let payments;
try {
  await a.unlock(secrets.a); await b.unlock(secrets.b);
  await a.connectPeer((await b.summary()).peerUri);
  const channel = (await a.account.listChannels()).find(row => row.asset_id === assetId && row.is_usable);
  if (!channel || channel.asset_local_amount < 1000) throw new Error('Canale RGB senza liquidità spendibile');
  payments = new PaymentStore(join(directory, 'a'), a);
  let attempt;
  try { attempt = JSON.parse(await readFile(marker, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!attempt) {
    const invoice = await b.createLightningInvoice({ amountMsat: '5000000', expirySec: 3600, assetId, assetAmount: '1000' });
    const id = randomUUID();
    const prepared = await payments.prepare({ id, invoice: invoice.invoice });
    attempt = { id, invoice: invoice.invoice, paymentHash: prepared.paymentHash };
    await writeFile(marker, JSON.stringify(attempt), { mode: 0o600, flag: 'wx' });
    process.env.ENABLE_REGTEST_SEND = '1';
    const submitted = await payments.confirm(id);
    process.stdout.write(JSON.stringify({ step: 'rgb_payment_submitted', id, status: submitted.status }) + '\n');
  }
  let result = await payments.reconcile(attempt.id);
  for (let i = 0; i < 90 && !['succeeded', 'failed'].includes(result.status); i++) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    await a.sync(); await b.sync();
    result = await payments.reconcile(attempt.id);
    if (i % 10 === 0) process.stdout.write(JSON.stringify({ step: 'rgb_payment_wait', seconds: Math.round(i * 1.5), status: result.status }) + '\n');
  }
  const receiver = await b.invoiceStatus(attempt.invoice);
  const native = await a.paymentStatus(attempt.paymentHash);
  delete native.preimage;
  process.stdout.write(JSON.stringify({ step: 'rgb_payment_result', id: attempt.id, local: result.status, native: native.status, receiver: receiver.status, aChannel: (await a.account.listChannels()).find(row => row.asset_id === assetId), bChannel: (await b.account.listChannels()).find(row => row.asset_id === assetId) }) + '\n');
  if (result.status !== 'succeeded' || receiver.status !== 'Succeeded') process.exitCode = 2;
} finally {
  payments?.close();
  await Promise.allSettled([a.shutdown(), b.shutdown()]);
}
