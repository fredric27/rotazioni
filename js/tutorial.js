// Lezioni guidate. Ogni passo descrive la scena da mostrare (interpretata da main.js),
// un testo e, se serve, una domanda di verifica.
//
// scene: {
//   rot, formation: 'reception' | 'zones', fault: [idRelazione, margine] | swap: [zona, zona],
//   side: +1|-1, view: 'top'|'r1'|'r2'|'free'|'topfull', topFrom: 'r1'|'r2',
//   labels: 'zone'|'role'|'full'|'num'|null, zones: bool,
//   constraints: true | 'fb' | 'lr' | [id,...] | null, serving: bool
// }

export const LESSONS = [
  {
    id: 'zone',
    title: 'Il campo e le zone',
    summary: 'Prima linea, seconda linea, sinistra e destra della squadra.',
    steps: [
      {
        title: 'Benvenuto',
        html: `<p>Qui ti alleni a riconoscere il <b>fallo di posizione della squadra in ricezione</b>, cioè l'errore che il 2° arbitro deve fischiare.</p>
<p>Al momento del <b>colpo di servizio</b> i sei giocatori in ricezione devono rispettare l'ordine di rotazione. Dopo il colpo possono muoversi liberamente.</p>
<p class="note">Regole di Gioco FIVB 2025-2028, regola 7.4: dal 2025 la squadra <b>al servizio</b> può disporsi come vuole. L'ordine di rotazione vale solo per la squadra in ricezione.</p>`,
        scene: { rot: 1, formation: 'reception', side: 1, view: 'free', labels: null, serving: true },
      },
      {
        title: 'Le sei zone',
        html: `<p>Ogni squadra ha 3 giocatori in <b>prima linea</b>, vicino alla rete, e 3 in <b>seconda linea</b>.</p>
<ul><li>Prima linea: <b>4</b> (sinistra), <b>3</b> (centro), <b>2</b> (destra)</li>
<li>Seconda linea: <b>5</b> (sinistra), <b>6</b> (centro), <b>1</b> (destra)</li></ul>
<p>Sinistra e destra si intendono sempre <b>dal punto di vista della squadra</b> che guarda la rete. Il giocatore in zona 1 è quello che va al servizio.</p>`,
        scene: { rot: 1, formation: 'zones', side: 1, view: 'top', topFrom: 'team', labels: 'zone', zones: true },
      },
      {
        title: 'Le zone non sono caselle',
        html: `<p>Il numero di zona dice solo <b>che posto occupa il giocatore nell'ordine</b>. Al servizio nessuno è obbligato a stare nel "suo" rettangolo.</p>
<p>In ricezione le squadre si dispongono in modo molto diverso dallo schema: qui i giocatori di questa rotazione sono nelle loro posizioni reali di ricezione. L'etichetta indica la zona.</p>
<p>Conta soltanto la posizione di ciascuno <b>rispetto ai vicini</b>: lo vediamo nella lezione 3.</p>`,
        scene: { rot: 1, formation: 'reception', side: 1, view: 'top', topFrom: 'team', labels: 'zone', zones: true },
      },
      {
        title: 'Verifica',
        html: '<p>Una domanda veloce.</p>',
        scene: { rot: 1, formation: 'zones', side: 1, view: 'top', topFrom: 'team', labels: 'zone', zones: true },
        quiz: {
          q: 'Il giocatore in zona 6 è…',
          options: ['in prima linea, al centro', 'in seconda linea, al centro', 'in seconda linea, a sinistra'],
          answer: 1,
          explain: 'La zona 6 è il centro della seconda linea (5 a sinistra, 1 a destra).',
        },
      },
    ],
  },
  {
    id: 'rotazione',
    title: 'Ordine di rotazione e ruoli',
    summary: 'Formazione, rotazioni P1–P6, ruoli del 5-1 e libero.',
    steps: [
      {
        title: 'La formazione e la rotazione',
        html: `<p>Prima del set l'allenatore consegna la <b>formazione</b> con 6 numeri nelle posizioni I–VI. Quell'ordine resta fisso per tutto il set.</p>
<p>Quando la squadra conquista il servizio <b>ruota in senso orario</b>: 2→1, 1→6, 6→5, 5→4, 4→3, 3→2.</p>
<p>Premi <b>Ruota</b> per vederlo.</p>`,
        scene: { rot: 1, formation: 'zones', side: 1, view: 'top', topFrom: 'team', labels: 'num', zones: true },
        actions: [{ label: 'Ruota ↻', action: 'rotate' }],
      },
      {
        title: 'Il sistema 5-1',
        html: `<p>Quasi tutte le squadre giocano con il <b>5-1</b>: un solo palleggiatore. In diagonale tra loro ci sono:</p>
<ul><li><b>P</b> palleggiatore ↔ <b>O</b> opposto</li>
<li><b>S1</b> ↔ <b>S2</b>: schiacciatori di banda (ricevitori)</li>
<li><b>C1</b> ↔ <b>C2</b>: centrali</li></ul>
<p>Qui usiamo l'ordine <b>P – S1 – C2 – O – S2 – C1</b>. Si dice <b>"P1"</b> quando il palleggiatore è in zona 1, "P6" quando è in zona 6, e così via. Durante il set le rotazioni si susseguono così: P1 → P6 → P5 → P4 → P3 → P2.</p>`,
        scene: { rot: 1, formation: 'zones', side: 1, view: 'top', topFrom: 'team', labels: 'role', zones: true },
        actions: [{ label: 'Ruota ↻', action: 'rotate' }],
      },
      {
        title: 'Il libero',
        html: `<p>Il <b>libero</b> veste una maglia di colore diverso e può sostituire solo un giocatore di <b>seconda linea</b>, di solito il centrale.</p>
<p>Per le posizioni il libero <b>prende il posto nell'ordine</b> del giocatore che sostituisce. Se entra per il centrale in zona 6, per le regole è lui il "giocatore di zona 6".</p>`,
        scene: { rot: 1, formation: 'reception', side: 1, view: 'r2', labels: 'full', zones: false },
      },
      {
        title: 'Verifica',
        html: '<p>Due domande sull\'ordine.</p>',
        scene: { rot: 1, formation: 'zones', side: 1, view: 'top', topFrom: 'team', labels: 'role', zones: true },
        quiz: [
          {
            q: 'La squadra è in P1, conquista il servizio e ruota. In che rotazione è adesso?',
            options: ['P2', 'P6', 'P5'],
            answer: 1,
            explain: 'Il palleggiatore passa da zona 1 a zona 6: è in P6.',
          },
          {
            q: 'In P4 dov\'è il palleggiatore?',
            options: ['Prima linea, sinistra', 'Seconda linea, sinistra', 'Prima linea, destra'],
            answer: 0,
            explain: 'La zona 4 è la sinistra della prima linea: in P4 il palleggiatore è a rete.',
          },
        ],
      },
    ],
  },
  {
    id: 'regola',
    title: 'La regola delle posizioni',
    summary: 'Le 7 relazioni da controllare, le diagonali, i piedi.',
    steps: [
      {
        title: 'Avanti e dietro',
        html: `<p>Ogni giocatore di seconda linea deve stare <b>più lontano dalla rete</b> del suo corrispondente di prima linea:</p>
<ul><li>zona <b>5</b> dietro la zona <b>4</b></li><li>zona <b>6</b> dietro la zona <b>3</b></li><li>zona <b>1</b> dietro la zona <b>2</b></li></ul>
<p>Le linee verdi collegano le coppie da controllare.</p>`,
        scene: { rot: 1, formation: 'reception', side: 1, view: 'top', topFrom: 'team', labels: 'zone', constraints: 'fb' },
      },
      {
        title: 'Sinistra e destra',
        html: `<p>Nella stessa linea l'ordine laterale deve essere rispettato:</p>
<ul><li>prima linea: <b>4</b> a sinistra della <b>3</b>, <b>3</b> a sinistra della <b>2</b></li>
<li>seconda linea: <b>5</b> a sinistra della <b>6</b>, <b>6</b> a sinistra della <b>1</b></li></ul>
<p>Il controllo si fa sempre <b>rispetto al giocatore centrale</b> della linea (linee tratteggiate).</p>`,
        scene: { rot: 1, formation: 'reception', side: 1, view: 'top', topFrom: 'team', labels: 'zone', constraints: 'lr' },
      },
      {
        title: 'Le diagonali non contano',
        html: `<p>Le relazioni sono solo queste <b>7</b>. Tra giocatori in diagonale (4-6, 2-6, 3-5, 3-1, 4-1, 2-5) <b>non c'è nessun vincolo</b>.</p>
<p>Qui, in P6, il palleggiatore (zona 6) è molto più vicino alla rete dello schiacciatore di zona 4 e di quello di zona 1, che ricevono: è <b>regolare</b>, perché deve stare dietro solo all'opposto di zona 3.</p>
<p class="note">È la trappola più comune per chi inizia.</p>`,
        scene: { rot: 6, formation: 'reception', side: 1, view: 'top', topFrom: 'team', labels: 'full', constraints: true },
      },
      {
        title: 'Contano i piedi',
        html: `<p>La posizione si giudica dai <b>piedi a contatto con il suolo</b> (regola 7.4.3):</p>
<ul><li>il giocatore di prima linea deve avere <b>almeno una parte di un piede</b> più vicina alla linea centrale di <b>entrambi i piedi</b> del corrispondente di seconda linea;</li>
<li>il laterale destro (sinistro) deve avere almeno una parte di un piede più vicina alla linea laterale destra (sinistra) di entrambi i piedi del centrale della sua linea.</li></ul>
<p>Qui la relazione 2-1 è rispettata <b>per pochi centimetri</b> (linea gialla): è regolare. Busto, braccia e testa non contano.</p>`,
        scene: { rot: 1, formation: 'reception', side: -1, view: 'r2', labels: 'full', constraints: ['2-1'], margin: ['2-1', 0.07] },
      },
      {
        title: 'Verifica',
        html: '<p>Controlliamo che le relazioni siano chiare.</p>',
        scene: { rot: 3, formation: 'reception', side: 1, view: 'top', topFrom: 'team', labels: 'zone', constraints: true },
        quiz: [
          {
            q: 'Tra zona 5 e zona 3 c\'è un vincolo?',
            options: ['Sì, la 5 deve stare dietro la 3', 'No, sono in diagonale', 'Sì, la 5 deve stare a sinistra della 3'],
            answer: 1,
            explain: 'La 5 si confronta solo con la 4 (avanti/dietro) e con la 6 (sinistra/destra).',
          },
          {
            q: 'Quale di queste coppie NON va controllata?',
            options: ['2-1', '6-1', '4-6', '3-2'],
            answer: 2,
            explain: '4 e 6 sono in diagonale. Le coppie da controllare sono 4-5, 3-6, 2-1, 4-3, 3-2, 5-6 e 6-1.',
          },
        ],
      },
    ],
  },
  {
    id: 'vista',
    title: 'Il punto di vista dell\'arbitro',
    summary: 'Dal seggiolone e dal palo: dove sono la destra e la sinistra della squadra.',
    steps: [
      {
        title: 'Il 2° arbitro',
        html: `<p>Il fallo di posizione della squadra in ricezione lo decide e lo fischia il <b>2° arbitro</b>. Al servizio si sposta vicino al palo, <b>dal lato della squadra in ricezione</b>.</p>
<p>Fischia <b>solo dopo il colpo di servizio</b>: prima i giocatori possono ancora sistemarsi. Poi indica il fallo con il gesto ufficiale (l'indice che descrive un cerchio).</p>
<p>Puoi ruotare lo sguardo trascinando sullo schermo (o con le frecce).</p>`,
        scene: { rot: 5, formation: 'reception', side: 1, view: 'r2', labels: null, serving: true },
      },
      {
        title: 'La regola del lato',
        html: `<p>Da qualunque palo guardi, vale questa regola:</p>
<p class="rule"><b>Squadra alla tua SINISTRA</b> → le sue zone <b>1 e 2</b> sono <b>vicine a te</b>.<br><b>Squadra alla tua DESTRA</b> → le zone 1 e 2 sono <b>lontane</b> e vicine a te hai la 4 e la 5.</p>
<p>Perché? La squadra guarda la rete: se è alla tua sinistra, guarda verso la tua destra e il suo fianco destro è rivolto verso di te.</p>
<p>Qui sei il <b>1° arbitro</b> e la squadra in ricezione è alla tua sinistra: la zona 1 è vicina a te.</p>`,
        scene: { rot: 1, formation: 'zones', side: 1, view: 'r1', labels: 'zone', zones: true, zonesFrom: 'r1' },
      },
      {
        title: 'Stessa squadra, altro palo',
        html: `<p>Ora sei il <b>2° arbitro</b>, dall'altra parte della rete. La stessa squadra è alla tua <b>destra</b>: le zone 1 e 2 sono <b>lontane</b>.</p>
<p>Allenati su entrambe le viste: l'immagine è specchiata e all'inizio confonde.</p>`,
        scene: { rot: 1, formation: 'zones', side: 1, view: 'r2', labels: 'zone', zones: true, zonesFrom: 'r2' },
      },
      {
        title: 'Cosa si vede bene (e cosa no)',
        html: `<p>Dal palo guardi la squadra <b>di lato</b>:</p>
<ul><li><b>avanti/dietro</b> (distanza dalla rete) si vede bene: è la direzione orizzontale davanti a te;</li>
<li><b>sinistra/destra</b> è la <b>profondità</b>: per giudicarla usa i riferimenti sul campo (linee, la distanza dalla laterale vicina) e controlla chi copre chi.</li></ul>
<p>Prima del servizio <b>leggi i numeri</b> e confrontali con la scheda della formazione: devi sapere chi sono i giocatori "corrispondenti".</p>`,
        scene: { rot: 4, formation: 'reception', side: -1, view: 'r2', labels: 'num', constraints: true },
      },
      {
        title: 'Verifica',
        html: '<p>Immagina la situazione.</p>',
        scene: { rot: 1, formation: 'zones', side: 1, view: 'r2', labels: null, zones: true, zonesFrom: 'r2' },
        quiz: {
          q: 'Sei il 2° arbitro e la squadra in ricezione è alla tua SINISTRA. Le sue zone 1 e 2 sono…',
          options: ['vicine a te', 'lontane da te', 'dipende dalla rotazione'],
          answer: 0,
          explain: 'Squadra a sinistra → zone 1 e 2 vicine, qualunque sia il palo.',
        },
      },
    ],
  },
  {
    id: 'rotazioni',
    title: 'Le sei rotazioni in ricezione',
    summary: 'P1, P6, P5, P4, P3, P2: come si dispone la squadra e dove guardare.',
    steps: [
      ...[1, 6, 5, 4, 3, 2].map((rot, i) => ({
        title: `P${rot}`,
        rotNote: rot,
        html: '',
        scene: { rot, formation: 'reception', side: i % 2 ? -1 : 1, view: i % 2 ? 'r1' : 'r2', labels: 'full', constraints: 'critical', serving: true },
        actions: [{ label: 'Vista dall\'alto', action: 'toggleTop' }, { label: 'Cambia arbitro', action: 'toggleRef' }],
      })),
      {
        title: 'Variante: opposto in ricezione',
        rotNote: 4,
        html: '',
        scene: { rot: 4, variant: 'opp', formation: 'reception', side: 1, view: 'top', topFrom: 'team', labels: 'full', constraints: 'critical', serving: true },
        actions: [{ label: 'Vista dall\'alto', action: 'toggleTop' }, { label: 'Cambia arbitro', action: 'toggleRef' }],
        intro: '<p>In P4, P3 e P2 l\'opposto è in seconda linea. Alcune squadre lo fanno ricevere al posto dello schiacciatore di prima linea, che così resta a rete pronto ad attaccare. Le relazioni da controllare cambiano: puoi attivare questa variante nelle impostazioni.</p>',
      },
    ],
  },
  {
    id: 'falli',
    title: 'Riconoscere i falli',
    summary: 'Esempi tipici, dal vivo, con la spiegazione.',
    steps: [
      {
        title: 'Palleggiatore troppo avanti (P1)',
        html: `<p>In P1 il palleggiatore (zona 1) vuole correre subito a rete. Se al colpo di servizio è <b>più vicino alla rete</b> dello schiacciatore di zona 2 è <b>fallo</b> (relazione 2-1).</p>`,
        scene: { rot: 1, formation: 'reception', side: -1, view: 'r2', labels: 'full', fault: ['2-1', -0.6, [1]], constraints: 'violations', serving: true },
      },
      {
        title: 'Scivolare a destra (P5)',
        html: `<p>In P5 il palleggiatore parte da zona 5. Se si sposta a destra dello schiacciatore di zona 6 prima del colpo è <b>fallo</b> (5-6).</p>
<p>Dal palo è un errore di <b>profondità</b>: guarda bene chi è più vicino alla tua laterale.</p>`,
        scene: { rot: 5, formation: 'reception', side: -1, view: 'r1', labels: 'full', fault: ['5-6', -0.6, [5]], constraints: 'violations', serving: true },
      },
      {
        title: 'Lo schiacciatore che si allarga (P4)',
        html: `<p>In P4 lo schiacciatore di zona 2 riceve tutto a sinistra, appena a destra del centrale di zona 3 che è a rete nell'angolo. Se si allarga ancora e passa <b>a sinistra del centrale</b> è <b>fallo</b> (3-2).</p>
<p>È uno dei falli più frequenti: i due giocatori sono lontanissimi (uno a rete, uno in ricezione) e l'occhio non li confronta.</p>`,
        scene: { rot: 4, formation: 'reception', side: 1, view: 'r2', labels: 'full', fault: ['3-2', -0.5, [2]], constraints: 'violations', serving: true },
      },
      {
        title: 'Palleggiatore in prima linea (P4)',
        html: `<p>In P4 il palleggiatore è in zona 4. Se a rete si mette <b>alla destra</b> del centrale di zona 3 è <b>fallo</b> (4-3).</p>`,
        scene: { rot: 4, formation: 'reception', side: 1, view: 'r1', labels: 'full', fault: ['4-3', -0.5, [4]], constraints: 'violations', serving: true },
      },
      {
        title: 'Giocatori scambiati',
        html: `<p>A volte due giocatori si scambiano il posto, per esempio dopo una sostituzione o una rotazione sbagliata. La disposizione "sembra" normale, ma <b>i numeri non sono al posto giusto</b>.</p>
<p>Qui lo schiacciatore di zona 4 e il libero di zona 5 si sono scambiati: il giocatore di zona 5 è davanti a quello di zona 4.</p>`,
        scene: { rot: 3, formation: 'reception', side: 1, view: 'r2', labels: 'full', swap: [4, 5], constraints: 'violations', serving: true },
      },
      {
        title: 'Fallo o no?',
        html: '<p>Guarda la scena (senza aiuti) e decidi.</p>',
        scene: { rot: 2, formation: 'reception', side: -1, view: 'r2', labels: 'num', fault: ['3-6', -0.4, [3]], constraints: null, serving: true },
        quiz: {
          q: 'In questa P2 c\'è un fallo di posizione?',
          options: ['Sì', 'No'],
          answer: 0,
          explain: 'Lo schiacciatore di zona 3 riceve più lontano dalla rete dello schiacciatore di zona 6: fallo 3-6, tipico della P2.',
          reveal: { labels: 'full', constraints: true },
        },
      },
      {
        title: 'E questa?',
        html: '<p>Attenzione alle diagonali.</p>',
        scene: { rot: 6, formation: 'reception', side: 1, view: 'r1', labels: 'num', constraints: null, serving: true },
        quiz: {
          q: 'In questa P6 c\'è un fallo di posizione?',
          options: ['Sì', 'No'],
          answer: 1,
          explain: 'È regolare: il palleggiatore di zona 6 è davanti allo schiacciatore di zona 4, ma con lui non ha vincoli. Sta dietro l\'opposto di zona 3, tra il libero (5) e lo schiacciatore di zona 1.',
          reveal: { labels: 'full', constraints: true },
        },
      },
    ],
  },
  {
    id: 'gioco',
    title: 'Come si gioca',
    summary: 'Comandi e modalità di allenamento.',
    steps: [
      {
        title: 'Il tuo turno',
        html: `<ol><li>Le squadre si schierano. Leggi i numeri e controlla la <b>scheda della formazione</b> in alto a destra.</li>
<li>Premi <kbd>Invio</kbd> (o <b>Autorizza servizio</b>): fischi e il battitore ha qualche secondo per servire. Il tempo si regola nelle impostazioni.</li>
<li>Dopo il <b>colpo di servizio</b> hai pochi istanti per fischiare il fallo con <kbd>Spazio</kbd> (o il pulsante rosso). Se è tutto regolare, non fare niente.</li>
<li>Ricevi subito la spiegazione: chi era fuori posizione e perché.</li></ol>
<p><b>Fischio anticipato</b>: come nella realtà, il fallo va fischiato <b>dopo</b> il colpo. Nell'allenamento assistito ti avvisiamo, nella partita conta come errore. Puoi disattivarlo nelle impostazioni.</p>`,
        scene: { rot: 3, formation: 'reception', side: -1, view: 'r2', labels: null, serving: true },
      },
      {
        title: 'Modalità',
        html: `<ul><li><b>Allenamento assistito</b>: etichette con ruolo e zona, rotazione indicata (P1…P6), spiegazioni dettagliate.</li>
<li><b>Partita</b>: una serie di servizi senza aiuti, con punteggio e riepilogo dei tuoi errori.</li>
<li><b>Riconosci la rotazione</b>: guardi la ricezione e dici in che rotazione è la squadra.</li>
<li><b>Esplora</b>: sposti i giocatori con il mouse e vedi in tempo reale se la posizione è regolare.</li></ul>
<p>Cambia vista con <kbd>1</kbd> (1° arbitro) e <kbd>2</kbd> (2° arbitro) e guardati intorno con le frecce.</p>`,
        scene: { rot: 6, formation: 'reception', side: 1, view: 'r1', labels: null, serving: true },
        actions: [{ label: 'Inizia l\'allenamento assistito ▶', action: 'startAssist' }],
      },
    ],
  },
];
