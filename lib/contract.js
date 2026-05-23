'use strict';

const startDate = process.env.CONTRACT_START_DATE || '[fylles inn]';
const saraEmail = process.env.SARA_EMAIL || 'sara.endestad@gmail.com';
const saraPhone = process.env.SARA_PHONE || '+4797674887';

const blocks = [
  {
    type: 'title',
    main: 'KONSULENTAVTALE',
    subtitle: 'Ekstern salgskonsulent for Veien til Hjertet',
    subsubtitle: 'Mellom Evelyn Floan og Sara Endestad',
  },
  {
    type: 'paragraph',
    text: 'Denne avtalen («Avtalen») er inngått mellom:',
  },

  { type: 'h2', text: '1. Partene' },
  { type: 'h3', text: '1.1 Oppdragsgiver' },
  {
    type: 'table',
    rows: [
      ['Navn', 'Evelyn Floan'],
      ['Foretak', 'EVELYN FLOAN (enkeltpersonforetak)'],
      ['Organisasjonsnummer', '917 013 101'],
      ['Forretningsadresse', 'Midelfarts veg 3, 7022 Trondheim'],
      ['E-post', 'hei@veientilhjertet.no'],
      ['Heretter benevnt', '«Oppdragsgiver» eller «Evelyn»'],
    ],
  },
  { type: 'h3', text: '1.2 Oppdragstaker' },
  {
    type: 'table',
    rows: [
      ['Navn', 'Sara Katarina Petru Endestad'],
      ['Foretak', 'ENDESTAD (enkeltpersonforetak)'],
      ['Organisasjonsnummer', '924 590 904'],
      ['Forretningsadresse', 'Observatoriegata 10, 0254 Oslo'],
      ['E-post', saraEmail],
      ['Mobil', saraPhone],
      ['Heretter benevnt', '«Oppdragstaker» eller «Sara»'],
    ],
  },
  {
    type: 'paragraph',
    text: 'Partene benevnes samlet som «Partene» og hver for seg som «Part».',
  },

  { type: 'h2', text: '2. Bakgrunn og formål' },
  { type: 'h3', text: '2.1 Bakgrunn' },
  {
    type: 'paragraph',
    text: 'Evelyn Floan driver coachingvirksomheten Veien til Hjertet, som tilbyr digitale selvutviklingsprogrammer til privatpersoner. Virksomheten ønsker å vokse gjennom aktivt salgspersonell som kontakter potensielle kunder og gjennomfører salgsdialog på vegne av virksomheten.',
  },
  { type: 'h3', text: '2.2 Formål' },
  {
    type: 'paragraph',
    text: 'Formålet med denne Avtalen er å regulere samarbeidet mellom Oppdragsgiver og Oppdragstaker, herunder Oppdragstakerens rolle som ekstern salgskonsulent, provisjonsbetingelser, konfidensialitetsforpliktelser og andre relevante vilkår.',
  },
  { type: 'h3', text: '2.3 Programmer som omfattes' },
  {
    type: 'paragraph',
    text: 'Avtalen gjelder salg av følgende programmer:',
  },
  {
    type: 'table',
    header: ['Program', 'Pris (kr inkl. mva.)'],
    rows: [
      ['Første Steg', '9 900'],
      ['Oppvåkning', '29 990'],
      ['Kraft', '79 900'],
    ],
  },

  { type: 'h2', text: '3. Oppdragets innhold' },
  { type: 'h3', text: '3.1 Hovedoppgaver' },
  {
    type: 'paragraph',
    text: 'Oppdragstaker skal utføre følgende oppgaver på vegne av Oppdragsgiver:',
  },
  {
    type: 'bullets',
    items: [
      'Kontakte og følge opp leads som Oppdragsgiver tildeler via CRM-systemet.',
      'Gjennomføre salgsdialog per telefon, e-post og videomøte (Google Meet).',
      'Presentere og selge Oppdragsgivers programmer i tråd med gitte salgsmanus og retningslinjer.',
      'Registrere all aktivitet og kundestatus i Oppdragsgivers CRM-system.',
      'Delta på ukentlige salgsmøter og opplæringsøkter fastsatt av Oppdragsgiver.',
      'Gi tilbakemelding på leads-kvalitet og salgsprosess til Oppdragsgiver.',
    ],
  },
  { type: 'h3', text: '3.2 Forventet omfang' },
  {
    type: 'paragraph',
    text: 'Oppdraget er basert på resultat, ikke fast timeantall. Partene er enige om at Oppdragstaker vil bruke et omfang tilsvarende deltid for å nå et realistisk antall salg per måned. Minsteaktivitet kan avtales skriftlig mellom Partene.',
  },
  { type: 'h3', text: '3.3 Tid og sted' },
  {
    type: 'paragraph',
    text: 'Oppdraget utføres i hovedsak digitalt via Google Meet og telefon. Oppdragstaker bestemmer selv arbeidstider innenfor de rammer som til enhver tid er avtalt med Oppdragsgiver.',
  },
  { type: 'h3', text: '3.4 Thetahealing-interesserte leads' },
  {
    type: 'paragraph',
    text: 'Dersom en lead som Oppdragstaker er i dialog med, viser interesse for thetahealing eller andre tjenester utenfor programmene listet i punkt 2.3, skal Oppdragstaker booke et direkte møte mellom leaden og Oppdragsgiver fremfor å forsøke å selge thetahealing selv. Oppdragstaker skal ikke representere eller selge tjenester Oppdragstaker ikke er opplært i.',
  },
  {
    type: 'paragraph',
    text: 'Slike leads anses som Oppdragsgivers egne kunder, og Oppdragstaker tjener ikke provisjon på thetahealing-salg eller andre tjenester utenfor denne Avtalens omfang. Eventuelle fremtidige utvidelser av Oppdragstakerens salgsportefølje avtales skriftlig mellom Partene.',
  },

  { type: 'h2', text: '4. Oppdragstype – selvstendig næringsdrivende' },
  {
    type: 'paragraph',
    text: 'Oppdragstaker er selvstendig næringsdrivende og ikke ansatt hos Oppdragsgiver. Oppdragstaker er selv ansvarlig for:',
  },
  {
    type: 'bullets',
    items: [
      'Betaling av skatt, trygdeavgift og eventuelle andre offentlige avgifter knyttet til inntekten fra dette Oppdraget.',
      'Fakturering av Oppdragsgiver i tråd med denne Avtalen.',
      'Egen regnskapsføring og rapportering til skattemyndighetene.',
      'Nødvendige tillatelser og registreringer som selvstendig næringsdrivende.',
    ],
  },
  {
    type: 'paragraph',
    text: 'Avtalen medfører ikke noe arbeidsgiver-/arbeidstakerforhold mellom Partene. Oppdragsgiver har ikke ansvar for Oppdragstakerens skatteforhold, trygderettigheter eller andre rettigheter som tilkommer arbeidstakere.',
  },

  { type: 'h2', text: '5. Provisjon' },
  { type: 'h3', text: '5.1 Provisjonssats' },
  {
    type: 'paragraph',
    text: 'Oppdragstaker mottar 12 % provisjon av salgsbeløpet for hvert salg der Oppdragstaker er registrert som ansvarlig selger i CRM-systemet.',
  },
  { type: 'h3', text: '5.2 Beregningsgrunnlag' },
  {
    type: 'paragraph',
    text: 'Provisjon beregnes av bruttosalgsbeløpet eksklusive merverdiavgift og eventuelle rabatter eller kampanjepriser. Betalingsgebyrer fra tredjepart (kortgebyr, Klarna-gebyr e.l.) trekkes ikke fra provisjonsgrunnlaget med mindre annet er avtalt skriftlig.',
  },
  { type: 'h3', text: '5.3 Eksempler på provisjon' },
  {
    type: 'table',
    header: ['Program', 'Pris (kr)', 'Provisjon (12 %)'],
    rows: [
      ['Første Steg', '9 900', '1 188'],
      ['Oppvåkning', '29 990', '3 599'],
      ['Kraft', '79 900', '9 588'],
    ],
  },
  { type: 'h3', text: '5.4 Hva regnes som Saras salg' },
  {
    type: 'paragraph',
    text: 'Et salg regnes som Oppdragstakerens dersom Oppdragstaker har hatt den avgjørende salgsdialogen med kunden, og kunden gjennomfører kjøp innen 60 dager etter siste registrerte kontakt med Oppdragstaker i CRM-systemet. Oppdragsgiver har det endelige ordet ved tvist om tilskrivning, men skal begrunne avgjørelsen skriftlig.',
  },

  { type: 'h2', text: '6. Utbetaling og fakturering' },
  { type: 'h3', text: '6.1 Utbetalingssyklus' },
  {
    type: 'paragraph',
    text: 'Provisjon utbetales månedlig. Oppdragstaker sender faktura til Oppdragsgiver innen 5 virkedager etter månedsslutt, basert på salgsrapporten fra CRM-systemet. Oppdragsgiver betaler fakturaen innen 14 dager etter mottak.',
  },
  { type: 'h3', text: '6.2 Klarna delbetaling' },
  {
    type: 'paragraph',
    text: 'Dersom kunden benytter Klarna delbetaling, utbetales provisjon basert på beløpet Oppdragsgiver faktisk mottar fra Klarna, etter Klarnas gebyrtrekk. Eventuell differanse mellom listeprisen og mottatt beløp fremgår av utbetalingsrapporten.',
  },
  { type: 'h3', text: '6.3 Forsinkelsesrente' },
  {
    type: 'paragraph',
    text: 'Ved forsinket betaling løper forsinkelsesrente etter forsinkelsesrenteloven fra forfallsdato til betaling skjer.',
  },

  { type: 'h2', text: '7. Refundering og kreditering' },
  {
    type: 'paragraph',
    text: 'Oppdragsgivers programmer leveres med en 90-dagers pengene-tilbake-garanti. Dersom en kunde benytter garantien og mottar full refusjon, skal utbetalt provisjon for det aktuelle salget trekkes fra neste månedlige utbetaling til Oppdragstaker. Dersom det ikke er utbetalt provisjon å motregne i, utsteder Oppdragstaker kreditnota tilsvarende provisjonsbeløpet.',
  },
  {
    type: 'paragraph',
    text: 'Oppdragsgiver varsler Oppdragstaker skriftlig om refusjoner uten unødig opphold.',
  },

  { type: 'h2', text: '8. Leads, verktøy og opplæring' },
  { type: 'h3', text: '8.1 Hva Oppdragsgiver tilbyr' },
  {
    type: 'bullets',
    items: [
      'Tilgang til CRM-system med leads og kundeoversikt.',
      'Bookingkalender for kundemøter.',
      'Salgsmanus, presentasjoner og opplæringsmateriell.',
      'Innføring og løpende opplæring i produkter og salgsprosess.',
      'Betalingslenker via Stripe for enkel transaksjonshåndtering.',
    ],
  },
  { type: 'h3', text: '8.2 Hva Oppdragstaker selv må ha' },
  {
    type: 'bullets',
    items: [
      'Fungerende PC eller Mac med nettleser.',
      'Stabil internettforbindelse.',
      'Google Meet tilgang for videomøter.',
    ],
  },

  { type: 'h2', text: '9. Salgsdata og innsyn' },
  {
    type: 'paragraph',
    text: 'Begge Parter har til enhver tid tilgang til samme salgsdata via CRM-systemet. Det kreves ingen manuell rapportering fra Oppdragstaker utover det som registreres løpende i CRM-systemet. Dashboard oppdateres automatisk og viser provisjonsgrunnlag, antall salg og refusjoner.',
  },

  { type: 'h2', text: '10. Konfidensialitet' },
  {
    type: 'paragraph',
    text: 'Oppdragstaker forplikter seg til å behandle all ikke-offentlig informasjon om Oppdragsgivers virksomhet, kunder, priser, strategier og metoder som strengt konfidensiell. Denne forpliktelsen gjelder under Avtalens løpetid og i 5 (fem) år etter Avtalens opphør, uavhengig av opphørsgrunn.',
  },
  {
    type: 'paragraph',
    text: 'Oppdragstaker skal ikke dele konfidensiell informasjon med tredjeparter uten skriftlig forhåndssamtykke fra Oppdragsgiver, og skal treffe rimelige tiltak for å beskytte informasjonen mot uautorisert tilgang.',
  },

  { type: 'h2', text: '11. Personopplysninger (GDPR)' },
  {
    type: 'paragraph',
    text: 'Oppdragstaker vil i forbindelse med oppdraget behandle personopplysninger om potensielle og eksisterende kunder på vegne av Oppdragsgiver. Partene skal inngå en separat databehandleravtale (vedlegg 1) i tråd med personopplysningsloven og GDPR. Oppdragstaker skal kun behandle personopplysninger i henhold til Oppdragsgivers instrukser og ikke benytte opplysningene til egne formål.',
  },

  { type: 'h2', text: '12. Immaterielle rettigheter' },
  {
    type: 'paragraph',
    text: 'Alt materiell, alle salgsmanus, presentasjoner, metodikker, programinnhold og andre åndsverk som er utviklet av eller for Oppdragsgiver, tilhører Oppdragsgiver. Oppdragstaker gis en begrenset, ikke-eksklusiv og ikke-overdragbar rett til å benytte slikt materiell utelukkende i forbindelse med utførelsen av oppdraget under denne Avtalen.',
  },

  { type: 'h2', text: '13. Konkurranseklausul' },
  {
    type: 'paragraph',
    text: 'I 6 (seks) måneder etter Avtalens opphør skal Oppdragstaker ikke drive, delta i eller bistå virksomhet som er i direkte konkurranse med Oppdragsgivers coachingvirksomhet innen samme nisje (personlig utvikling rettet mot privatpersoner i Norge). Klausulen er geografisk avgrenset til Norge og begrenses til aktiviteter som er direkte konkurrerende med Oppdragsgivers kjernevirksomhet.',
  },

  { type: 'h2', text: '14. Kundeklausul' },
  {
    type: 'paragraph',
    text: 'I 12 (tolv) måneder etter Avtalens opphør skal Oppdragstaker ikke:',
  },
  {
    type: 'bullets',
    items: [
      'Ta direkte kontakt med Oppdragsgivers eksisterende eller potensielle kunder (leads) med sikte på å selge konkurrerende tjenester eller produkter.',
      'Bistå tredjepart med å flytte Oppdragsgivers kunder til konkurrerende virksomhet.',
    ],
  },
  {
    type: 'paragraph',
    text: 'Klausulen er begrenset til konkurrerende virksomhet innen samme nisje. Den hindrer ikke Oppdragstaker fra å samarbeide med Oppdragsgivers øvrige samarbeidspartnere eller leverandører på prosjekter utenfor Oppdragsgivers virksomhet.',
  },

  { type: 'h2', text: '15. Ansvar' },
  {
    type: 'paragraph',
    text: 'Partenes ansvar overfor hverandre er begrenset til et beløp tilsvarende samlet provisjon utbetalt til Oppdragstaker de siste 12 (tolv) månedene før den skadevoldende hendelsen. Ingen av Partene er ansvarlig for indirekte tap, følgeskader, tapte inntekter eller tap av data som følge av Avtalens brudd, med mindre tapet skyldes grov uaktsomhet eller forsett.',
  },

  { type: 'h2', text: '16. Avtaleperiode og oppsigelse' },
  { type: 'h3', text: '16.1 Startdato' },
  {
    type: 'paragraph',
    text: `Avtalen trer i kraft ${startDate}.`,
  },
  { type: 'h3', text: '16.2 Prøvetid' },
  {
    type: 'paragraph',
    text: 'De første 3 (tre) månedene av Avtalen er prøvetid. I prøvetiden kan begge Parter si opp Avtalen med 14 dagers skriftlig varsel.',
  },
  { type: 'h3', text: '16.3 Oppsigelse etter prøvetid' },
  {
    type: 'paragraph',
    text: 'Etter prøvetidens utløp kan begge Parter si opp Avtalen med 30 dagers skriftlig varsel.',
  },
  { type: 'h3', text: '16.4 Umiddelbar heving' },
  {
    type: 'paragraph',
    text: 'Begge Parter kan heve Avtalen med umiddelbar virkning ved vesentlig mislighold fra den andre Partens side. Vesentlig mislighold inkluderer, men er ikke begrenset til, gjentatt brudd på konfidensialitetsforpliktelsene, brudd på kundeklausulen, eller manglende betaling av forfalt provisjon etter purring.',
  },
  { type: 'h3', text: '16.5 Oppgjør ved opphør' },
  {
    type: 'paragraph',
    text: 'Ved Avtalens opphør har Oppdragstaker krav på provisjon for salg som er gjennomført og betalt av kunden innen opphørsdatoen. Salg der kunden ennå ikke har betalt på opphørsdatoen gir ikke rett til provisjon, med mindre annet er skriftlig avtalt.',
  },

  { type: 'h2', text: '17. Force majeure' },
  {
    type: 'paragraph',
    text: 'Ingen av Partene er ansvarlig for forsinkelse eller unnlatelse av å oppfylle forpliktelser under Avtalen i den grad dette skyldes forhold utenfor Partens rimelige kontroll, herunder naturkatastrofer, krig, streik, lockout, langvarig strømbrudd eller myndighetspålagte restriksjoner. Den berørte Part skal varsle den andre Part uten unødig opphold og angi forventet varighet.',
  },

  { type: 'h2', text: '18. Lovvalg og verneting' },
  {
    type: 'paragraph',
    text: 'Avtalen er underlagt norsk rett. Eventuelle tvister som oppstår i forbindelse med Avtalen skal søkes løst i minnelighet. Dersom minnelig løsning ikke oppnås, skal tvisten avgjøres ved Sør-Trøndelag tingrett som verneting.',
  },

  { type: 'h2', text: '19. Endringer' },
  {
    type: 'paragraph',
    text: 'Endringer i Avtalen krever skriftlig enighet mellom Partene for å være bindende, med mindre annet følger av dette punktet. Oppdragsgiver kan foreta ensidige endringer i prislister, provisjonssatser og programportefølje med 35 dagers skriftlig varsel til Oppdragstaker. Dersom Oppdragstaker ikke aksepterer endringene, kan Oppdragstaker si opp Avtalen i henhold til oppsigelsesreglene i punkt 16.',
  },

  {
    type: 'signature_block',
    parties: [
      {
        role: 'Oppdragsgiver',
        name: 'Evelyn Floan',
        company: 'EVELYN FLOAN',
        orgnr: '917 013 101',
        party: 'evelyn',
      },
      {
        role: 'Oppdragstaker',
        name: 'Sara Katarina Petru Endestad',
        company: 'ENDESTAD',
        orgnr: '924 590 904',
        party: 'sara',
      },
    ],
  },

  {
    type: 'attachments',
    items: [
      'Vedlegg 1: Databehandleravtale (DPA)',
      'Vedlegg 2: Pristabell og programbeskrivelse',
      'Vedlegg 3: Rapporteringsmal',
    ],
  },
];

module.exports = { blocks };
