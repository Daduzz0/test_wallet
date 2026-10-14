# AGENTS.md — AIR-GB Lightning

## Scopo

Questo file è pronto per essere copiato nella radice del repository AIR-GB Lightning. Definisce teoria, architettura e regole per l'agente che implementerà il progetto. Non è un resoconto di codice già costruito.

Leggere anche `AIR_GB_Wallet_Web_Piano_Operativo.md`, collocato accanto a questo file o in `docs/` nel repository. Se esiste un'applicazione, ispezionare prima package manifest, lockfile, adattatori e stato dei test: non ricrearla da zero.

**Richiesta attuale:** wallet come sito web React; utilizzo di WDK Tether e QVAC locale. Primo obiettivo: interpretazione dei vincoli di routing dal linguaggio naturale, con validazione e applicazione dimostrabili.

## Decisioni di partenza

- Frontend React + Vite + TypeScript.
- Servizio Node.js locale sul dispositivo dell'utente per WDK, segreti, persistenza e controllo delle operazioni.
- Modulo di partenza `@utexo/wdk-rgb-lightning`, con il peer nativo Node corrispondente.
- QVAC locale via endpoint HTTP per il primo prototipo; SDK diretto possibile dietro lo stesso adattatore dopo verifica.
- Regtest e asset fittizi per implementazione e demo iniziale.
- Un utente e un account RGB Lightning `0` nell'MVP.
- Contratti condivisi in JSON Schema; quantità monetarie JSON come stringhe decimali.
- Stato nativo del nodo separato dal database dell'app.
- Form manuale disponibile accanto all'interpretazione AI.
- Nessun MPP RGB, algoritmo alternativo o addestramento continuo richiesto per il punto 1.

Se una decisione è incompatibile con i pacchetti realmente installati, documentare il risultato e adattare la soluzione nel perimetro autorizzato. Non dichiarare capacità inesistenti e non cambiare implicitamente custodia o protocollo.

## Teoria da conoscere

### 1. Wallet, WDK e browser

Un wallet gestisce chiavi, stato, identificazione degli asset, preparazione e autorizzazione delle operazioni. WDK è un toolkit modulare; il nome WDK non significa che ogni modulo offra tutte le funzioni o giri in qualsiasi runtime.

Il modulo RGB Lightning documentato usa binding nativi Node/Bare. React nel browser comunica con il servizio locale tramite API dell'app. Non includere addon nativi, password RPC o signer nel bundle browser. React Native/Bare e React web sono ambienti differenti.

La pagina rimane un sito web anche se il nodo gira in un processo locale. Pubblicare i file React su un hosting statico non installa automaticamente quel processo sui dispositivi degli utenti. Un server condiviso che riceve seed o possiede signer modifica il modello di custodia: non introdurlo come espediente per far funzionare la demo.

WDK core può registrare manager/account. Il manager RGB Lightning diretto è comunque un modulo WDK; adottare un unico proprietario del lifecycle ed evitare doppie istanze. Non mescolare l'account del modulo RGB on-chain con quello RGB Lightning.

### 2. Bitcoin, Lightning e RGB

Bitcoin usa UTXO e transazioni firmate. Una firma valida e lo stato Bitcoin non dimostrano da soli la validità di tutte le transizioni RGB.

Lightning usa canali di pagamento con stato aggiornato tra peer. Un pagamento può attraversare più canali senza una transazione Bitcoin pubblicata per ogni hop. I saldi spendibili sono direzionali e cambiano nel tempo. HTLC, preimage e scadenze coordinano l'esecuzione.

RGB usa client-side validation e dati aggiuntivi, tra cui prove/consignments e stato del contratto. Il contract ID identifica l'asset; un ticker non è un'identità crittografica. La sola frase seed non sostituisce il backup dello stato RGB o dei canali.

RGB on-chain, RGB Lightning e BTC Lightning sono flussi distinti. Una invoice RGB non va trattata automaticamente come una BOLT11. Un arco può avere capacità BTC senza poter inoltrare il particolare asset RGB.

### 3. Routing e scoring

Il router cerca percorsi utilizzabili sulla vista disponibile della rete. Le policy pubbliche non rivelano tutti i saldi remoti. Una probabilità dello scorer è una stima, non un fatto di rete.

