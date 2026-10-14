# Matrice delle capacità — 14 ottobre 2026

| Capacità | Metodo | Prova locale | Limite |
|---|---|---|---|
| Compilazione vincoli | `parseExtraction`, `feeToMsat`, `compileConstraints` | 10 test automatici complessivi superati | Nessun enforcement nel router nativo |
| Anteprima canonica | `decodeInvoice` prima di `compileConstraints` | Typecheck e test di importo/rete/asset | Non autorizza né esegue il pagamento |
| Keystore e lifecycle | `VaultStore`, manager WDK account `0`, `unlock`, `dispose` | Test GnuPG e smoke regtest superati | Il seed non contiene backup RGB/LDK; workaround `dispose` beta.15 |
| Letture wallet e invoice | Bilancio, nodo, peer, canali, asset, pagamenti, invoice BTC | Smoke reale; due nodi finanziati e collegati | Una quote o un saldo totale non provano liquidità RGB |
| Canali BTC Lightning | `connectPeer`, `openChannel`, `listChannels` | Due canali da 200.000 sat tra i nodi, uno pubblico e uno privato, entrambi `Opened` e `is_usable=true` | Non dimostrano un pagamento terminale |
| Invio BTC Lightning libero | `PaymentStore.prepare/confirm/reconcile`, `sendPayment` | Due intenti regtest distinti inviati; nativo `Outbound Pending`, invoice destinatario `Pending` dopo riconciliazione | Successo non dimostrato; non reinviare le invoice |
| Asset RGB on-chain | Fixture isolato `@utexo/wdk-wallet-rgb`, `issueAssetNia`, `transfer`; ricezione WDK Lightning `createRgbInvoice`, `refreshTransfers` | AIRTEST da 1.000.000 unità emesso; 10.000 trasferite, stato ricezione `Settled`, saldo spendibile 10.000 | Fixture Node 22 distinto dal servizio Node 24; questo non è un pagamento RGB Lightning |
| Canale RGB Lightning | `createUtxos`, `openChannel` con `asset_id` | Dopo due UTXO colorable da 200.000 sat, canale da 150.000 sat e 10.000 AIRTEST `Opened` e utilizzabile su entrambi i nodi | Il saldo BTC ordinario non basta a finanziare un canale RGB |
| Invio RGB Lightning | `createLightningInvoice`, `PaymentStore.prepare/confirm/reconcile`, `sendPayment` | Invoice da 1.000 AIRTEST e 5.000.000 msat inviata una volta; nativo e destinatario ancora `Pending` | Settlement non dimostrato; nessun reinvio automatico |
| Idempotenza | SQLite `PaymentStore` | Test di doppio click, timeout e restart; script e2e riconcilia e blocca nuovi invii se esistono intenti non terminali | Intenti pending richiedono riconciliazione nativa |
| Gate dei vincoli | `PaymentStore.prepare` | Budget `0` restituisce `CONSTRAINT_UNSUPPORTED` prima dell'invio, anche con canale aperto | Fee cap, esclusioni, scorer e retry vincolati non esposti dal binding verificato |
| QVAC | `interpretWithQvac` | Fuori dal perimetro di questo collaboratore | Nessuna prova end to end QVAC rivendicata qui |

Versioni bloccate nel servizio: Node 24.19.0, `@utexo/wdk-rgb-lightning@0.1.0-beta.15`, `@utexo/rgb-lightning-node-nodejs@0.1.0-beta.11`, React 19.2.0 e Vite 7.1.7. La fixture RGB on-chain ha un lockfile separato con Node 22.22.2, `@utexo/wdk-wallet-rgb@2.0.3` e `@utexo/rgb-lib-linux-x64@0.3.0-beta.8`. Su Node 24 quest'ultimo addon fallisce la compilazione (`args.Holder`); per questo la fixture resta isolata. La release nativa indica `rgb-lightning-node@v0.10.0-beta.3` (`0bfa66fa256a6c36f3737d5b6402eacea40c68fc`) e rust-lightning `50c917b5bd29838955747fa31d67d50bde80be37`. Il routing nativo non è stato modificato.

La firma TypeScript `sendPayment(request: object)` non dimostra la disponibilità di fee cap, esclusioni o scorer. Il servizio blocca ogni intento con vincoli, senza inoltrare campi che il backend potrebbe ignorare. Vedere [il resoconto regtest](docs/REGTEST_REPORT.md).
