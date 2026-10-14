# AIR-GB Wallet — prototipo regtest locale

Frontend React e servizio Node locale con `@utexo/wdk-rgb-lightning@0.1.0-beta.15`. Il sito non possiede il seed: il nodo nativo, lo stato RGB/Lightning e il keystore restano sul dispositivo. Il progetto è limitato a **regtest**.

## Ambiente separato

È disponibile una rete regtest locale con Bitcoin Core, Electrs e proxy RGB in `infra/regtest/compose.yaml`. La configurazione privata è in `native-data/regtest/wallet.env` (ignorata da Git). I container sono stati avviati con Podman e il wallet miner è stato creato. Dettagli e comandi in [infra/regtest/README.md](infra/regtest/README.md).

```bash
podman compose --env-file native-data/regtest/wallet.env -f infra/regtest/compose.yaml up -d
npm run dev:regtest
```

Aprire `http://127.0.0.1:5173`. Nella sezione wallet creare un keystore con una password locale, conservare la frase BIP39 mostrata una sola volta, poi sbloccare il nodo. Si può anche importare una frase di test esistente. Lo stato nativo è in `native-data/wallet/wdk-rgb-lightning`, separato dal database degli intenti e dal volume Bitcoin.

Per un secondo nodo indipendente sulla stessa regtest, avviare `npm run dev:peer` in un altro terminale e aprire `http://127.0.0.1:5174`. Il suo stato è in `native-data/peer-wallet`, con porta Lightning `9736`; il nodo principale usa `9735`. Ogni nodo richiede il proprio keystore. La dashboard mostra il `pubkey@host:porta` da copiare nell'altro wallet. Per finanziare gli indirizzi di prova usare il wallet miner regtest tramite `infra/regtest/bitcoin-rpc.mjs`, poi generare blocchi e aggiornare i saldi. La connessione peer da sola non crea un canale.

Il keystore usa GnuPG simmetrico: richiede `gpg` disponibile localmente. `@tetherto/wdk-secret-manager@1.0.0-beta.3` non si carica su questo Node 24 (`require.addon is not a function`), quindi non viene usato. La password non va messa in `VITE_*`, nell'URL o nel repository.

Il servizio espone letture del nodo, invoice BTC Lightning e RGB, collegamento peer, apertura canale e un flusso di preparazione/conferma di invoice regtest. L'invio è disabilitato di default (`ENABLE_REGTEST_SEND=0`): due invii BTC Lightning di prova risultano ancora `Pending`, senza esito terminale. I vincoli di routing non vengono inoltrati al backend; un intento con vincoli viene bloccato. RGB on-chain e RGB Lightning hanno form distinti.
Il binding installato richiede almeno 3.000.000 msat per un HTLC instradato su RGB; il servizio rifiuta invoice RGB Lightning e intenti inferiori a tale soglia.

Il modulo QVAC esistente è separato dal lavoro sul wallet ed è in carico a un altro collaboratore. La sua presenza non abilita il routing vincolato.
L'anteprima della policy usa ora la decodifica WDK della invoice e rifiuta rete, importo o contract ID discordanti. Il destinatario noto non può essere escluso. È ancora una preview: nessun parametro di routing vincolato viene applicato all'invio.

## Verifiche

```bash
npm run typecheck
npm test
npm run build
node --env-file=native-data/regtest/wallet.env infra/regtest/smoke-wallet.mjs
node --import tsx --env-file=native-data/regtest/wallet.env infra/regtest/smoke-service.mjs
```

Gli smoke test creano wallet temporanei senza fondi e non inviano pagamenti. Il test regtest con due nodi ha aperto due canali BTC Lightning utilizzabili, ma i pagamenti BTC sono ancora `Pending`. Un asset RGB fittizio è stato emesso, trasferito on-chain e ricevuto con stato `Settled`; è stato aperto anche un canale RGB Lightning utilizzabile, mentre il relativo pagamento è ancora `Pending`. `tests/phrases.json` contiene 34 frasi attese indipendenti dal modello; non è stato eseguito contro QVAC. Dettagli, evidenze e limiti nel [resoconto regtest](docs/REGTEST_REPORT.md).

Stato del punto 1: **interpretazione e validazione completate; enforcement reale da integrare**. Le API del binding installato non dimostrano budget fee, esclusioni o scorer per pagamento. Vedere [CAPABILITIES.md](CAPABILITIES.md).
