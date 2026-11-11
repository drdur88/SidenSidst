/**
 * Editorial test data for Siden sidst.
 * Every case, organisation, document and figure below is fictional.
 * Source excerpts are deliberately stored inline; they are not real documents.
 */

export type StoryCategory = 'Transport' | 'Bolig' | 'Klima' | 'Teknologi';
export type StoryStatus = 'changed' | 'open' | 'resolved';
export type TimelineKind = 'initial' | 'update' | 'correction' | 'resolved';

export interface StoryTimelineEntry {
  date: string;
  title: string;
  body: string;
  kind: TimelineKind;
}

export interface StorySource {
  title: string;
  publisher: string;
  date: string;
  excerpt: string;
}

export interface Story {
  id: string;
  category: StoryCategory;
  question: string;
  summary: string;
  currentAnswer: string;
  status: StoryStatus;
  statusLabel: string;
  before: string;
  after: string;
  whyItMatters: string;
  uncertainty: string;
  nextMilestone: { label: string; date: string | null };
  updatedAt: string;
  timeline: StoryTimelineEntry[];
  sources: StorySource[];
  correction?: { before: string; after: string; reason: string };
}

export const DEMO_NOTICE =
  'Eksempelsager: Alle steder, dokumenter og tal er fiktive og bruges til at teste produktet.';

export const categories: StoryCategory[] = ['Transport', 'Bolig', 'Klima', 'Teknologi'];

