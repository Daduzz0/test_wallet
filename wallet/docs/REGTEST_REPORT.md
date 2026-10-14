# Resoconto regtest — 14 ottobre 2026

## Risultati osservati

1. Bitcoin Core, Electrs e proxy RGB locali avviati con Podman. Due wallet WDK RGB Lightning indipendenti hanno creato keystore, ottenuto indirizzi regtest, ricevuto BTC di prova e stabilito una connessione peer. Due canali BTC da 200.000 sat, uno pubblico e uno privato, risultano `Opened`, `ready=true`, `is_usable=true` su entrambi i nodi.
2. Due invoice BTC Lightning da 5.000.000 msat sono state inviate come intenti distinti. Alla verifica successiva (height 136) il mittente riporta `Outbound Pending` per entrambe e il destinatario `Pending`. Questo non è un pagamento riuscito né fallito. Gli intenti sono conservati nel database e lo script e2e blocca nuovi invii finché restano non terminali. Non è stato tentato un retry della stessa invoice.
3. Con un canale BTC aperto, `PaymentStore.prepare` ha respinto una policy con fee cap pari a zero come `CONSTRAINT_UNSUPPORTED` prima di chiamare il nodo. Le capacità di fee cap, esclusione nodi e scorer non sono dimostrate dalla versione nativa installata.
4. `issueAssetNia` nel modulo RGB Lightning ha restituito `UnsupportedInExternalSignerMode`. Un wallet RGB on-chain isolato su Node 22 ha emesso 1.000.000 unità fittizie AIRTEST (`rgb:tDK9ffAP-tx6SO~n-zhBDJTT-O8b606m-4zVM1rB-1eLOFeA`). Il nodo Lightning ha creato un'invoice RGB generica senza contract ID preimportato. Il trasferimento di 10.000 unità ha prodotto la transazione `a2befc2526a33560f7b35520beb3f158d19709aaa11d5df172287fc3d938c23c`; dopo refresh del mittente e conferma Bitcoin, il ricevente riporta `Settled` e saldo spendibile 10.000. Questa prova è **RGB on-chain**, distinta da RGB Lightning.
5. Il primo tentativo di aprire un canale RGB da 150.000 sat falliva con `Rln(NoAvailableUtxos)`: gli UTXO colorable disponibili sommavano solo 50.000 sat. Due UTXO colorable da 200.000 sat ciascuno sono stati creati e confermati. La richiesta successiva è stata accettata; il canale RGB da 150.000 sat e 10.000 AIRTEST risulta `Opened`, `ready=true`, `is_usable=true` su entrambi i nodi. Funding txid: `47acd97125e811abbfb09cc6a094269b79b5d6067b886c39ac5dcb03ca90dcce`.
6. Una sola invoice RGB Lightning da 1.000 AIRTEST e 5.000.000 msat è stata inviata attraverso il canale. Dopo oltre due minuti con i nodi attivi, mittente e destinatario riportano ancora `Pending`. L'intento è persistito e non viene reinviato automaticamente. Non è dimostrato un pagamento RGB Lightning terminale.

## Verifiche eseguite

| Verifica | Esito |
|---|---|
| `npm run typecheck` | Passato |
| `npm run build` | Passato, 29 moduli trasformati |
| `npm test` | 10/10 passati con accesso GnuPG locale; nel sandbox ristretto il test GnuPG fallisce per accesso al suo ambiente |
| `smoke-service.mjs` | Passato: account `0`, rete regtest, letture e invoice BTC decodificata |
| BTC/RGB Lightning e RGB on-chain dal nodo reale | Stato descritto sopra, senza attribuire terminalità a `Pending` |
| Dataset `tests/phrases.json` | 34 risultati attesi presenti; esecuzione QVAC seguita dal collega |

## Limiti per il completamento

- Il wallet base ha frontend, lifecycle, letture, ricezione di invoice, stato persistente, peer e canali BTC, ma manca una ricevuta BTC Lightning terminale. La storia nativa di pagamenti è letta, senza trasformare `Pending` in successo.
- RGB on-chain ha una prova completa di asset fittizio trasferito e ricevuto. RGB Lightning ha un canale utilizzabile e un invio ancora `Pending`, senza ricevuta terminale.
- Punto 1: **interpretazione e validazione completate; enforcement reale da integrare**. Il bridge router/scorer manca. Il servizio blocca i vincoli non supportati. QVAC è in carico al collega.
- I metadati della release `@utexo/rgb-lightning-node-nodejs@0.1.0-beta.11` indicano `rgb-lightning-node@v0.10.0-beta.3`, commit `0bfa66fa256a6c36f3737d5b6402eacea40c68fc`, submodule rust-lightning `50c917b5bd29838955747fa31d67d50bde80be37` e rgb-lib `d8dba807d5028635143ffc8098e1b59086b646a0`. Le dipendenze distribuite sono bloccate nei lockfile; non sono state fatte modifiche al router nativo.

I dati di test e le password locali sono in `native-data/`, esclusa dal repository. I due nodi hanno canali aperti: non cancellare quelle directory né i volumi regtest. Il wallet RGB emittente ha stato client-side separato; la frase seed da sola non lo ripristina.