LDK offre router/scorer estendibili, ma il fork e i binding utilizzati da WDK possono esporre una superficie diversa. Tracciare sempre la catena `WDK → binding → richiesta nativa → router/scorer` nella versione effettiva.

Una penalità virtuale misura il costo attribuito dal planner a un canale, non una commissione addebitata all'utente. La funzione obiettivo può preferire affidabilità pur rispettando un limite sulle fee reali.

Non chiamare il modello per ogni arco durante la ricerca. Il modello produce una richiesta strutturata o un profilo; il codice deterministico applica score e controlli.

### 4. Vincoli rigidi e preferenze

- Vincoli rigidi: budget fee, nodi/canali esclusi, rete, asset, altre condizioni obbligatorie.
- Preferenze morbide: costo o affidabilità da privilegiare tra soluzioni ammissibili.

Una preferenza non può rendere ammissibile una soluzione che viola un vincolo. Un nodo obbligatoriamente escluso non va gestito solo con una penalità finita.

Definire precisamente privacy e latenza. CLTV è un margine di scadenza in blocchi, non il tempo atteso del pagamento. Evitare probing aggiuntivo è un comportamento verificabile; "massima privacy" non è una garanzia derivabile dal nome di un profilo.

### 5. QVAC, modello e JSON

QVAC è l'SDK/runtime di inferenza locale. Il modello è il file/caricamento scelto per l'estrazione. Inferenza locale non equivale ad addestramento continuo.

Il risultato può essere JSON valido ma semanticamente errato. Sono obbligatori tre controlli: parsing, JSON Schema e validazione semantica.

Il punto 1 estrae vincoli su un pagamento canonico già definito. Il modello non modifica invoice, destinatario, importo, asset o rete; non firma e non invia. Non serve RAG per estrarre il vocabolario iniziale. Le eventuali preferenze persistenti arrivano dopo e restano separate dallo storico numerico.

Nel backend HTTP QVAC, verificare il supporto effettivo di `response_format` con JSON Schema. Nell'SDK leggere le dichiarazioni della versione installata: non copiare i parametri HTTP nell'SDK. Rifiutare output vuoto, troncato o invalido.

### 6. Persistenza e lifecycle

La UI non è proprietaria del nodo. Refresh, navigazione e cleanup React non devono spegnere o ricreare il signer. Il servizio locale gestisce startup, unlock, stato persistente e shutdown ordinato.

Distinguere blocco dell'interfaccia, blocco degli invii e arresto completo del nodo. Non introdurre un auto-shutdown che interrompe monitoraggio e gestione HTLC senza una prova del lifecycle supportato.

Un pagamento in-flight può completarsi dopo il timeout della chiamata HTTP. Prima di riprovare riconciliare lo stato con il nodo. Pending o unknown non significa failed.

## Superficie WDK verificata documentalmente

La documentazione consultata il 14 ottobre 2026 presenta `@utexo/wdk-rgb-lightning@0.1.0-beta.15` e il peer Node `@utexo/rgb-lightning-node-nodejs@0.1.0-beta.11` come coppia di partenza. Non sono stati eseguiti smoke test in questo lavoro documentale.

Consultare get-started, configurazione e API della versione installata per constructor, account `0`, `unlock()`, letture, invoice, invio e shutdown. Non considerare una firma TypeScript con parametro `object` una conferma che campi di routing arbitrari siano supportati.

Le quote WDK possono essere approssimate; una fee restituita come zero quando non esposta non prova gratuità. Account bloccato, quote indicative e receipt non terminali devono essere distinti nella UI.

Le capacità di fee cap, esclusione nodi e profili scorer devono essere dimostrate. In assenza di supporto, la preview può funzionare ma il pagamento vincolato deve restare bloccato. Non inoltrare silenziosamente campi che il backend ignora.

## Architettura e responsabilità

