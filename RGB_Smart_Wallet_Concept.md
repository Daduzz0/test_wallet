# RGB Smart Wallet

### A private, AI-powered Bitcoin wallet that makes RGB and Lightning simple

**Concept document — Hackathon**

## 1. Visione

Vogliamo sviluppare un wallet Bitcoin che supporti asset **RGB** e pagamenti tramite **Lightning Network**, integrando un assistente **AI locale basato su QVAC**.

L'obiettivo non è creare un semplice wallet con una chatbot, né sostituire gli algoritmi di routing Lightning esistenti con un LLM. Vogliamo rendere accessibili operazioni che oggi richiedono competenze tecniche: gestione degli asset RGB, controllo della disponibilità dei canali, scelta delle modalità di pagamento, interpretazione degli errori e risoluzione dei problemi.

**La nostra proposta:** un wallet che capisce *cosa* l'utente vuole ottenere, prepara *come* farlo in maniera efficiente e sicura, spiega le alternative e impara dalle sue preferenze, mantenendo i dati sensibili sul dispositivo.

> **Tagline:** *Your wallet understands you, not just your transactions.*

## 2. Il problema che risolviamo

RGB consente di gestire asset e diritti digitali ancorati a Bitcoin attraverso validazione lato client. L'integrazione con Lightning può abilitare pagamenti off-chain anche per gli asset RGB, ma introduce complessità ulteriori per l'utente.

Un utente potrebbe dover comprendere:

- La differenza fra un trasferimento RGB on-chain e uno via Lightning.
- Se possiede l'asset e l'importo richiesto nella forma e nel canale necessari.
- Quali canali possono inoltrare uno specifico asset RGB.
- Perché un pagamento è fallito e che cosa può fare per riprovare.
- Quali compromessi accettare tra fee, affidabilità, tempi e privacy.

I wallet tradizionali espongono spesso informazioni tecniche o messaggi di errore; il nostro wallet deve **trasformare queste informazioni in decisioni e azioni comprensibili**, senza nascondere costi o rischi.

## 3. L'idea: un AI Payment Copilot

Un assistente locale accompagna l'utente durante le operazioni, dall'intenzione alla conferma del pagamento.

**Esempio**

> **Utente:** «Voglio inviare 50 unità dell'asset HACK a Marco. Non ho fretta: preferisco spendere il meno possibile».

L'assistente:

1. Comprende destinatario, asset, importo e preferenza economica.
2. Interroga il wallet per verificare disponibilità dei fondi e vincoli tecnici.
3. Chiede al *Payment Planner* quali modalità e percorsi siano realmente candidabili.
4. Presenta un riepilogo con fee stimate, incertezze e alternative.
5. Richiede l'approvazione esplicita dell'utente.
6. Dopo il tentativo, registra localmente l'esito per migliorare suggerimenti futuri.

**Importante:** l'LLM **non inventa percorsi o saldi, non firma transazioni e non esegue pagamenti autonomamente**. Traduce l'intenzione dell'utente in richieste strutturate; gli strumenti deterministici controllano la fattibilità e i fondi sono spesi solo dopo conferma.

## 4. Tre funzionalità distintive

### 4.1 Adaptive Payment Planner

Il wallet personalizza la preparazione del pagamento secondo le priorità dell'utente:

- **Economy:** privilegia commissioni basse entro limiti di affidabilità accettabili.
- **Fast:** privilegia il tempo atteso di completamento, compreso il rischio di dover riprovare.
- **Reliable:** privilegia la probabilità stimata di successo, anche accettando fee superiori.
- **Custom:** comprende richieste naturali, come «questo pagamento è urgente» o «non voglio superare 10 sat di fee».

Il sistema considera i canali **in una specifica direzione** e per **uno specifico asset RGB**: un nodo non è universalmente «buono» o «cattivo». Uno stesso canale può essere adatto a piccoli importi e inadatto a pagamenti più grandi.

La selezione delle rotte resta compito del motore Lightning (ad esempio tramite LDK e relativo scoring). L'AI fornisce priorità e preferenze, anziché rimpiazzare la logica di routing.

### 4.2 RGB Problem Solver

Quando un pagamento non può essere preparato o fallisce, l'assistente aiuta l'utente a capire **che cosa è verificato, che cosa è soltanto ipotizzato e quali passi sono possibili**.

Esempi:

- Asset o quantità insufficienti nel canale locale.
- Nessun percorso RGB compatibile trovato.
- Fee oltre il limite scelto.
- Canale temporaneamente non utilizzabile.
- Problemi nella preparazione degli UTXO o nella procedura di trasferimento RGB.

Invece di mostrare solo `Payment failed`, il wallet può dire:

> «Non ho trovato un percorso compatibile con questo asset entro il limite di fee che hai scelto. Possiamo aumentare il limite, riprovare più tardi o verificare se è disponibile un trasferimento on-chain. Nessuna operazione verrà eseguita senza la tua conferma».

