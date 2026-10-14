import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VaultStore } from './vault.js';
import { WdkWallet } from './wallet.js';

test('keystore cifra entropia, recupera frase e respinge password errata', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'airgb-vault-'));
  try {
    const store = new VaultStore(dir);
    const phrase = await store.create('password-di-test-lunga');
    assert.equal(phrase?.split(' ').length, 12);
    assert.equal(await store.exists(), true);
    assert.equal(await store.unlockMnemonic('password-di-test-lunga'), phrase);
    await assert.rejects(store.unlockMnemonic('password-errata-lunga'));
    await assert.rejects(store.create('un-altra-password-lunga'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('decoder Lightning verifica rete, scadenza e campi RGB', async () => {
  const wallet = new WdkWallet(join(tmpdir(), 'airgb-unused'));
  const invoice = 'lnbcrt' + 'a'.repeat(40);
  const base = { network: 'regtest', payment_hash: 'a'.repeat(64), timestamp: Math.floor(Date.now() / 1000), expiry_sec: 3600, amt_msat: 3000000, asset_id: 'rgb:test-contract', asset_amount: 2 };
  (wallet as unknown as { account: unknown }).account = { decodeInvoice: async () => base };
  const decoded = await wallet.decodeLightning(invoice);
  assert.equal(decoded.amountMsat, '3000000');
  assert.equal(decoded.assetId, 'rgb:test-contract');
  assert.equal(decoded.assetAmount, '2');
  (wallet as unknown as { account: unknown }).account = { decodeInvoice: async () => ({ ...base, network: 'testnet' }) };
  await assert.rejects(wallet.decodeLightning(invoice));
  (wallet as unknown as { account: unknown }).account = { decodeInvoice: async () => ({ ...base, timestamp: 1 }) };
  await assert.rejects(wallet.decodeLightning(invoice));
});
