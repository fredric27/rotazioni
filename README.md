# Rotazioni

Allenamento per arbitri di pallavolo: impara le **posizioni della squadra in ricezione** e riconosci il **fallo di posizione** dal punto di vista del 1° arbitro (seggiolone) o del 2° arbitro (palo opposto).

**Gioca online:** https://fredric27.github.io/rotazioni/

## Cosa contiene

- **Tutorial**: 7 lezioni brevi, ciascuna con scena 3D e domande di verifica. Coprono zone, ordine di rotazione, sistema 5-1 e libero, la regola 7.4 con le 7 relazioni e il ruolo dei piedi, la "regola del lato" per orientarsi dai due pali, le sei rotazioni in ricezione (P1…P6) ed esempi di falli.
- **Allenamento assistito**: sopra ogni giocatore compaiono ruolo e zona, in alto c'è la rotazione (P1…P6) con i punti critici. Dopo ogni servizio arriva la spiegazione.
- **Partita**: una serie di servizi senza aiuti, con punteggio, serie e riepilogo degli errori. Le rotazioni in cui sbagli di più escono più spesso.
- **Riconosci la rotazione**: guardi la ricezione e indichi la rotazione.
- **Esplora**: trascini i giocatori e vedi in tempo reale quali relazioni sono rispettate.

### Come funziona un servizio

1. Le squadre si schierano. Controlli numeri e scheda della formazione.
2. Fischi con <kbd>Invio</kbd> per autorizzare il servizio. Il battitore serve entro un tempo regolabile (6 s di default, con istante variabile).
3. Dopo il **colpo di servizio** hai qualche istante per fischiare il fallo con <kbd>Spazio</kbd>.
4. Ricevi l'esito: fallo fischiato, fallo non visto, fischio ingiusto o fischio anticipato. Vedi anche quali relazioni erano violate, di quanti centimetri, e uno schema dall'alto.

Altri comandi: <kbd>1</kbd> e <kbd>2</kbd> cambiano vista (1° o 2° arbitro), le frecce o il trascinamento girano lo sguardo, <kbd>Esc</kbd> torna alla home.

Nelle impostazioni puoi regolare tempi, vista, difficoltà, frequenza dei falli, libero, categoria (altezza della rete), colori delle maglie e del campo.

## Regole implementate

Riferimento: Regole di Gioco FIVB 2025-2028.

- **7.4**: al colpo di servizio la squadra **in ricezione** deve essere in ordine di rotazione. Dal 2025 la squadra al servizio può disporsi liberamente.
- **7.4.1-7.4.2**: le relazioni sono 7. Avanti/dietro: 4-5, 3-6, 2-1. Sinistra/destra: 4-3, 3-2, 5-6, 6-1. Tra giocatori in diagonale non c'è alcun vincolo.
- **7.4.3**: si giudica dai piedi a contatto con il suolo. Basta una parte di un piede più vicina alla linea (centrale o laterale) di entrambi i piedi del giocatore di riferimento. Il gioco modella i due piedi di ogni giocatore e li usa per la valutazione.
- Il fallo di posizione della squadra in ricezione lo fischia il 2° arbitro, **dopo** il colpo di servizio. Il fischio anticipato si può disattivare nelle impostazioni.

## Formazioni e falli

Le formazioni di ricezione sono quelle del sistema 5-1 di [VBRotations](https://github.com/monkeysppp/VBRotations), posizioni "Ricezione": ricezione a tre con il libero e i due schiacciatori. L'ordine è P – S1 – C2 – O – S2 – C1 e il libero sostituisce il centrale di seconda linea.

Nelle impostazioni puoi attivare l'**opposto in ricezione** ("a volte" o "sempre"). Vale per P4, P3 e P2: l'opposto è in seconda linea e riceve al posto dello schiacciatore di prima linea, che resta a rete.

I falli non sono spostamenti a caso. Il gioco li prende da un catalogo di **falli tipici** per ogni rotazione (`COMMON_FAULTS` e `OPP_FAULTS` in `js/formations.js`), ad esempio:

- il palleggiatore di seconda linea che penetra in anticipo (P1, P6, P5);
- lo schiacciatore di prima linea che riceve troppo profondo, dietro al compagno di seconda linea (P6, P5, P3, P2);
- lo schiacciatore di zona 2 della P4 che si allarga a sinistra del centrale;
- le coppie nascoste a rete con l'ordine invertito;
- l'opposto nascosto in fondo che si sposta oltre il vicino.

A questi si aggiungono due giocatori con il posto scambiato e la squadra schierata come in un'altra rotazione. La difficoltà decide di quanti centimetri è il fallo e quanto spesso compaiono i casi regolari al limite.

## Sviluppo

Il sito è statico, senza build: HTML, CSS e moduli ES. Three.js viene caricato da CDN.

```sh
npm start        # server locale su http://localhost:8000
npm test         # verifica regole, formazioni e generatore di falli
```

| File | Contenuto |
| --- | --- |
| `js/rules.js` | zone, ordine di rotazione, le 7 relazioni, valutazione con i piedi, spiegazioni |
| `js/formations.js` | formazioni di ricezione P1…P6 e generatore di scenari (falli, scambi, casi al limite) |
| `js/arena.js` | palazzetto 3D, viste degli arbitri, pallone, linee sul campo |
| `js/player3d.js` | giocatore 3D con maglia e numero |
| `js/tutorial.js` | contenuti delle lezioni |
| `js/main.js` | modalità di gioco, interfaccia, impostazioni, statistiche |
| `js/minimap.js` | schemi 2D (campo dall'alto e scheda formazione) |