| Modulo | Responsabilità |
|---|---|
| React | Input, preview, correzioni, conferma e stato |
| API locale | Sessione, validazione delle richieste e orchestrazione |
| WDK adapter | Letture, lifecycle e operazioni con il manager/account |
| AI interpreter | Testo → struttura estratta |
| Policy compiler | Unità, identità, conflitti, capacità e policy immutabile |
| Routing adapter | Applicazione dei vincoli, preparazione ed esecuzione |
| Archivio app | Intenti, idempotenza, policy e osservazioni |
| Stato nativo | Stato LDK/RGB gestito secondo il metodo del nodo |

La UI non deve chiamare direttamente WDK. I moduli condivisi non devono importare addon nativi o pacchetti del servizio. Il modello non ha strumenti di pagamento.

## Contratto del punto 1

Implementare due tipi separati:

1. `ExtractedConstraints`: testo interpretato, valori con unità originali, riferimenti a nodi, richieste ambigue/non gestite.
2. `CompiledPolicy`: budget intero in msat, pubkey/canali risolti, preferenze esplicite, `paymentId`, revisione delle capacità e stato di validazione.

Distinguere estrazione riuscita, validazione semantica, supporto del backend e applicabilità al pagamento corrente. L'output del modello non è il request object del nodo.

Regole:

- `1 sat = 1000 msat` con aritmetica intera.
- `null` = nessun limite espresso; `"0"` = tetto zero.
- "Massimo" è inclusivo; "meno di" è esclusivo. A parità di unità minima msat, meno di 10 sat ammette al massimo 9999 msat.
- Decimali sat vanno convertiti esattamente; precisazioni non rappresentabili richiedono chiarimento.
- Alias duplicati richiedono una scelta esplicita; il compilatore valida la pubkey.
- Non inventare un fee cap da "preferisco risparmiare".
- Non rilassare un vincolo se manca una route.
- Non rimuovere limiti già impostati perché QVAC va in timeout.
- Se cambia invoice/importo/asset/rete, invalidare policy e preparazione precedenti.
- Una richiesta fuori scope non diventa un'azione di pagamento.
- Tutti i retry conservano i vincoli. Se il backend non può garantirlo, non dichiarare quel vincolo supportato.
- Per route blinded/nascoste non promettere esclusioni su nodi non osservabili.

## Regole di implementazione

1. Prima dimostrare un pagamento di test senza AI, poi aggiungere l'interpretazione.
2. Leggere sorgenti e dichiarazioni installate prima di usare un metodo WDK/QVAC.
3. Bloccare versioni e registrare commit dei binding/fork quando si interviene nel routing.
4. Fare una matrice `capability → metodo → prova → limite`.
5. Implementare interfacce dell'app senza chiamarle API esistenti di WDK.
6. Mostrare chiaramente mock/simulazione; non presentarli come pagamenti RGB reali.
7. Mantenere l'LLM fuori dal ciclo di valutazione dei singoli canali.
8. Non passare il grafo intero nel prompt per estrarre quattro vincoli.
9. Nessuna firma, invio o mutazione di canali nel percorso di sola interpretazione.
10. Gestire versioni delle richieste e risposte obsolete; cancellare inferenze non più necessarie.
11. Limitare inferenza, input e output; non creare loop infiniti di correzione JSON.
12. Applicare il capability gate nel servizio anche se il frontend ha già validato.
13. Usare un form manuale sul medesimo schema per fallback e confronto.
14. Conservare un solo intento di pagamento con idempotenza e gestione dei retry separata.
15. Dopo un errore di trasporto verificare lo stato del pagamento, senza reinvio automatico.
16. Non cambiare protocollo, signer, nodo o rete solo per aggirare una dipendenza non disponibile.
17. Non installare pacchetti nativi nel frontend e non aggiungere polyfill per renderli fittiziamente compatibili.
18. Non considerare "saldo complessivo sufficiente" una prova della liquidità del percorso RGB.
19. Non usare mainnet o asset reali nella demo iniziale.
20. Documentare un limite concreto anziché inventare uno stato di successo.

## Segreti e confine locale

