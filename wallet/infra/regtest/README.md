# Ambiente regtest separato

Il progetto Compose `airgb-regtest` avvia Bitcoin Core 30.2, Electrs 0.11.0 e proxy RGB 0.3.0 in container separati. I dati Bitcoin/Electrs sono in volumi Podman; wallet, keystore e configurazione privata sono in `native-data/`, ignorata da Git. Le porte RPC/indexer/proxy sono esposte solo su loopback. La topologia deriva dal [compose RGB Lightning](https://raw.githubusercontent.com/RGB-Tools/rgb-lightning-node/master/compose.yaml), con tag bloccati in `compose.yaml`.

In questa macchina Docker daemon non è attivo; è stata avviata la socket Podman rootless. Se non è più disponibile, avviarla con `podman system service --time=0 unix:///run/user/1000/podman/podman.sock` (o il percorso socket dell'utente), poi:

```bash
node infra/regtest/setup.mjs
podman compose --env-file native-data/regtest/wallet.env -f infra/regtest/compose.yaml up -d
node infra/regtest/bitcoin-rpc.mjs getblockchaininfo
npm run dev:regtest
```

Per l'istanza peer indipendente: `npm run dev:peer` in un secondo terminale. Usa `127.0.0.1:5174` per il sito, `127.0.0.1:8788` per l'API, `9736` per il peer LDK e `native-data/peer-wallet` per lo stato. Il nodo principale usa `5173`, `8787`, `9735` e `native-data/wallet`. Entrambi condividono solo i servizi regtest, non seed o stato del wallet.

Ogni directory del nodo ha un file `wdk-rgb-lightning.owner` creato all'unlock e rimosso allo shutdown ordinato. Se un processo termina bruscamente, verificare prima che non esista più alcun processo che usa quella directory; solo dopo rimuovere il file rimasto. Non avviare due processi sulla stessa directory.

`setup.mjs` crea una password RPC casuale e non sovrascrive il file. `bitcoin-rpc.mjs` passa la password a `bitcoin-cli` su stdin, senza stamparla nella riga di comando. Il wallet miner `miner` è già stato creato in questa istanza; non ripetere `createwallet`. Per altre monete di test si possono generare blocchi con `node infra/regtest/bitcoin-rpc.mjs -rpcwallet=miner -generate 1`.

Per una nuova prova con due nodi, finanziare ciascun indirizzo `bcrt1` mostrato dalla rispettiva dashboard con `node infra/regtest/bitcoin-rpc.mjs -rpcwallet=miner sendtoaddress <indirizzo> 0.01`, quindi generare un blocco. Collegare un nodo all'indirizzo peer dell'altro, aprire un canale dal wallet finanziato e attendere che il nodo lo segnali utilizzabile. La prova di pagamento richiede `ENABLE_REGTEST_SEND=1` nell'istanza mittente. La prova già eseguita e gli intenti ancora pendenti sono nel [resoconto](../../docs/REGTEST_REPORT.md): non reinviare quelle invoice.

Per collegare un nodo regtest esistente occorrono il suo `pubkey@host:porta` raggiungibile e la stessa rete. Dopo `connectPeer`, verificare `listPeers`. Per pagare occorrono poi un canale finanziato e liquidità direzionale; per RGB anche l'asset specifico sul percorso. Il wallet creato qui ha stato e seed propri: la connessione peer non unisce i wallet né importa i canali dell'altro nodo.

Prima di usare fondi o canali di valore, predisporre backup separati di keystore e stato nativo RGB/Lightning. Non usare `compose down -v` o cancellare `native-data` su un nodo con canali attivi.
