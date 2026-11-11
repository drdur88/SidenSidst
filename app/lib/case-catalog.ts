import type { TrackedCase } from "./case-types";

// Source review: 2026-11-11T14:06:56Z. Historical event dates are separate from this review.
// Undated pages retain publishedAt: null; broad target periods stay in labels, not invented dates.
export const CASE_CATALOG: TrackedCase[] = [
  {
    "id": "femern-specialelement",
    "question": "Hvornår er Femerns første specialelement på plads?",
    "description": "Vi følger næste byggetrin i tunnelen mellem Lolland og Femern.",
    "topics": [
      "samfund",
      "teknologi"
    ],
    "region": "danmark",
    "scope": "national",
    "imageKey": "mobility",
    "sources": [
      {
        "id": "femern-first",
        "title": "The first element of the Fehmarnbelt tunnel successfully immersed",
        "publisher": "Femern A/S",
        "url": "https://femern.com/press/news/the-first-element-of-the-fehmarnbelt-tunnel-successfully-immersed/",
        "publishedAt": "2026-05-07",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Bekræfter, at det første af 89 tunnelelementer er nedsænket og forbundet med den danske portal."
      },
      {
        "id": "femern-fourth",
        "title": "Femern Bælt-tunnelen nærmer sig den første kilometer",
        "publisher": "Femern A/S",
        "url": "https://femern.com/da/presse/nyheder/nedsaenkning4/",
        "publishedAt": "2026-09-28",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Fire standardelementer er på plads. Første specialelement er næste trin og var forventet i efteråret."
      },
      {
        "id": "femern-restart",
        "title": "Entreprenør på Femern Bælt-projektet genoptager arbejdet efter cyberangreb",
        "publisher": "Femern A/S",
        "url": "https://femern.com/da/presse/nyheder/entreprenor-pa-femern-baelt-projektet-genoptager-arbejdet-efter-cyberangreb/",
        "publishedAt": "2026-10-16",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Bekræfter delvis genoptagelse af arbejdet og fortsatte IVY-test som forberedelse til specialelementet."
      }
    ],
    "updates": [
      {
        "id": "femern-1",
        "revision": 1,
        "kind": "development",
        "title": "Første tunnelelement er på havbunden",
        "change": "Projektet bekræfter den første nedsænkning og forbindelsen til tunnelens danske portal.",
        "whyItMatters": "Metoden er nu taget i brug i selve byggeriet.",
        "occurredAt": "2026-05-07",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "femern-first"
        ],
        "snapshot": {
          "status": "active",
          "answer": "Første standardelement er på plads. De øvrige elementer skal følge i de kommende år.",
          "openQuestions": [
            "Hvordan forløber de næste nedsænkninger?"
          ],
          "nextStep": {
            "label": "Flere tunnelelementer skal nedsænkes og forbindes.",
            "expectedAt": null,
            "sourceIds": [
              "femern-first"
            ]
          }
        }
      },
      {
        "id": "femern-2",
        "revision": 2,
        "kind": "development",
        "title": "Fire elementer er samlet",
        "change": "Knapt 900 meter tunnel er på plads. Næste element har en kælder til tekniske installationer.",
        "whyItMatters": "Specialelementet kræver en ny type nedsænkning.",
        "occurredAt": "2026-09-28",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "femern-fourth"
        ],
        "snapshot": {
          "status": "awaiting",
          "answer": "Fire standardelementer er nedsænket. Projektet forventer første specialelement i efteråret 2026.",
          "openQuestions": [
            "Hvornår gennemføres nedsænkningen af specialelementet?"
          ],
          "nextStep": {
            "label": "Første specialelement var varslet til efteråret 2026; ingen præcis dato.",
            "expectedAt": null,
            "sourceIds": [
              "femern-fourth"
            ]
          }
        }
      },
      {
        "id": "femern-3",
        "revision": 3,
        "kind": "development",
        "title": "Arbejdet genoptages efter driftsstop",
        "change": "Dele af arbejdet genoptages efter et it-angreb hos hovedentreprenøren. Test af IVY og forberedelser til specialelementet fortsætter.",
        "whyItMatters": "Næste nedsænkning afhænger fortsat af de tekniske forberedelser.",
        "occurredAt": "2026-10-16",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "femern-restart",
          "femern-fourth"
        ],
        "snapshot": {
          "status": "awaiting",
          "answer": "Fire standardelementer er dokumenteret på plads. Nedsænkningen af det første specialelement er endnu ikke bekræftet i de gennemgåede kilder.",
          "openQuestions": [
            "Hvornår bliver specialelementet nedsænket?",
            "Får driftsstoppet betydning for den videre tidsplan?"
          ],
          "nextStep": {
            "label": "Bekræftelse på første specialelements nedsænkning. Ingen præcis dato er bekræftet.",
            "expectedAt": null,
            "sourceIds": [
              "femern-restart"
            ]
          }
        }
      }
    ],
    "monitoring": {
      "sourceUrls": [
        "https://femern.com/da/presse/nyheder/",
        "https://femern.com/da/presse/nyheder/nedsaenkning4/"
      ],
      "keywords": [
        "Femern",
        "specialelement",
        "IVY",
        "nedsænkning"
      ],
      "reviewEveryHours": 24
    },
    "lastCheck": {
      "checkedAt": "2026-11-11T14:06:56Z",
      "status": "checked",
      "note": "Projektets meddelelser er gennemgået. Den seneste anvendte udvikling er fra 16. oktober; en afsluttet nedsænkning af specialelementet er ikke dokumenteret her.",
      "sourceIds": [
        "femern-first",
        "femern-fourth",
        "femern-restart"
      ]
    }
  },
  {
    "id": "lynetteholm-kyst",
    "question": "Hvornår åbner Lynetteholms første offentlige kystområde?",
    "description": "Fra jordopfyld og stendæmning til et kystområde, københavnerne kan bruge.",
    "topics": [
      "samfund",
      "klima"
    ],
    "region": "koebenhavn",
    "scope": "local",
    "imageKey": "city",
    "sources": [
      {
        "id": "lynetteholm-soil",
        "title": "Jordtransport til Lynetteholm",
        "publisher": "By & Havn",
        "url": "https://byoghavn.dk/lynetteholm/jordtransport-2/",
        "publishedAt": null,
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Oplyser, at jordmodtagelsen i fase 1 åbnede 29. juni 2023. Sidens ældre prognoser bruges ikke som aktuelle tidsplaner."
      },
      {
        "id": "lynetteholm-perimeter",
        "title": "Lynetteholm bliver til",
        "publisher": "By & Havn",
        "url": "https://byoghavn.dk/lynetteholm/anlaegsarbejdet/",
        "publishedAt": null,
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Oplyser, at perimeteren blev færdig i september 2026, og at første offentlige areal bliver en del af kystlandskabet."
      },
      {
        "id": "lynetteholm-contract",
        "title": "Nu skal de store bunker af jord i Nordhavn flyttes til Lynetteholm",
        "publisher": "By & Havn",
        "url": "https://byoghavn.dk/nu-skal-de-store-bunker-af-jord-i-nordhavn-flyttes-til-lynetteholm/",
        "publishedAt": "2026-11-04",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Kontrakt om godt 7,6 mio. ton jord er indgået. Sejlads ventes fra februar 2027 og første kystetape i 2029."
      }
    ],
    "updates": [
      {
        "id": "lynetteholm-1",
        "revision": 1,
        "kind": "background",
        "title": "Jordmodtagelsen begynder",
        "change": "Lynetteholms første fase åbner for jord fra byggepladser 29. juni 2023.",
        "whyItMatters": "Opfyldningen er en forudsætning for de kommende landarealer.",
        "occurredAt": "2023-06-29",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "lynetteholm-soil"
        ],
        "snapshot": {
          "status": "active",
          "answer": "Første fase modtager jord. Et offentligt kystområde er endnu ikke dokumenteret åbnet.",
          "openQuestions": [
            "Hvornår bliver de første arealer tilgængelige?"
          ],
          "nextStep": {
            "label": "Fortsat jordopfyldning og anlæg af resten af omkredsen.",
            "expectedAt": null,
            "sourceIds": [
              "lynetteholm-soil"
            ]
          }
        }
      },
      {
        "id": "lynetteholm-2",
        "revision": 2,
        "kind": "development",
        "title": "Omkredsen blev færdig i september 2026",
        "change": "By & Havn oplyser, at hele perimeteren nu er færdig. Kilden angiver måned, men ingen bestemt færdiggørelsesdag.",
        "whyItMatters": "Arbejdet går videre med opfyldningen inden for stendæmningen.",
        "occurredAt": null,
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "lynetteholm-perimeter"
        ],
        "snapshot": {
          "status": "active",
          "answer": "Stendæmningen er færdig. Det første offentlige område skal blive en mindre del af kystlandskabet.",
          "openQuestions": [
            "Hvornår kan kystområdet åbne?"
          ],
          "nextStep": {
            "label": "Planlægning og opfyldning af det første offentlige område.",
            "expectedAt": null,
            "sourceIds": [
              "lynetteholm-perimeter"
            ]
          }
        }
      },
      {
        "id": "lynetteholm-3",
        "revision": 3,
        "kind": "decision",
        "title": "Jordflytning bestilt; kystetape sigter mod 2029",
        "change": "By & Havn offentliggør en kontrakt om at flytte godt 7,6 mio. ton jord fra Nordhavn. Første kystetape ventes åbnet i 2029.",
        "whyItMatters": "Der er nu en konkret plan for jordtransporten og en forventning til offentlig adgang.",
        "occurredAt": "2026-11-04",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "lynetteholm-contract"
        ],
        "snapshot": {
          "status": "active",
          "answer": "Første offentlige kystetape på cirka otte hektar er planlagt til 2029. Jordsejladsen fra Nordhavn ventes at begynde i februar 2027.",
          "openQuestions": [
            "Holder planen for jordtransporten?",
            "Hvornår fastlægges en konkret åbningsdato?"
          ],
          "nextStep": {
            "label": "Jordsejlads fra Nordhavn forventes at begynde i februar 2027.",
            "expectedAt": null,
            "sourceIds": [
              "lynetteholm-contract"
            ]
          }
        }
      }
    ],
    "monitoring": {
      "sourceUrls": [
        "https://byoghavn.dk/lynetteholm/anlaegsarbejdet/",
        "https://byoghavn.dk/lynetteholm/"
      ],
      "keywords": [
        "Lynetteholm",
        "kystlandskab",
        "jordtransport",
        "åbning"
      ],
      "reviewEveryHours": 24
    },
    "lastCheck": {
      "checkedAt": "2026-11-11T14:06:56Z",
      "status": "checked",
      "note": "Aktuel anlægsstatus og meddelelsen fra 4. november er gennemgået. 2029 er en forventet åbning, ikke en gennemført milepæl.",
      "sourceIds": [
        "lynetteholm-soil",
        "lynetteholm-perimeter",
        "lynetteholm-contract"
      ]
    }
  },
  {
    "id": "metro-m5",
    "question": "Hvornår får M5 grønt lys til anlæg?",
    "description": "Miljøtilladelsen er givet. Vi følger Folketingets behandling og vejen frem mod byggeriet.",
    "topics": [
      "samfund"
    ],
    "region": "koebenhavn",
    "scope": "local",
    "imageKey": "mobility",
    "sources": [
      {
        "id": "m5-permit",
        "title": "Vigtig milepæl for M5: Miljøtilladelse udstedt",
        "publisher": "Metroselskabet",
        "url": "https://metroselskabet.dk/da/kontakt-og-presse/nyheder/vigtig-milepael-for-m5-miljoetilladelse-udstedt/",
        "publishedAt": "2025-11-13",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Bekræfter miljøtilladelse til første etape. Anlægsloven er fortsat et nødvendigt næste skridt."
      },
      {
        "id": "m5-bill",
        "title": "Anlægslov for metrolinje M5 fremsat i Folketinget",
        "publisher": "Metroselskabet",
        "url": "https://metroselskabet.dk/da/kontakt-og-presse/nyheder/anlaegslov-for-metrolinje-m5-fremsat-i-folketinget/",
        "publishedAt": "2026-10-07",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Lovforslaget er fremsat. Forventningerne er vedtagelse ultimo 2026 og første etapes åbning i 2036."
      },
      {
        "id": "m5-parliament",
        "title": "L 20, 2026–27: Anlæg af metrolinje M5 m.v.",
        "publisher": "Folketinget",
        "url": "https://www.ft.dk/samling/20261/lovforslag/l20/index.htm",
        "publishedAt": null,
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Status er Fremsat. Oversigten angiver førstebehandling 11. november 2026 og foreslået ikrafttræden 1. januar 2027."
      }
    ],
    "updates": [
      {
        "id": "m5-1",
        "revision": 1,
        "kind": "decision",
        "title": "Miljøtilladelsen er udstedt",
        "change": "Københavns Borgerrepræsentation godkender miljøtilladelsen til M5's første etape.",
        "whyItMatters": "Projektet kan gå videre mod den nødvendige anlægslov.",
        "occurredAt": "2025-11-13",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "m5-permit"
        ],
        "snapshot": {
          "status": "awaiting",
          "answer": "Miljøtilladelsen er givet. Folketingets anlægslov udestår.",
          "openQuestions": [
            "Hvornår bliver anlægsloven behandlet?"
          ],
          "nextStep": {
            "label": "Folketingets behandling af anlægsloven.",
            "expectedAt": null,
            "sourceIds": [
              "m5-permit"
            ]
          }
        }
      },
      {
        "id": "m5-2",
        "revision": 2,
        "kind": "decision",
        "title": "Regeringen fremsætter anlægsloven",
        "change": "Lovforslaget fremsættes 7. oktober. Metroselskabet forventer vedtagelse inden årets udgang.",
        "whyItMatters": "Sagen er gået fra forberedelse til parlamentarisk behandling.",
        "occurredAt": "2026-10-07",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "m5-bill"
        ],
        "snapshot": {
          "status": "active",
          "answer": "Anlægsloven er fremsat. Den forventes at træde i kraft i begyndelsen af 2027, hvis Folketinget vedtager den.",
          "openQuestions": [
            "Vedtages forslaget, og ændres det under behandlingen?"
          ],
          "nextStep": {
            "label": "Folketingets behandling i efteråret 2026.",
            "expectedAt": null,
            "sourceIds": [
              "m5-bill"
            ]
          }
        }
      },
      {
        "id": "m5-3",
        "revision": 3,
        "kind": "schedule",
        "title": "Førstebehandling står på dagsordenen",
        "change": "Folketingets aktuelle oversigt angiver førstebehandling 11. november 2026 og har fortsat status Fremsat.",
        "whyItMatters": "En dagsordensdato dokumenterer ikke, at forslaget er vedtaget.",
        "occurredAt": null,
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "m5-parliament",
          "m5-bill"
        ],
        "snapshot": {
          "status": "awaiting",
          "answer": "Førstebehandling er sat til 11. november. En endelig vedtagelse er endnu ikke dokumenteret i oversigten. Første etapes åbning er planlagt til 2036.",
          "openQuestions": [
            "Hvad bliver udfaldet af behandlingen?",
            "Bliver den foreslåede ikrafttræden 1. januar 2027 fastholdt?"
          ],
          "nextStep": {
            "label": "Kontrollér udfaldet af førstebehandlingen, der er sat til 11. november 2026.",
            "expectedAt": "2026-11-11",
            "sourceIds": [
              "m5-parliament"
            ]
          }
        }
      }
    ],
    "monitoring": {
      "sourceUrls": [
        "https://www.ft.dk/samling/20261/lovforslag/l20/index.htm",
        "https://metroselskabet.dk/da/projekter-og-udvikling/igangvaerende-projekter/m5/"
      ],
      "keywords": [
        "M5",
        "L 20",
        "anlægslov",
        "førstebehandling"
      ],
      "reviewEveryHours": 24
    },
    "lastCheck": {
      "checkedAt": "2026-11-11T14:06:56Z",
      "status": "checked",
      "note": "Folketingets statusoversigt er kontrolleret. Førstebehandlingen står som planlagt til 11. november; resultatet er ikke lagt til grund som gennemført.",
      "sourceIds": [
        "m5-permit",
        "m5-bill",
        "m5-parliament"
      ]
    }
  },
  {
    "id": "bornholm-elnet",
    "question": "Bliver Bornholms elnet koblet til energiøen?",
    "description": "Vi følger den lokale elforbindelse fra politisk aftale til anlæg.",
    "topics": [
      "klima",
      "samfund",
      "teknologi"
    ],
    "region": "danmark",
    "scope": "national",
    "imageKey": "climate",
    "sources": [
      {
        "id": "bornholm-germany",
        "title": "Danmark indgår aftale med Tyskland om Energiø Bornholm",
        "publisher": "Klima-, Energi- og Forsyningsministeriet",
        "url": "https://www.kefm.dk/aktuelt/nyheder/2026/jan/danmark-indgaar-aftale-med-tyskland-om-energioe-bornholm",
        "publishedAt": "2026-01-26",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Danmark og Tyskland aftaler fordelingen af støtteomkostninger. Dansk politisk opbakning og udbud udestår i meddelelsen."
      },
      {
        "id": "bornholm-agreement",
        "title": "Bred politisk aftale om Energiø Bornholm",
        "publisher": "Klima-, Energi- og Forsyningsministeriet",
        "url": "https://www.kefm.dk/aktuelt/nyheder/2026/feb/bred-politisk-aftale-om-energioe-bornholm",
        "publishedAt": "2026-02-03",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Politisk aftale om realisering og 330 mio. kroner til at koble Bornholms lokale elnet til projektet."
      },
      {
        "id": "bornholm-approval",
        "title": "Bornholm et skridt tættere på strøm fra Energiø Bornholm",
        "publisher": "Energinet via Via Ritzau",
        "url": "https://api.via.ritzau.dk/pressemeddelelse/15246574/bornholm-et-skridt-taettere-pa-strom-fra-energio-bornholm?publisherId=10304728",
        "publishedAt": "2026-10-26",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Ministeriet har godkendt tilslutningsprojektet. Tre transformere indgår; anlægsarbejder forventes at begynde i 2027."
      }
    ],
    "updates": [
      {
        "id": "bornholm-1",
        "revision": 1,
        "kind": "decision",
        "title": "Danmark og Tyskland aftaler omkostningsdeling",
        "change": "De to lande bliver enige om fordelingen af støtteomkostninger til havvinden ved Energiø Bornholm.",
        "whyItMatters": "Aftalen skaber et politisk grundlag for at føre projektet videre.",
        "occurredAt": "2026-01-26",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "bornholm-germany"
        ],
        "snapshot": {
          "status": "active",
          "answer": "Den dansk-tyske aftale er indgået. Dansk politisk opbakning og det videre udbud skal følge.",
          "openQuestions": [
            "Får aftalen opbakning i Danmark?"
          ],
          "nextStep": {
            "label": "Ministeriet vil søge opbakning hos partierne bag energiøen.",
            "expectedAt": null,
            "sourceIds": [
              "bornholm-germany"
            ]
          }
        }
      },
      {
        "id": "bornholm-2",
        "revision": 2,
        "kind": "decision",
        "title": "Lokal tilslutning bliver del af aftalen",
        "change": "Et politisk flertal beslutter at realisere energiøen og afsætter 330 mio. kroner til Bornholms tilslutning.",
        "whyItMatters": "Bornholms eget elnet er nu en udtrykkelig del af planen.",
        "occurredAt": "2026-02-03",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "bornholm-agreement"
        ],
        "snapshot": {
          "status": "active",
          "answer": "Tilslutningen er politisk aftalt og har en statslig finansieringsramme. Anlæggene skal stadig realiseres.",
          "openQuestions": [
            "Hvordan gennemføres den tekniske tilslutning?"
          ],
          "nextStep": {
            "label": "Planlægning og godkendelser for det lokale tilslutningsprojekt.",
            "expectedAt": null,
            "sourceIds": [
              "bornholm-agreement"
            ]
          }
        }
      },
      {
        "id": "bornholm-3",
        "revision": 3,
        "kind": "decision",
        "title": "Tilslutningsprojektet er godkendt",
        "change": "Ministeriet godkender projektet, som skal forbinde Bornholms elnet med energiøen. Energinet og TREFOR fortsætter forberedelserne.",
        "whyItMatters": "Projektet er rykket fra politisk aftale til konkret godkendelse.",
        "occurredAt": "2026-10-26",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "bornholm-approval"
        ],
        "snapshot": {
          "status": "active",
          "answer": "Tilslutningsprojektet er godkendt. Anlægsarbejder ventes at begynde i 2027; forbindelsen er endnu under forberedelse.",
          "openQuestions": [
            "Hvornår begynder anlægsarbejdet?",
            "Hvornår kan den færdige forbindelse tages i brug?"
          ],
          "nextStep": {
            "label": "Forberedelser og myndighedsprocesser frem mod forventet anlægsstart i 2027.",
            "expectedAt": null,
            "sourceIds": [
              "bornholm-approval"
            ]
          }
        }
      }
    ],
    "monitoring": {
      "sourceUrls": [
        "https://www.kefm.dk/aktuelt/nyheder/2026/feb/bred-politisk-aftale-om-energioe-bornholm",
        "https://api.via.ritzau.dk/pressemeddelelse/15246574/bornholm-et-skridt-taettere-pa-strom-fra-energio-bornholm?publisherId=10304728"
      ],
      "keywords": [
        "Energiø Bornholm",
        "tilslutning",
        "TREFOR",
        "transformere"
      ],
      "reviewEveryHours": 24
    },
    "lastCheck": {
      "checkedAt": "2026-11-11T14:06:56Z",
      "status": "checked",
      "note": "Ministeriets aftaler og Energinets meddelelse fra 26. oktober er gennemgået. Godkendelse og fysisk idriftsættelse holdes adskilt.",
      "sourceIds": [
        "bornholm-germany",
        "bornholm-agreement",
        "bornholm-approval"
      ]
    }
  },
  {
    "id": "plasttraktat",
    "question": "Kan landene blive enige om en global plasttraktat?",
    "description": "Forhandlingerne fortsætter efter manglende enighed. Vi følger tekst, kompromiser og næste møde.",
    "topics": [
      "klima",
      "samfund"
    ],
    "region": "verden",
    "scope": "global",
    "imageKey": "climate",
    "sources": [
      {
        "id": "plastic-geneva",
        "title": "Talks on global plastic pollution treaty adjourn without consensus",
        "publisher": "UNEP",
        "url": "https://www.unep.org/en/inc-plastic-pollution/inc-media",
        "publishedAt": "2025-08-15",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Den daterede meddelelse beskriver afslutningen af INC-5.2 uden enighed om en traktattekst."
      },
      {
        "id": "plastic-chair",
        "title": "New Chair elected to lead negotiations on global plastic pollution treaty",
        "publisher": "UNEP",
        "url": "https://www.unep.org/en/inc-plastic-pollution/inc-media",
        "publishedAt": "2026-02-07",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Julio Cordano vælges som formand. INC-5.3 behandler organisation og valg; der forhandles ikke om substansen."
      },
      {
        "id": "plastic-letter",
        "title": "Fifth letter from the Chair of the INC on Plastic Pollution",
        "publisher": "UNEP / INC-formanden",
        "url": "https://wedocs.unep.org/bitstreams/36fab671-c95e-4caa-9a0b-5bb6f555db68/download",
        "publishedAt": "2026-11-02",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Selve brevet er dateret 2. november. Alle artikler er åbne; revideret tekst varsles i november og møde i Nairobi 28.–30. januar 2027."
      }
    ],
    "updates": [
      {
        "id": "plastic-1",
        "revision": 1,
        "kind": "development",
        "title": "Genève slutter uden enighed",
        "change": "INC-5.2 afsluttes uden konsensus om en traktattekst. Landene vil fortsætte processen.",
        "whyItMatters": "Det planlagte gennembrud bliver udskudt.",
        "occurredAt": "2025-08-15",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "plastic-geneva"
        ],
        "snapshot": {
          "status": "awaiting",
          "answer": "Der er ingen fælles traktattekst efter mødet i Genève.",
          "openQuestions": [
            "Hvor kan landene finde et kompromis?"
          ],
          "nextStep": {
            "label": "En ny forhandlingsrunde skal fastlægges.",
            "expectedAt": null,
            "sourceIds": [
              "plastic-geneva"
            ]
          }
        }
      },
      {
        "id": "plastic-2",
        "revision": 2,
        "kind": "decision",
        "title": "Ny formand, stadig ingen substansforhandling",
        "change": "Julio Cordano bliver valgt som formand. Det korte INC-5.3-møde bruges til organisatoriske spørgsmål.",
        "whyItMatters": "Processen får ny ledelse, mens uenighederne om indholdet består.",
        "occurredAt": "2026-02-07",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "plastic-chair"
        ],
        "snapshot": {
          "status": "awaiting",
          "answer": "Forhandlingsprocessen har en ny formand. Mødet har ikke afgjort traktatens indhold.",
          "openQuestions": [
            "Hvordan bringes forhandlingerne videre?"
          ],
          "nextStep": {
            "label": "Forberedelse af den næste substansforhandling.",
            "expectedAt": null,
            "sourceIds": [
              "plastic-chair"
            ]
          }
        }
      },
      {
        "id": "plastic-3",
        "revision": 3,
        "kind": "schedule",
        "title": "Ny tekst og januarmøde skal føre sagen videre",
        "change": "Formandens brev varsler en revideret forhandlingstekst i november og et uformelt delegationsmøde i Nairobi 28.–30. januar 2027.",
        "whyItMatters": "Der er en videre arbejdsplan, men alle artikler er fortsat åbne.",
        "occurredAt": "2026-11-02",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "plastic-letter"
        ],
        "snapshot": {
          "status": "awaiting",
          "answer": "Traktaten er stadig under forhandling. Formanden søger kompromiser om blandt andet rækkevidde, beslutningsregler og finansiering.",
          "openQuestions": [
            "Kan landene samle sig om den reviderede tekst?",
            "Hvordan bliver de bindende forpligtelser udformet?"
          ],
          "nextStep": {
            "label": "Revideret tekst er varslet i november. Næste daterede møde er Nairobi 28.–30. januar 2027.",
            "expectedAt": "2027-01-28",
            "sourceIds": [
              "plastic-letter"
            ]
          }
        }
      }
    ],
    "monitoring": {
      "sourceUrls": [
        "https://www.unep.org/en/inc-plastic-pollution",
        "https://www.unep.org/en/inc-plastic-pollution/inc-media"
      ],
      "keywords": [
        "INC-5.4",
        "plastic pollution",
        "Aid to Negotiations",
        "Nairobi"
      ],
      "reviewEveryHours": 24
    },
    "lastCheck": {
      "checkedAt": "2026-11-11T14:06:56Z",
      "status": "checked",
      "note": "UNEPs mødemeddelelser og hele formandsbrevet er gennemgået. Brevets dato 2. november bruges; indekssiden viser 3. november.",
      "sourceIds": [
        "plastic-geneva",
        "plastic-chair",
        "plastic-letter"
      ]
    }
  },
  {
    "id": "cop31-resultater",
    "question": "Hvilke konkrete beslutninger kommer der ud af COP31?",
    "description": "Vi følger klimamødet i Antalya fra statusrapporter til forhandlingernes resultat.",
    "topics": [
      "klima",
      "samfund"
    ],
    "region": "verden",
    "scope": "global",
    "imageKey": "climate",
    "sources": [
      {
        "id": "cop31-reports",
        "title": "UN Climate Change reports show Paris Agreement supporting whole-of-economy approaches, but progress still clearly insufficient",
        "publisher": "UNFCCC",
        "url": "https://unfccc.int/news/un-climate-change-reports-show-paris-agreement-supporting-whole-of-economy-approaches-but-progress",
        "publishedAt": "2026-10-27",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Tre rapporter beskriver fremskridt og betydelige gennemførelsesgab. COP31 varsles til 9.–20. november."
      },
      {
        "id": "cop31-yearbook",
        "title": "COP 31 live updates archive: Yearbook of Global Climate Action 2026",
        "publisher": "UNFCCC",
        "url": "https://unfccc.int/fr/node/662425",
        "publishedAt": "2026-11-09",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Den daterede opdatering kl. 16 beskriver offentliggørelsen af årets statusbog og 44 indikatorer for klimaindsatsen."
      },
      {
        "id": "cop31-leaders",
        "title": "UN Climate Chief to world leaders in Antalya: The political costs of fossil fuel dependency are unforgiving",
        "publisher": "UNFCCC",
        "url": "https://unfccc.int/news/un-climate-chief-to-world-leaders-in-antalya-the-political-costs-of-fossil-fuel-dependency-are",
        "publishedAt": "2026-11-11",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Talen ved åbningen af verdenslederdelen prioriterer elektrificering, klimatilpasning og adgang til finansiering; den er ikke et slutdokument."
      },
      {
        "id": "cop31-calendar",
        "title": "UN Climate Change Conference – Antalya, November 2026",
        "publisher": "UNFCCC",
        "url": "https://unfccc.int/cop31",
        "publishedAt": null,
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Den officielle konferenceside angiver 9.–20. november 2026 og løbende opdateringer fra det igangværende møde."
      }
    ],
    "updates": [
      {
        "id": "cop31-1",
        "revision": 1,
        "kind": "background",
        "title": "FN gør status før forhandlingerne",
        "change": "UNFCCC offentliggør tre rapporter, som viser bredere klimaplanlægning, men utilstrækkelige samlede fremskridt.",
        "whyItMatters": "Rapporterne sætter gennemførelsen af eksisterende løfter på dagsordenen.",
        "occurredAt": "2026-10-27",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "cop31-reports"
        ],
        "snapshot": {
          "status": "awaiting",
          "answer": "Mødet skal blandt andet behandle, hvordan klimaplaner omsættes til handling.",
          "openQuestions": [
            "Hvilke beslutninger kan mindske gennemførelsesgabet?"
          ],
          "nextStep": {
            "label": "COP31 er planlagt til at begynde i Antalya 9. november 2026.",
            "expectedAt": "2026-11-09",
            "sourceIds": [
              "cop31-reports"
            ]
          }
        }
      },
      {
        "id": "cop31-2",
        "revision": 2,
        "kind": "development",
        "title": "Ny statusbog offentliggøres på åbningsdagen",
        "change": "UNFCCC lancerer årets oversigt over klimaindsatser fra blandt andet byer, virksomheder og civilsamfund.",
        "whyItMatters": "Den dokumenterer arbejde uden for staternes forhandlingsspor.",
        "occurredAt": "2026-11-09",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "cop31-yearbook",
          "cop31-calendar"
        ],
        "snapshot": {
          "status": "active",
          "answer": "COP31 er i gang. Statusbogen er offentliggjort; forhandlingerne fortsætter.",
          "openQuestions": [
            "Hvilke tiltag bliver fulgt af nye aftaler?"
          ],
          "nextStep": {
            "label": "Konferencen fortsætter frem mod planlagt afslutning 20. november.",
            "expectedAt": "2026-11-20",
            "sourceIds": [
              "cop31-calendar"
            ]
          }
        }
      },
      {
        "id": "cop31-3",
        "revision": 3,
        "kind": "development",
        "title": "Verdenslederdelen åbner",
        "change": "Ved åbningen 11. november fremhæver FN's klimachef elektrificering, klimatilpasning og bedre adgang til finansiering.",
        "whyItMatters": "Prioriteterne viser, hvad den næste forhandlingsfase skal omsætte til resultater.",
        "occurredAt": "2026-11-11",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "cop31-leaders",
          "cop31-calendar"
        ],
        "snapshot": {
          "status": "active",
          "answer": "Verdenslederdelen er åbnet. De gennemgåede kilder beskriver prioriteter og krav; et samlet slutresultat er endnu ikke dokumenteret.",
          "openQuestions": [
            "Hvilke konkrete beslutninger vedtages?",
            "Hvordan følges beslutningerne op efter konferencen?"
          ],
          "nextStep": {
            "label": "Gennemgå vedtagne beslutninger ved den planlagte afslutning 20. november.",
            "expectedAt": "2026-11-20",
            "sourceIds": [
              "cop31-calendar"
            ]
          }
        }
      }
    ],
    "monitoring": {
      "sourceUrls": [
        "https://unfccc.int/cop31",
        "https://unfccc.int/fr/node/662425"
      ],
      "keywords": [
        "COP31",
        "Antalya",
        "decision",
        "outcome",
        "adopted"
      ],
      "reviewEveryHours": 24
    },
    "lastCheck": {
      "checkedAt": "2026-11-11T14:06:56Z",
      "status": "checked",
      "note": "Konferencesiden, de daterede rapporter og talen fra 11. november er gennemgået. Taler og lancerede rapporter behandles ikke som vedtagne forhandlingsresultater.",
      "sourceIds": [
        "cop31-reports",
        "cop31-yearbook",
        "cop31-leaders",
        "cop31-calendar"
      ]
    }
  },
  {
    "id": "eu-faelles-oplader",
    "question": "Er laptops nu omfattet af EU's fælles opladerregler?",
    "description": "Et afgrænset spørgsmål om, hvornår reglerne begynder at gælde.",
    "topics": [
      "teknologi",
      "klima",
      "samfund"
    ],
    "region": "europa",
    "scope": "global",
    "imageKey": "city",
    "sources": [
      {
        "id": "charger-adoption",
        "title": "Common charger: EU ministers give final approval to one-size-fits-all charging port",
        "publisher": "Rådet for Den Europæiske Union",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2022/10/24/common-charger-eu-ministers-give-final-approval-to-one-size-fits-all-charging-port/",
        "publishedAt": "2022-10-24",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Bekræfter den endelige vedtagelse og den længere overgangsperiode for laptops."
      },
      {
        "id": "charger-current",
        "title": "The EU common charger",
        "publisher": "Europa-Kommissionen",
        "url": "https://single-market-economy.ec.europa.eu/sectors/electrical-and-electronic-engineering-industries-eei/radio-equipment-directive-red/one-common-charging-solution-all_en",
        "publishedAt": null,
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Bekræfter, at de første produktgrupper blev omfattet 28. december 2024, og at kravene gælder laptops siden 28. april 2026."
      }
    ],
    "updates": [
      {
        "id": "charger-1",
        "revision": 1,
        "kind": "decision",
        "title": "Direktivet bliver endeligt vedtaget",
        "change": "EU's ministerråd godkender fælles opladerregler med en længere overgangsperiode for laptops.",
        "whyItMatters": "Reglernes anvendelse bliver en tidsbestemt proces.",
        "occurredAt": "2022-10-24",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "charger-adoption"
        ],
        "snapshot": {
          "status": "awaiting",
          "answer": "Direktivet er vedtaget. Laptops bliver omfattet efter en særskilt overgangsperiode.",
          "openQuestions": [
            "Hvornår begynder laptopkravene at gælde?"
          ],
          "nextStep": {
            "label": "Reglerne skal træde i kraft, hvorefter overgangsperioderne løber.",
            "expectedAt": null,
            "sourceIds": [
              "charger-adoption"
            ]
          }
        }
      },
      {
        "id": "charger-2",
        "revision": 2,
        "kind": "development",
        "title": "Første produktgrupper bliver omfattet",
        "change": "Kravene begynder at gælde blandt andet mobiltelefoner og tablets 28. december 2024.",
        "whyItMatters": "Laptopdelen har fortsat en senere startdato.",
        "occurredAt": "2024-12-28",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "charger-current"
        ],
        "snapshot": {
          "status": "awaiting",
          "answer": "Den første del af ordningen gælder. Laptopkravene er sat til 28. april 2026.",
          "openQuestions": [
            "Begynder laptopdelen som fastlagt?"
          ],
          "nextStep": {
            "label": "Kravene skal omfatte laptops fra 28. april 2026.",
            "expectedAt": "2026-04-28",
            "sourceIds": [
              "charger-current"
            ]
          }
        }
      },
      {
        "id": "charger-3",
        "revision": 3,
        "kind": "resolution",
        "title": "Laptopkravene er begyndt at gælde",
        "change": "Kommissionens aktuelle oversigt bekræfter, at laptops er omfattet siden 28. april 2026.",
        "whyItMatters": "Det afgrænsede spørgsmål om anvendelsesdatoen er besvaret.",
        "occurredAt": "2026-04-28",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "charger-current"
        ],
        "snapshot": {
          "status": "resolved",
          "answer": "Ja. EU's fælles opladerkrav gælder også laptops fra 28. april 2026, herunder USB-C som fælles opladningsport.",
          "openQuestions": [],
          "nextStep": {
            "label": "Spørgsmålet om anvendelsesdatoen er afklaret.",
            "expectedAt": null,
            "sourceIds": [
              "charger-current"
            ]
          }
        }
      }
    ],
    "monitoring": {
      "sourceUrls": [
        "https://single-market-economy.ec.europa.eu/sectors/electrical-and-electronic-engineering-industries-eei/radio-equipment-directive-red/one-common-charging-solution-all_en"
      ],
      "keywords": [
        "common charger",
        "laptops",
        "28 April 2026"
      ],
      "reviewEveryHours": 24
    },
    "lastCheck": {
      "checkedAt": "2026-11-11T14:06:56Z",
      "status": "checked",
      "note": "Kommissionens aktuelle statusside bekræfter anvendelsesdatoen. Afklaringen gælder dette spørgsmål; den måler ikke ordningens miljøeffekt.",
      "sourceIds": [
        "charger-adoption",
        "charger-current"
      ]
    }
  },
  {
    "id": "elt-foerste-lys",
    "question": "Hvornår bliver ELT klar til videnskabelige observationer?",
    "description": "Vi følger bygningen af ESO's store teleskop og skelner mellem test og videnskabelig drift.",
    "topics": [
      "videnskab",
      "teknologi"
    ],
    "region": "verden",
    "scope": "global",
    "imageKey": "city",
    "sources": [
      {
        "id": "elt-schedule",
        "title": "Telescope first light for ESO's Extremely Large Telescope now planned for March 2029",
        "publisher": "ESO",
        "url": "https://www.eso.org/public/announcements/ann25001/",
        "publishedAt": "2025-03-14",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Revideret plan: testobservationer i marts 2029 og første observationer med videnskabelige instrumenter i december 2030."
      },
      {
        "id": "elt-dome",
        "title": "Celebrations held as dome of ESO's Extremely Large Telescope reaches its peak",
        "publisher": "ESO",
        "url": "https://www.eso.org/public/announcements/ann25002/",
        "publishedAt": "2025-04-16",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Kuppelkonstruktionen har nået sit højeste punkt, og projektet er passeret 60 procent færdiggørelse."
      },
      {
        "id": "elt-mirrors",
        "title": "More than half of the ELT's giant mirror is now in Chile",
        "publisher": "ESO",
        "url": "https://www.eso.org/public/announcements/ann26009/",
        "publishedAt": "2026-10-14",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Næsten 500 spejlsegmenter er ankommet, projektet er over 75 procent færdigt, og videnskabelige observationer er planlagt til slutningen af 2030."
      }
    ],
    "updates": [
      {
        "id": "elt-1",
        "revision": 1,
        "kind": "schedule",
        "title": "Første videnskabelige observationer flyttes til 2030",
        "change": "ESO reviderer tidsplanen efter forsinkelser. Testobservationer ventes i marts 2029 og videnskabelige observationer i december 2030.",
        "whyItMatters": "Test af teleskopet og brugen af de første instrumenter har forskellige milepæle.",
        "occurredAt": "2025-03-14",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "elt-schedule"
        ],
        "snapshot": {
          "status": "active",
          "answer": "Videnskabelige observationer er planlagt til december 2030 efter test og idriftsættelse.",
          "openQuestions": [
            "Holder den reviderede bygge- og instrumentplan?"
          ],
          "nextStep": {
            "label": "Testobservationer ventes i marts 2029; videnskabelig første observation i december 2030.",
            "expectedAt": null,
            "sourceIds": [
              "elt-schedule"
            ]
          }
        }
      },
      {
        "id": "elt-2",
        "revision": 2,
        "kind": "development",
        "title": "Kuppelen når sit højeste punkt",
        "change": "ESO markerer kuplens højeste punkt. Det samlede projekt har passeret 60 procent.",
        "whyItMatters": "Byggeriet går frem, mens færdiggørelse og idriftsættelse stadig udestår.",
        "occurredAt": "2025-04-16",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "elt-dome",
          "elt-schedule"
        ],
        "snapshot": {
          "status": "active",
          "answer": "Kuppelkonstruktionen har nået toppen. Målet for første videnskabelige observationer er fortsat december 2030.",
          "openQuestions": [
            "Hvordan forløber den resterende samling?"
          ],
          "nextStep": {
            "label": "Kuppel, teleskop og instrumenter skal færdiggøres og testes.",
            "expectedAt": null,
            "sourceIds": [
              "elt-dome",
              "elt-schedule"
            ]
          }
        }
      },
      {
        "id": "elt-3",
        "revision": 3,
        "kind": "development",
        "title": "Over halvdelen af spejlsegmenterne er i Chile",
        "change": "Næsten 500 segmenter er ankommet. ESO oplyser, at projektet er over 75 procent færdigt.",
        "whyItMatters": "Leverancerne bringer samlingen af det store hovedspejl nærmere.",
        "occurredAt": "2026-10-14",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "elt-mirrors"
        ],
        "snapshot": {
          "status": "active",
          "answer": "ELT er over 75 procent færdigt ifølge ESO. Første videnskabelige observationer er fortsat planlagt til slutningen af 2030.",
          "openQuestions": [
            "Ankommer de resterende segmenter som ventet?",
            "Holder tidsplanen for samling og idriftsættelse?"
          ],
          "nextStep": {
            "label": "Alle hovedspejlets segmenter ventes at være i Chile i de kommende måneder.",
            "expectedAt": null,
            "sourceIds": [
              "elt-mirrors"
            ]
          }
        }
      }
    ],
    "monitoring": {
      "sourceUrls": [
        "https://www.eso.org/public/announcements/",
        "https://elt.eso.org/about/timeline/"
      ],
      "keywords": [
        "ELT",
        "first light",
        "mirror segments",
        "2030"
      ],
      "reviewEveryHours": 24
    },
    "lastCheck": {
      "checkedAt": "2026-11-11T14:06:56Z",
      "status": "checked",
      "note": "ESO's daterede byggemeddelelser er gennemgået. Første videnskabelige observation er et fremtidigt mål; ankomne spejldele er en gennemført leverance.",
      "sourceIds": [
        "elt-schedule",
        "elt-dome",
        "elt-mirrors"
      ]
    }
  },
  {
    "id": "euclid-data",
    "question": "Hvornår bliver Euclids første store datasæt frigivet?",
    "description": "Vi følger teleskopets dataudgivelser fra prøvefelter til den brede kortlægning.",
    "topics": [
      "videnskab",
      "teknologi"
    ],
    "region": "europa",
    "scope": "global",
    "imageKey": "city",
    "sources": [
      {
        "id": "euclid-q1",
        "title": "Euclid opens data treasure trove, offers glimpse of deep fields",
        "publisher": "ESA",
        "url": "https://www.esa.int/articles/about-us/directorates/science/euclid/euclid-opens-data-treasure-trove-offers-glimpse-of-deep-fields",
        "publishedAt": "2025-03-19",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Første portion surveydata offentliggøres med prøvefelter og galakseklassifikationer."
      },
      {
        "id": "euclid-q2",
        "title": "ESA's Euclid captures the Milky Way's crowded heart",
        "publisher": "ESA",
        "url": "https://www.esa.int/media/esa-s-euclid-captures-the-milky-way-s-crowded-heart",
        "publishedAt": "2026-06-24",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "ESA offentliggør et billede af Mælkevejens centrale område med mere end 60 millioner stjerner."
      },
      {
        "id": "euclid-timeline",
        "title": "Euclid Data Release Timeline",
        "publisher": "Euclid NASA Science Center / Caltech-IPAC",
        "url": "https://euclid.caltech.edu/page/data-release-timeline",
        "publishedAt": null,
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Angiver Q2 som frigivet 24. juni 2026; DR1 Foundation er planlagt til 12. november 2026 og DR1 Complete til midten af 2027."
      }
    ],
    "updates": [
      {
        "id": "euclid-1",
        "revision": 1,
        "kind": "development",
        "title": "De første surveydata bliver offentlige",
        "change": "ESA frigiver den første portion data fra Euclids kortlægning med blandt andet tre dybe prøvefelter.",
        "whyItMatters": "Forskere kan begynde at arbejde med en tidlig del af observationerne.",
        "occurredAt": "2025-03-19",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "euclid-q1"
        ],
        "snapshot": {
          "status": "active",
          "answer": "En første portion surveydata er frigivet. Den brede kortlægning fortsætter.",
          "openQuestions": [
            "Hvornår kommer den første store dataudgivelse?"
          ],
          "nextStep": {
            "label": "Fortsatte observationer og forberedelse af større dataudgivelser.",
            "expectedAt": null,
            "sourceIds": [
              "euclid-q1"
            ]
          }
        }
      },
      {
        "id": "euclid-2",
        "revision": 2,
        "kind": "development",
        "title": "Mælkevejens tætte centrum bliver synligt",
        "change": "ESA offentliggør Euclids detaljerede billede af Mælkevejens centrale område med over 60 millioner stjerner.",
        "whyItMatters": "Udgivelsen giver et nyt datasæt til studier af vores egen galakse.",
        "occurredAt": "2026-06-24",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "euclid-q2"
        ],
        "snapshot": {
          "status": "active",
          "answer": "En særskilt udgivelse viser Mælkevejens centrum. Den brede dataudgivelse udestår.",
          "openQuestions": [
            "Hvornår offentliggøres det større survey-datasæt?"
          ],
          "nextStep": {
            "label": "Den første store dataudgivelse skal offentliggøres.",
            "expectedAt": null,
            "sourceIds": [
              "euclid-q2"
            ]
          }
        }
      },
      {
        "id": "euclid-3",
        "revision": 3,
        "kind": "schedule",
        "title": "DR1 er planlagt i to udgivelser",
        "change": "NASA/IPACs aktuelle tidsplan angiver DR1 Foundation til 12. november 2026 og DR1 Complete til midten af 2027.",
        "whyItMatters": "Den første frigivelse og den komplette udgave skal følges hver for sig.",
        "occurredAt": null,
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "euclid-timeline"
        ],
        "snapshot": {
          "status": "awaiting",
          "answer": "DR1 Foundation er planlagt til 12. november 2026. DR1 Complete ventes i midten af 2027; frigivelserne er endnu ikke bekræftet gennemført.",
          "openQuestions": [
            "Bliver Foundation frigivet som planlagt?",
            "Holder tidsplanen for den komplette udgave?"
          ],
          "nextStep": {
            "label": "Planlagt offentliggørelse af DR1 Foundation 12. november 2026.",
            "expectedAt": "2026-11-12",
            "sourceIds": [
              "euclid-timeline"
            ]
          }
        }
      }
    ],
    "monitoring": {
      "sourceUrls": [
        "https://euclid.caltech.edu/page/data-release-timeline",
        "https://www.esa.int/Science_Exploration/Space_Science/Euclid"
      ],
      "keywords": [
        "Euclid",
        "DR1",
        "Foundation",
        "Complete",
        "data release"
      ],
      "reviewEveryHours": 24
    },
    "lastCheck": {
      "checkedAt": "2026-11-11T14:06:56Z",
      "status": "partial",
      "note": "ESA-artikler og NASA/IPAC's aktuelle tidsplan er gennemgået. ESA Cosmos-tidsplanen kunne ikke hentes; udgivelsesdatoerne er kontrolleret hos NASA/IPAC.",
      "sourceIds": [
        "euclid-q1",
        "euclid-q2",
        "euclid-timeline"
      ]
    }
  },
  {
    "id": "hera-dimorphos",
    "question": "Hvad ændrede DART-nedslaget på Dimorphos' overflade?",
    "description": "Hera skal undersøge eftervirkningerne af det kontrollerede asteroidenedslag i 2022.",
    "topics": [
      "videnskab",
      "teknologi"
    ],
    "region": "europa",
    "scope": "global",
    "imageKey": "mobility",
    "sources": [
      {
        "id": "hera-launch",
        "title": "Hera asteroid mission – launch highlights",
        "publisher": "ESA",
        "url": "https://www.esa.int/media/hera-asteroid-mission-launch-highlights",
        "publishedAt": "2024-10-07",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Bekræfter opsendelsen 7. oktober 2024 og missionens mål om at undersøge Didymos og Dimorphos."
      },
      {
        "id": "hera-arrival-plan",
        "title": "ESA's Hera targets early arrival at Didymos asteroids",
        "publisher": "ESA",
        "url": "https://www.esa.int/articles/about-us/directorates/operations/space-safety/hera/esa-s-hera-targets-early-arrival-at-didymos-asteroids",
        "publishedAt": "2025-10-07",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Ankomstmålet rykkes en måned frem til november 2026 efter god ydeevne. Mars-passagen i marts 2025 er gennemført."
      },
      {
        "id": "hera-mysteries",
        "title": "10 asteroid mysteries that Hera will explore",
        "publisher": "ESA",
        "url": "https://www.esa.int/media/about-us/directorates/operations/10-asteroid-mysteries-that-hera-will-explore",
        "publishedAt": "2026-11-02",
        "checkedAt": "2026-11-11T14:06:56Z",
        "evidence": "Ankomst til asteroiderne ventes i november. DART ændrede omløbet, mens de lokale følger på Dimorphos skal undersøges tæt på."
      }
    ],
    "updates": [
      {
        "id": "hera-1",
        "revision": 1,
        "kind": "development",
        "title": "Hera bliver sendt afsted",
        "change": "ESA opsender Hera 7. oktober 2024 med kurs mod asteroidesystemet Didymos og Dimorphos.",
        "whyItMatters": "En nærundersøgelse af DART's mål er på vej.",
        "occurredAt": "2024-10-07",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "hera-launch"
        ],
        "snapshot": {
          "status": "active",
          "answer": "Hera er opsendt og skal undersøge Dimorphos efter DART-nedslaget.",
          "openQuestions": [
            "Hvilke spor efterlod nedslaget på asteroiden?"
          ],
          "nextStep": {
            "label": "Rejsen frem mod asteroidesystemet og den efterfølgende nærundersøgelse.",
            "expectedAt": null,
            "sourceIds": [
              "hera-launch"
            ]
          }
        }
      },
      {
        "id": "hera-2",
        "revision": 2,
        "kind": "schedule",
        "title": "Ankomsten rykkes frem til november 2026",
        "change": "ESA annoncerer en måned tidligere ankomst efter missionens gode forløb og den gennemførte Mars-passage.",
        "whyItMatters": "Den planlagte nærundersøgelse kommer tættere på.",
        "occurredAt": "2025-10-07",
        "recordedAt": "2026-11-11T14:06:56Z",
        "sourceIds": [
          "hera-arrival-plan"
        ],
        "snapshot": {
          "status": "awaiting",
          "answer": "Hera sigter mod ankomst i november 2026. Overfladen efter nedslaget skal stadig undersøges.",
          "openQuestions": [
            "Forløber de næste manøvrer som planlagt?"
          ],
          "nextStep": {
            "label": "Ankomst til Didymos-systemet er planlagt til november 2026.",
            "expectedAt": null,
            "sourceIds": [
              "hera-arrival-plan"
            ]
          }
        }
      }
    ],
    "monitoring": {
      "sourceUrls": [
        "https://www.esa.int/Space_Safety/Hera",
        "https://www.esa.int/media/about-us/directorates/operations/10-asteroid-mysteries-that-hera-will-explore"
      ],
      "keywords": [
        "Hera",
        "Didymos",
        "Dimorphos",
        "arrival",
        "DART"
      ],
      "reviewEveryHours": 24
    },
    "lastCheck": {
      "checkedAt": "2026-11-11T14:06:56Z",
      "status": "checked",
      "note": "ESA's meddelelse fra 2. november 2026 genbekræfter det eksisterende ankomstmål i november 2026. Tidsplanen er uændret, og ankomsten er endnu ikke bekræftet i de gennemgåede kilder.",
      "sourceIds": [
        "hera-launch",
        "hera-arrival-plan",
        "hera-mysteries"
      ]
    }
  }
];