Le alternative devono dipendere dalle **capacità effettivamente esposte dal backend**. Non tutti i fallimenti Lightning permettono di individuare con certezza la causa o il nodo responsabile.

### 4.3 Personal Wallet Memory

L'assistente impara dalle preferenze e dagli eventi passati **senza inviare cronologia e informazioni sensibili a servizi AI remoti**.

Memorizza, per esempio:

- Preferenze dichiarate (fee massima, urgenza, tolleranza ai tentativi falliti).
- Scelte effettuate e confermate dall'utente.
- Risultati dei pagamenti: successo/fallimento, durata totale, fee e importi.
- Statistiche di affidabilità delle rotte e dei canali, **solo quando misurabili o attribuibili correttamente**.

La memoria ha due parti distinte:

- **Database locale strutturato (es. SQLite):** saldi consultabili, statistiche, identificativi, timestamp, risultati e stime numeriche.
- **QVAC + RAG locale:** recupero contestuale di preferenze, note e storico rilevante per spiegazioni e suggerimenti.

La RAG non è la fonte di verità per liquidità, fee o vincoli di sicurezza.

## 5. Il ruolo della valutazione dei nodi Lightning

Vogliamo usare i dati disponibili per evitare percorsi sistematicamente inefficienti, senza costruire un ranking fisso del tipo «top 10% dei nodi».

Le valutazioni devono essere **contestuali**: dipendono dal canale, dalla direzione, dall'asset RGB, dall'importo e dal momento.

| Dato | Come ottenerlo | Limite |
| --- | --- | --- |
| Canali annunciati, capacità e policy delle fee | Gossip/API del nodo | Non tutti i canali sono pubblici; i dati possono essere obsoleti |
| Saldi disponibili sui propri canali | API del wallet/nodo | Non descrivono i saldi dei canali remoti |
| Asset RGB nei propri canali | Backend RGB compatibile | Per i canali remoti la disponibilità non è garantita |
| Storico dei tentativi | Eventi del nodo e database locale | La causa di un fallimento non è sempre nota |
| Tempo totale di pagamento | Timestamp locali | Non equivale alla latenza misurata di ciascun hop |
| Probabilità di successo | Scorer/statistiche | È una stima, non una garanzia |

**Principio fondamentale:** la capacità pubblica di un canale non rivela la liquidità effettivamente spendibile in una direzione. Inoltre, un canale BTC funzionante non implica che supporti l'asset RGB richiesto.

Per questo, durante l'hackathon, partiremo dallo scoring già offerto da Lightning/LDK, aggiungendo eventualmente uno storico locale che migliori le spiegazioni o le scelte personalizzate. Il nostro contributo principale sarà la **UX AI-driven**, non la pretesa di avere inventato il routing probabilistico.

## 6. Flusso tecnico di un pagamento

```text
Utente (testo naturale / interfaccia)
               |
               v
        QVAC Local LLM
     - riconosce l'intento
     - recupera preferenze
     - produce JSON vincolato
               |
               v
       Payment Planner
     - verifica asset e saldo
     - applica vincoli e policy
     - consulta il router Lightning
     - genera opzioni praticabili
               |
               v
      UI: costi + alternative
               |
               v
       Conferma dell'utente
               |
               v
        RGB Lightning Node
     - esegue il pagamento
     - espone risultato/eventi
               |
               v
       Database locale + RAG
     - aggiorna lo storico
     - alimenta i suggerimenti
```

### Esempio di contratto dati per il planner

Schema **illustrativo**, non una risposta nativa delle API RGB/Lightning:

```json
{
  "intent": "send_payment",
  "destination": "recipient_invoice_or_id",
  "asset_id": "rgb:example_asset",
  "asset_amount": "50",
  "preferences": {
    "priority": "low_fee",
    "max_fee_sat": 10,
    "allow_onchain_alternative": true
  }
}
```

I valori vengono verificati dal backend. L'output del modello è una **richiesta di pianificazione**, non un ordine eseguibile.

## 7. Architettura proposta

| Componente | Responsabilità | Possibili tecnologie |
| --- | --- | --- |
| Wallet UI | Saldi, asset, chat, riepilogo e conferme | React + Vite |
| Local AI | Interpretazione intenti, spiegazioni, preferenze | QVAC SDK + LLM locale |
| Structured I/O | JSON Schema e validazione delle richieste | Schema JSON + validatore backend |
| Payment Planner | Vincoli tecnici, scelta opzioni, controllo limiti | TypeScript o Rust |
| RGB/Lightning backend | Canali, fatture, asset, esecuzione pagamenti | RGB Lightning Node (RLN), basato su LDK |
| Local Storage | Storico e metriche | SQLite |
| Context Retrieval | Recupero di preferenze e note | RAG locale |