export const stories: Story[] = [
  {
    id: 'station-2028',
    category: 'Transport',
    question: 'Åbner den nye station i 2028?',
    summary: 'Åbningsåret er rykket til 2030. Den nye tidsplan afhænger af næste udbud.',
    currentAnswer: 'Ikke efter den seneste plan. Lindeby Station er nu planlagt til at åbne i 2030.',
    status: 'changed',
    statusLabel: 'Ny tidsplan',
    before: 'Den officielle projektplan angav åbning i december 2028.',
    after: 'Den reviderede projektplan angiver december 2030. Udbuddet er forsinket.',
    whyItMatters: 'Pendlere må planlægge efter en længere ventetid. En ny åbningsdato er stadig en plan, som kan blive ændret.',
    uncertainty: '2030 forudsætter, at anlægskontrakten underskrives senest juni 2027. Kontrakten er endnu ikke indgået.',
    nextMilestone: { label: 'Offentliggørelse af det reviderede udbud', date: '2026-12-15' },
    updatedAt: '2026-11-10T09:00:00+01:00',
    timeline: [
      { date: '2026-04-14', title: '2028 bliver målet', body: 'Lindeby Trafiks første projektplan angiver åbning i december 2028.', kind: 'initial' },
      { date: '2026-09-03', title: 'Udbuddet bliver udskudt', body: 'En ny jordbundsundersøgelse skal indgå i udbudsmaterialet. Åbningsåret bliver endnu ikke ændret.', kind: 'update' },
      { date: '2026-11-10', title: 'Nyt mål: december 2030', body: 'Den reviderede plan flytter åbningen to år og angiver en kontraktfrist i juni 2027.', kind: 'update' },
    ],
    sources: [
      { title: 'Projektplan, version 1 · fiktivt dokument', publisher: 'Lindeby Trafik · fiktiv organisation', date: '2026-04-14', excerpt: 'Planlagt åbning: december 2028. Tidsplanen forudsætter udbud i efteråret 2026.' },
      { title: 'Revideret projektplan · fiktivt dokument', publisher: 'Lindeby Trafik · fiktiv organisation', date: '2026-11-10', excerpt: 'Åbningen flyttes til december 2030. Tidsplanen forudsætter underskrevet anlægskontrakt senest 30. juni 2027. Revideret udbud offentliggøres 15. december 2026.' },
    ],
  },
  {
    id: 'boliger-600',
    category: 'Bolig',
    question: 'Bliver de 600 nye lejeboliger bygget?',
    summary: 'Finansieringen er vedtaget. Byggeriet mangler stadig en byggetilladelse.',
    currentAnswer: 'Projektet har fået finansiering, men byggetilladelsen mangler. Ingen af de 600 boliger er færdige.',
    status: 'changed',
    statusLabel: 'Finansiering vedtaget',
    before: 'Kommunen havde fremlagt et forslag om 600 boliger uden en vedtaget finansieringsplan.',
    after: 'Kommunalbestyrelsen har vedtaget finansieringen til alle 600 boliger. Byggeansøgningen behandles fortsat.',
    whyItMatters: 'Projektet har passeret en vigtig beslutning. Den vedtagne finansiering siger endnu ikke, hvornår der kan flytte mennesker ind.',
    uncertainty: 'Byggetilladelse, endelig husleje og indflytningsdato er endnu uafklarede. Betegnelsen ”billige boliger” er ikke dokumenteret med en endelig husleje.',
    nextMilestone: { label: 'Planlagt afgørelse om byggetilladelsen', date: '2027-01-20' },
    updatedAt: '2026-11-09T14:30:00+01:00',
    timeline: [
      { date: '2026-05-12', title: 'Forslaget bliver fremlagt', body: 'Kommunen foreslår 600 lejeboliger ved det tidligere værkstedsområde.', kind: 'initial' },
      { date: '2026-10-02', title: 'Byggeansøgningen bliver indsendt', body: 'Projektet får en sag i byggesagsafdelingen. Der er endnu ingen tilladelse.', kind: 'update' },
      { date: '2026-11-09', title: 'Finansieringen bliver vedtaget', body: 'Kommunalbestyrelsen vedtager finansieringsplanen. Den planlagte afgørelse om tilladelsen ligger i januar.', kind: 'update' },
    ],
    sources: [
      { title: 'Boligforslag ved Værkstedspladsen · fiktivt dokument', publisher: 'Lindeby Kommune · fiktiv organisation', date: '2026-05-12', excerpt: 'Forslaget omfatter 600 lejeboliger. Finansieringsplan, lejeniveau og tidsplan fremlægges senere.' },
      { title: 'Beslutningsreferat om finansiering · fiktivt dokument', publisher: 'Lindeby Kommune · fiktiv organisation', date: '2026-11-09', excerpt: 'Finansieringsplanen for 600 boliger er vedtaget. Byggeansøgningen er fortsat under behandling med forventet afgørelse 20. januar 2027.' },
    ],
  },
  {
    id: 'varmeforbrug',
    category: 'Klima',
    question: 'Sænker renoveringen skolernes varmeforbrug med 20 %?',
    summary: 'Renoveringen er færdig. Den første sammenlignelige måling mangler stadig.',
    currentAnswer: 'Det ved vi endnu ikke. Målet er 20 % lavere varmeforbrug på de tre renoverede skoler, korrigeret for vejret.',
    status: 'open',
    statusLabel: 'Afventer måling',
    before: 'Projektets beregning anslog en besparelse på 20 %. Det var en forventning før renoveringen.',
    after: 'Renoveringen er afsluttet, men kommunen har endnu ikke offentliggjort målinger, der kan sammenlignes med udgangspunktet.',
    whyItMatters: 'En forventet besparelse og en målt besparelse er forskellige oplysninger. Den første hele fyringssæson skal vise, om målet bliver nået.',
    uncertainty: 'Vejr, åbningstider og brugen af bygningerne påvirker forbruget. De forhold skal indgå i sammenligningen.',
    nextMilestone: { label: 'Første rapport med vejrkorrigerede målinger', date: '2027-05-18' },
    updatedAt: '2026-11-06T11:00:00+01:00',
    timeline: [
      { date: '2026-02-11', title: 'Et mål på 20 % bliver sat', body: 'Kommunens projektbeskrivelse anslår en besparelse efter isolering og nye varmeanlæg.', kind: 'initial' },
      { date: '2026-09-28', title: 'Renoveringen er færdig', body: 'De tre skoler tager de nye anlæg i brug. Måleperioden starter i oktober.', kind: 'update' },
      { date: '2026-11-06', title: 'Måleplanen bliver offentliggjort', body: 'Kommunen vil sammenligne en hel fyringssæson og korrigere for vejr og åbningstider. Der foreligger endnu ingen effektmåling.', kind: 'update' },
    ],
    sources: [
      { title: 'Energiprojekt for tre skoler · fiktivt dokument', publisher: 'Lindeby Ejendomme · fiktiv organisation', date: '2026-02-11', excerpt: 'Den beregnede reduktion i varmeforbrug er 20 % sammenlignet med udgangspunktet. Beregningen er en forventning og skal efterprøves efter idriftsættelse.' },
      { title: 'Plan for evaluering · fiktivt dokument', publisher: 'Lindeby Ejendomme · fiktiv organisation', date: '2026-11-06', excerpt: 'Første evalueringsrapport offentliggøres 18. maj 2027. Opgørelsen korrigerer for graddage og registrerede ændringer i åbningstider.' },
    ],
  },
  {
    id: 'ai-ventetid',
    category: 'Teknologi',
    question: 'Gør den nye AI-løsning ventetiden 30 % kortere?',
    summary: 'Vi retter vores første opdatering: Tallet gælder et enkelt arbejdstrin, ikke borgerens samlede ventetid.',
    currentAnswer: 'Det er ikke dokumenteret. Pilotforsøget målte 30 % kortere arbejdstid til sortering af bilag. Den samlede ventetid blev ikke målt.',
    status: 'changed',
    statusLabel: 'Rettelse',
    before: 'Vores første opdatering beskrev pilotforsøget som 30 % kortere ventetid for borgerne.',
    after: 'Den fulde rapport viser, at tallet kun gælder medarbejdernes tid til sortering af bilag i 200 udvalgte sager.',
    whyItMatters: 'Hurtigere sortering kan være nyttig, men fortæller ikke i sig selv, hvor længe borgeren venter på et svar.',
    uncertainty: 'Vi mangler målinger af hele sagsforløbet samt fejlrate og efterarbejde. De 200 udvalgte sager siger heller ikke nødvendigvis noget om alle sagstyper.',
    nextMilestone: { label: 'Planlagt evaluering af hele sagsforløbet', date: '2027-02-12' },
    updatedAt: '2026-11-10T10:45:00+01:00',
    timeline: [
      { date: '2026-10-21', title: 'Pilotforsøget bliver præsenteret', body: 'Et kort resumé omtaler 30 % sparet tid ved brug af et nyt værktøj til bilag.', kind: 'initial' },
      { date: '2026-10-22', title: 'Vores første opdatering er for bred', body: 'Vi beskriver resultatet som en kortere ventetid for borgerne. Den formulering bliver senere rettet.', kind: 'update' },
      { date: '2026-11-10', title: 'Vi retter oplysningen', body: 'Den fulde rapport afgrænser målingen til sortering af bilag. Vi sender rettelsen til de læsere, der så den første opdatering.', kind: 'correction' },
    ],
    sources: [
      { title: 'Kort resumé af pilotforsøg · fiktivt dokument', publisher: 'Lindeby Digitalisering · fiktiv organisation', date: '2026-10-21', excerpt: 'Pilotforsøget viser 30 % sparet tid ved arbejdet med bilag. Den fulde evaluering offentliggøres i november.' },
      { title: 'Metode og resultater for pilotforsøget · fiktivt dokument', publisher: 'Lindeby Digitalisering · fiktiv organisation', date: '2026-11-10', excerpt: 'De 30 % vedrører gennemsnitlig arbejdstid til sortering af bilag i 200 udvalgte sager. Borgernes samlede ventetid, fejlrate og efterarbejde indgår ikke i denne måling. En evaluering af hele forløbet er planlagt til 12. februar 2027.' },
    ],
    correction: {
      before: 'AI-løsningen giver borgerne 30 % kortere ventetid.',
      after: 'Pilotforsøget viste 30 % kortere arbejdstid til sortering af bilag. Borgernes samlede ventetid blev ikke målt.',
      reason: 'Vi gjorde en måling af et enkelt arbejdstrin til en påstand om hele sagsforløbet. Den fulde rapport understøtter ikke vores oprindelige formulering.',
    },
  },
  {
    id: 'cykelbro',
    category: 'Transport',
    question: 'Åbner cykelbroen inden 1. december?',
    summary: 'Ja. Broen blev åbnet den 7. november, og åbningsfristen er opfyldt.',
    currentAnswer: 'Ja. Cykelbroen ved Lindeby Kanal åbnede for cyklister og gående den 7. november 2026.',
    status: 'resolved',
    statusLabel: 'Afklaret',
    before: 'Den planlagte åbning var 7. november. Vi afventede den afsluttende sikkerhedsgodkendelse.',
    after: 'Sikkerhedsgodkendelsen blev givet, og broen åbnede 7. november. Det afgrænsede spørgsmål om åbning før december er afklaret.',
    whyItMatters: 'Brugerne kan tage broen i brug. Vi kan afslutte dette forløb med et dokumenteret svar på åbningsspørgsmålet.',
    uncertainty: 'Åbningen er dokumenteret. Om broen giver den forventede rejsetidsbesparelse, kræver en anden undersøgelse og er ikke afklaret her.',
    nextMilestone: { label: 'Sagen er afsluttet. Åbningsfristen er opfyldt.', date: null },
    updatedAt: '2026-11-09T08:15:00+01:00',
    timeline: [
      { date: '2026-03-16', title: 'Åbning før december bliver lovet', body: 'Kommunen sætter 1. december som seneste åbningsdato.', kind: 'initial' },
      { date: '2026-10-26', title: 'Åbningsdag bliver fastsat', body: 'Kommunen annoncerer 7. november med forbehold for den afsluttende sikkerhedsgodkendelse.', kind: 'update' },
      { date: '2026-11-06', title: 'Broen bliver godkendt', body: 'Den afsluttende kontrol giver tilladelse til åbning for cyklister og gående.', kind: 'update' },
      { date: '2026-11-09', title: 'Åbningen er bekræftet', body: 'Driftsloggen dokumenterer åbningen den 7. november. Spørgsmålet om fristen er afklaret.', kind: 'resolved' },
    ],
    sources: [
      { title: 'Tidsplan for cykelbroen · fiktivt dokument', publisher: 'Lindeby Anlæg · fiktiv organisation', date: '2026-03-16', excerpt: 'Cykelbroen forventes åbnet for offentligheden senest 1. december 2026.' },
      { title: 'Godkendelse og driftslog · fiktivt dokument', publisher: 'Lindeby Anlæg · fiktiv organisation', date: '2026-11-09', excerpt: 'Sikkerhedsgodkendelse givet 6. november. Broen blev åbnet for almindelig passage 7. november kl. 09.00 og indgår nu i normal drift.' },
    ],
  },
  {
    id: 'solceller',
    category: 'Klima',
    question: 'Dækker solcellerne 40 % af hallens årlige elforbrug?',
    summary: 'De første to måneder ligger over målet, men de afgør ikke resultatet for et helt år.',
    currentAnswer: 'Det er stadig uafklaret. Solcellerne dækkede 46 % i september og oktober tilsammen. Målet gælder et helt år.',
    status: 'open',
    statusLabel: 'For tidligt at afgøre',
    before: 'Projektet forventede, at solcellerne kunne dække 40 % af hallens elforbrug over et helt år.',
    after: 'De første to måneders målere viser 46 %. Der mangler ti måneder, før samme periode som målet kan opgøres.',
    whyItMatters: 'Produktion og elforbrug varierer over året. Et godt resultat for to måneder kan ikke alene afgøre, om årsmålet bliver nået.',
    uncertainty: 'Vinterens produktion og hallens samlede elforbrug mangler. Opgørelsen gælder strøm brugt direkte i hallen; strøm solgt til nettet tælles ikke med.',
    nextMilestone: { label: 'Første halvårsrapport', date: '2027-03-15' },
    updatedAt: '2026-11-05T13:00:00+01:00',
    timeline: [
      { date: '2026-06-08', title: 'Et årsmål på 40 % bliver sat', body: 'Projektbeskrivelsen definerer målet som solstrøm brugt direkte i hallen i forhold til hallens samlede elforbrug.', kind: 'initial' },
      { date: '2026-09-01', title: 'Anlægget bliver sat i drift', body: 'Den første årlige måleperiode begynder og løber til 31. august 2027.', kind: 'update' },
      { date: '2026-11-05', title: 'De første to måneder bliver opgjort', body: 'De offentliggjorte målere viser 46 % dækning for september og oktober. Årsmålet er endnu ikke afgjort.', kind: 'update' },
    ],
    sources: [
      { title: 'Solcelleprojekt for Lindeby Hallen · fiktivt dokument', publisher: 'Lindeby Fritid · fiktiv organisation', date: '2026-06-08', excerpt: 'Målet er, at solstrøm brugt direkte i hallen dækker 40 % af hallens samlede elforbrug i første fulde driftsår. Eksporteret strøm indgår ikke i dækningsgraden.' },
      { title: 'Målerstatus for september–oktober · fiktivt dokument', publisher: 'Lindeby Fritid · fiktiv organisation', date: '2026-11-05', excerpt: 'For september og oktober udgør direkte anvendt solstrøm 46 % af hallens samlede elforbrug. Halvårsrapporten forventes 15. marts 2027. Første årsperiode afsluttes 31. august 2027.' },
    ],
  },
];

export const betaFeedbackQuestions = [
  'Var det tydeligt, hvad der havde ændret sig?',
  'Ville du vende tilbage for at følge sagen?',
  'Hvad manglede du for at stole på opdateringen?',
] as const;