- Seed, chiavi private, password RPC e token restano nel servizio/keystore locale.
- Mai in repository, bundle browser, URL, variabili `VITE_*`, log, prompt o fixture.
- Un eventuale onboarding web può mostrare il recovery material solo in un flusso locale protetto e temporaneo; nessuna persistenza frontend o telemetria di quel contenuto.
- Il servizio ascolta sul loopback, verifica sessione, Origin e Host e non espone proxy generici verso WDK/native.
- Proteggere le mutazioni anche quando l'API è su localhost; CORS non sostituisce l'autorizzazione.
- Il modello non riceve credenziali e non ottiene strumenti di firma/invio.
- Validare testi esterni e alias come dati non fidati: prompt injection non può diventare autorizzazione.
- Seguire il cleanup supportato dal secret manager, senza promettere zeroizzazione perfetta di tutte le stringhe JS.
- Stato dei fondi e memoria AI hanno retention diversa. Cancellare preferenze non deve cancellare prove RGB o stato di canale.

## Verifiche minime significative

Non basta verificare che il JSON faccia parsing. Servono risultati osservabili:

- Budget 10 sat → 10000 msat; budget zero preservato; decimal conversion esatta.
- Comparatore inclusivo/esclusivo e casi non rappresentabili.
- Alias ambiguo, nodo inesistente, pubkey invalida e destinatario escluso.
- Contraddizioni, negazioni e tentativo di far ignorare lo schema.
- Budget rigido mantenuto nel profilo affidabile e nel fallback manuale.
- Vincolo non supportato impedisce l'invio, non viene ignorato.
- Risposta AI obsoleta non sovrascrive la policy corrente.
- Importo o invoice cambiati invalidano la preparazione.
- Nessuna route conforme produce un errore specifico e nessuna esecuzione.
- Retry su percorsi alternativi conserva esclusioni e budget.
- Doppio click/timeout/restart non generano un secondo intento.
- Caso reale regtest e caso volutamente bloccato.
- Test BTC e RGB vengono rendicontati separatamente.

Preparare almeno 30 frasi con risultato atteso indipendente dal modello. Eseguire typecheck, build frontend, verifiche del compilatore e gli end-to-end necessari alle capacità implementate. Registrare validità JSON, correttezza semantica, tempo AI e rispetto dei vincoli.

## Definizione di completamento

**Wallet base:** lifecycle WDK, stato persistente, ricezione/invio di test, storico autorevole e frontend React funzionanti.

**Punto 1:** testo → estrazione QVAC → validazione → policy → enforcement reale → pagamento conforme o blocco corretto. Il pagamento resta un'azione esplicita del flusso UI, distinta dall'interpretazione.

Se manca il bridge al router, rendicontare esattamente "interpretazione e validazione completate; enforcement reale da integrare". Non descrivere il punto 1 come end-to-end completo.

La correttezza delle impostazioni non dimostra routing superiore. Per la UX confrontare AI e form manuale con la stessa policy; per il routing confrontare con il router originale in scenari controllati e includere il tempo dell'AI.

## Fonti e aggiornamento

Riferimenti verificati documentalmente il 14 ottobre 2026:

- WDK: https://docs.wdk.tether.io/
- RGB Lightning WDK: https://docs.wdk.tether.io/sdk/community-modules/wdk-rgb-lightning/
- Setup: https://docs.wdk.tether.io/sdk/community-modules/wdk-rgb-lightning/guides/get-started/
- API: https://docs.wdk.tether.io/sdk/community-modules/wdk-rgb-lightning/api-reference/
- Configurazione: https://docs.wdk.tether.io/sdk/community-modules/wdk-rgb-lightning/configuration/
- Secret Manager: https://docs.wdk.tether.io/tools/secret-manager/
- Package: https://github.com/UTEXO-Protocol/wdk-rgb-lightning
- Nodo del modulo: https://github.com/UTEXO-Protocol/rgb-lightning-node
- QVAC: https://docs.qvac.tether.io/sdk/ai-capabilities/text-generation/
- QVAC HTTP: https://docs.qvac.tether.io/cli/http-server/
- Scorer LDK: https://docs.rs/lightning/latest/lightning/routing/scoring/trait.ScoreLookUp.html
- Routing parameters: https://docs.rs/lightning/latest/lightning/routing/router/struct.RouteParametersConfig.html
- Vite: https://vite.dev/guide/

Queste fonti sono punti di ingresso. Nel repository conservare versione installata, commit e test che giustificano ogni capacità; `latest` e `main` non sono dipendenze riproducibili.