**Nota di fattibilità:** RGB Lightning Node è un progetto sperimentale. Prima di promettere routing personalizzato o diagnostica precisa bisogna verificare quali eventi e controlli esponga davvero. Potrebbero essere necessari piccoli adattamenti al backend LDK. Il supporto di RGB su Lightning va verificato nell'implementazione e nell'ambiente scelti: non equivale alla disponibilità universale sulla rete Lightning pubblica.

## 8. MVP per l'hackathon

### Obiettivo minimo

Una demo end-to-end su **regtest o testnet**, con asset RGB e nodi sotto il controllo del team, nella quale un utente possa:

1. Consultare gli asset nel wallet.
2. Scrivere in linguaggio naturale la richiesta di inviare un asset RGB.
3. Ricevere un piano di pagamento comprensibile e coerente con le proprie priorità.
4. Confermare ed effettuare un pagamento effettivamente supportato dal backend.
5. Ricevere una spiegazione utile quando un tentativo non è possibile o fallisce.
6. Vedere una preferenza salvata localmente e riutilizzata in un pagamento successivo.

### Demo ideale (storyboard)

**Scenario A — Risparmio:** l'utente chiede di inviare asset RGB con fee minime. L'assistente interpreta il vincolo, mostra un'opzione verificata e aspetta la conferma.

**Scenario B — Errore guidato:** su una rete di test controllata, l'operazione incontra un problema noto (per esempio, un asset non disponibile nel canale locale). L'assistente descrive il problema e propone solo rimedi realmente fattibili.

**Scenario C — Personalizzazione:** l'utente cambia priorità («questa volta mi interessa soprattutto l'affidabilità»). Il wallet cambia criteri e spiegazione usando la nuova preferenza, senza assumere che tutti i nodi dispongano della stessa liquidità.

### Priorità di implementazione

**Must-have:** wallet funzionante, un flusso RGB reale nell'ambiente di test, input AI strutturato, controlli deterministici, conferma esplicita e messaggi di errore comprensibili.

**Should-have:** almeno due opzioni di pagamento confrontabili, preferenze persistenti, raccolta dati sui tentativi, una demo di diagnosi.

**Nice-to-have:** percorsi alternativi, scoring custom, confronto automatico Lightning/on-chain, selezione avanzata basata sullo storico.

## 9. In cosa siamo diversi

Non proponiamo semplicemente:

- Un wallet con una chat integrata.
- Un algoritmo che sceglie sempre i nodi più economici.
- Uno scorer che penalizza i canali dopo i fallimenti (funzionalità già presente nell'ecosistema Lightning).

Proponiamo **un livello di assistenza privata e personalizzata** che collega intenzioni umane e operazioni RGB complesse, con verifiche tecniche rigorose.

Il valore aggiunto che vogliamo dimostrare è che una persona senza conoscenze approfondite di RGB e Lightning riesca a portare a termine un trasferimento, comprenderne le alternative e risolvere gli ostacoli più comuni.

## 10. Privacy e sicurezza

- Elaborazione AI e memoria dell'utente **locali per progettazione**.
- Chiavi private mai passate al modello linguistico o alla RAG.
- Nessuna transazione avviata senza un consenso esplicito dell'utente.
- Nessun dato inventato dall'AI: fee, disponibilità, saldi e compatibilità provengono da API e controlli validati.
- Controlli di limiti, importi, destinazione e rete prima di autorizzare l'operazione.
- Fallimenti e probabilità presentati come stime, non garanzie.
- La privacy locale dell'AI **non elimina** i metadati esposti ai peer durante un pagamento Lightning né rende automaticamente privato ogni dettaglio operativo di RGB.

## 11. Come misuriamo il successo

Per la demo e le valutazioni confrontiamo il nostro flusso con un'interfaccia tradizionale, concentrandoci su:

- **Completamento dei task:** un nuovo utente riesce a inviare un asset RGB?
- **Passaggi e interventi manuali:** quanti passaggi tecnici sono richiesti?
- **Comprensibilità degli errori:** sa identificare cosa fare dopo un fallimento?
- **Rispetto delle preferenze:** i limiti impostati vengono applicati correttamente?
- **Sicurezza:** nessuna operazione non autorizzata e nessun superamento dei vincoli.

Fee, probabilità di successo e tempi possono essere metriche secondarie, confrontate solo in test ripetibili. Non promettiamo prestazioni di routing superiori a LDK senza una misurazione sperimentale.

## 12. Pitch breve

> **RGB Smart Wallet** is a privacy-first Bitcoin wallet powered by local AI. It makes RGB assets and Lightning payments accessible by understanding user intentions, preparing safe payment options, explaining failures and learning individual preferences — all without sending sensitive wallet data to a cloud AI. Instead of replacing Lightning routing, it makes the complexity of RGB understandable and actionable.

---

**One-line takeaway:** *Non vogliamo che l'utente impari a gestire la complessità di RGB: vogliamo che il wallet lo aiuti a gestirla, mantenendo il controllo nelle sue mani.*
