# Test iniziali: nodi Lightning pubblici

`nodes.json` contiene 75 nodi reali delle prime tre pagine del [directory LightningNetwork+](https://lightningnetwork.plus/nodes), consultate il 9 ottobre 2026. È un campione orientato ai nodi più visibili, non una fotografia completa o sincronizzata della rete. Le pagine consultate provenivano da cache di età diverse. Il campo `advertised_capacity_btc_approx` è arrotondato come sul sito.

Per un controllo rapido del file:

```bash
python3 test/inspect_nodes.py
```

Per raccogliere nuovi dati dall'[API Lightning di Mempool](https://mempool.space/docs/api/rest) (richiede accesso a Internet):

```bash
python3 test/collect_nodes.py --limit 100 --countries IT,DE
python3 test/inspect_nodes.py test/nodes_api.json
```

Il risultato dell'API viene scritto in `nodes_api.json` e include pubkey, alias, numero di canali pubblici, capacità annunciata in satoshi, date degli annunci e localizzazione quando disponibile. Il collector considera i nodi clearnet geolocalizzati; per ampliare la raccolta usare `--limit 10000` e omettere `--countries`. Il limite è massimo: l'API può restituire meno nodi. Le richieste sono sequenziali e hanno una pausa configurabile con `--delay`.

Questi dati servono per capire quali informazioni pubbliche si possono leggere. **La capacità annunciata non indica il saldo spendibile in una direzione.** Non possiamo dedurre dai soli dati pubblici se un canale remoto supporta un asset RGB, né conoscere liquidità remota, probabilità reale di successo o causa certa di un pagamento fallito. Per quelli serviranno un backend RGB/Lightning e lo storico locale dei tentativi, come indicato nel documento di progetto.
