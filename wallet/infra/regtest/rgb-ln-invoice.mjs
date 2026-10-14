import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WdkWallet } from '../../apps/local-service/wallet.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = join(root, 'native-data/e2e');
const secrets = JSON.parse(await readFile(join(directory, 'test-passwords.json'), 'utf8'));
const { assetId } = JSON.parse(await readFile(join(directory, 'rgb-asset.json'), 'utf8'));
const file = join(directory, 'rgb-ln-invoice.json');
process.env.AIRGB_LDK_PEER_PORT = '9745';
const wallet = new WdkWallet(join(directory, 'a'));
try {
  await wallet.unlock(secrets.a);
  let invoice;
  try { invoice = JSON.parse(await readFile(file, 'utf8')).invoice; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!invoice) {
    // The receiver has not imported this contract yet. The pinned binding
    // allows asset_id to be omitted for a blinded, asset-agnostic invoice.
    const created = await wallet.account.createRgbInvoice({ min_confirmations: 1, witness: false, duration_seconds: 3600 });
    invoice = created.invoice;
    await writeFile(file, JSON.stringify({ assetId, invoice }), { mode: 0o600, flag: 'wx' });
  }
  const decoded = await wallet.account.decodeRgbInvoice(invoice);
  process.stdout.write(JSON.stringify({ step: 'rgb_ln_receive_ready', assetId, invoiceReady: !!invoice, decoded }) + '\n');
} finally { await wallet.shutdown(); }
