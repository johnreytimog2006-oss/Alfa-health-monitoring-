// Alfa Company Health Monitoring — Live Google Sheet Configuration & Initial Verified Snapshot
// Unit: Alfa Company (Philippine Military Academy)

(function (global) {
  'use strict';

  const HEALTH_SHEET_CONFIG = {
    sheetId: '1-kohOuC0fSXLJVrGQNWSmyb00Ona2hBlMG-EaS3YuyQ',
    gid: '0',
    sheetName: 'Sheet1',
    editUrl: 'https://docs.google.com/spreadsheets/d/1-kohOuC0fSXLJVrGQNWSmyb00Ona2hBlMG-EaS3YuyQ/edit?usp=sharing',
    gvizCsvUrl: 'https://docs.google.com/spreadsheets/d/1-kohOuC0fSXLJVrGQNWSmyb00Ona2hBlMG-EaS3YuyQ/gviz/tq?tqx=out:csv&gid=0',
    gvizJsonUrl: 'https://docs.google.com/spreadsheets/d/1-kohOuC0fSXLJVrGQNWSmyb00Ona2hBlMG-EaS3YuyQ/gviz/tq?tqx=out:json&gid=0',
    defaultPollIntervalMs: 10000, // 10 seconds real-time polling
    // Optional: paste your deployed Google Apps Script Web App URL here to enable
    // instant two-way writes from the website back into the Google Sheet for all users.
    appsScriptWebAppUrl: ''
  };

  // Alfa Company directory enrichment (Serial No., Full Name, Platoon, Squad)
  // Automatically pairs with live Google Sheet rows by "Class|CADET"
  const ALFA_CADET_META = {
  "1CL|ADTOON": {
    "fullName": "ADTOON, JOHN REYMAR LUSICA",
    "sn": "C-27002",
    "platoon": "4th Plt",
    "squad": "1ST",
    "designation": "COMPANY EXECUTIVE OFFICER (C-27002)"
  },
  "1CL|AMANGAN": {
    "fullName": "AMANGAN, JETHRO ZEUS RAGURO",
    "sn": "C-25020",
    "platoon": "2nd Plt",
    "squad": "2ND",
    "designation": "COMPANY VALUES, ETHICS, STANDARDS, OFFICER (C-25020)"
  },
  "1CL|ATIWEN": {
    "fullName": "ATIWEN, REGINA TANGKIAO",
    "sn": "C-26027",
    "platoon": "2nd Plt",
    "squad": "1ST",
    "designation": "COMPANY CEIS OFFICER (C-26027)"
  },
  "1CL|BACCAY": {
    "fullName": "BACCAY, ANGELICA DACQUIL",
    "sn": "C-27019",
    "platoon": "3rd Plt",
    "squad": "3RD",
    "designation": "COMPANY FINANCE OFFICER (C-27019)"
  },
  "1CL|BALDEMOR": {
    "fullName": "BALDEMOR, RALF ANGELO GARCIA",
    "sn": "C-26041",
    "platoon": "1st Plt",
    "squad": "2ND",
    "designation": "HONOR COMMITTEE CHAIRPERSON (C-26041)"
  },
  "1CL|BERTE": {
    "fullName": "BERTE, MA. LYN LAGAYA",
    "sn": "C-26056",
    "platoon": "1st Plt",
    "squad": "3RD",
    "designation": "COMPANY PERSONNEL OFFICER (C-26056)"
  },
  "1CL|BONITA": {
    "fullName": "BONITA, JOSEPH ACILO",
    "sn": "C-26062",
    "platoon": "1st Plt",
    "squad": "2ND",
    "designation": "BATTALION OPERATIONS OFFICER (C-26062)"
  },
  "1CL|CASTRO": {
    "fullName": "CASTRO, BARON JOSEPH ALDABE",
    "sn": "C-27048",
    "platoon": "1st Plt",
    "squad": "1ST",
    "designation": "COMPANY EDUCATION AND TRAINING OFFICER (C-27048)"
  },
  "1CL|COCOY": {
    "fullName": "COCOY, JOHN RAILEY ALDABE",
    "sn": "C-27056",
    "platoon": "4th Plt",
    "squad": "2ND",
    "designation": "COMPANY OPERATIONS OFFICER (C-27056)"
  },
  "1CL|DE MESA": {
    "fullName": "DE MESA, ROCELLE NAVERA",
    "sn": "C-27075",
    "platoon": "2nd Plt",
    "squad": "2ND",
    "designation": "COMPANY PLANS AND PROGRAMS OFFICER (C-27075)"
  },
  "1CL|DECIERDO": {
    "fullName": "DECIERDO, JERICHO BACUS",
    "sn": "C-27078",
    "platoon": "4th Plt",
    "squad": "1ST",
    "designation": "COMPANY SAFETY OFFICER (C-27078)"
  },
  "1CL|DERAMA": {
    "fullName": "DERAMA, CELSO PENAZO",
    "sn": "C-27083",
    "platoon": "3rd Plt",
    "squad": "1ST",
    "designation": "BATTALION CEIS OFFICER (C-27083)"
  },
  "1CL|ENDINO": {
    "fullName": "ENDINO, JACKION ARANCHADO",
    "sn": "C-27091",
    "platoon": "1st Plt",
    "squad": "1ST",
    "designation": "COMPANY MESS OFFICER (C-27091)"
  },
  "1CL|FELIPE": {
    "fullName": "FELIPE, KRISTINE AIRA MORALES",
    "sn": "C-26151",
    "platoon": "1st Plt",
    "squad": "1ST",
    "designation": "BATALLION PERSONNEL OFFICER (C-26151)"
  },
  "1CL|GEPOLANI": {
    "fullName": "GEPOLANI, KAROL JEAN MOJARES",
    "sn": "C-27110",
    "platoon": "4th Plt",
    "squad": "2ND",
    "designation": "BATTALION GAD OFFICER (C-27110)"
  },
  "1CL|GEROLA": {
    "fullName": "GEROLA, APRIL JOY CEÑA",
    "sn": "C-27112",
    "platoon": "1st Plt",
    "squad": "2ND",
    "designation": "CCPB CHAIRPERSON (C-27112)"
  },
  "1CL|GRATIL": {
    "fullName": "GRATIL, MARK LESTER REYES",
    "sn": "C-25154",
    "platoon": "2nd Plt",
    "squad": "2ND",
    "designation": "BATTALION COMMANDER (C-25154)"
  },
  "1CL|GUPAAL": {
    "fullName": "GUPAAL, JEANN AVERY KURT MARCELO",
    "sn": "C-27121",
    "platoon": "4th Plt",
    "squad": "3RD",
    "designation": "COMPANY CIVIL MILITARY OPERATIONS OFFICER (C-27121)"
  },
  "1CL|IDULSA": {
    "fullName": "IDULSA, JAY BRUCE DIRECTO",
    "sn": "C-27123",
    "platoon": "1st Plt",
    "squad": "3RD",
    "designation": "COMPANY ATHLETIC OFFICER, COMPANY CCPB REPRESENTATIVE, 3RD PLATOON LEADER (C-27123)"
  },
  "1CL|LUCERO": {
    "fullName": "LUCERO, DYLAN CLYVE EBARLE",
    "sn": "C-27143",
    "platoon": "4th Plt",
    "squad": "2nd",
    "designation": "COMPANY COMMANDER (C-27143)"
  },
  "1CL|MAGAYANES": {
    "fullName": "MAGAYANES, CARLO JOSEPH GALVAN",
    "sn": "C-26226",
    "platoon": "2nd Plt",
    "squad": "3RD",
    "designation": "REGIMENTAL RESPONSIBLE SUPPLY OFFICER (C-26226)"
  },
  "1CL|MALANOT": {
    "fullName": "MALANOT, SHEKYNA SEGUNDO",
    "sn": "C-27147",
    "platoon": "2nd Plt",
    "squad": "3RD",
    "designation": "BATTALION PLANS & PROGRAMS OFFICER (C-27147)"
  },
  "1CL|MANCE": {
    "fullName": "MANCE, PATRICK JOHN DOCTOLERO",
    "sn": "C-25207",
    "platoon": "4th Plt",
    "squad": "3RD",
    "designation": "REGIMENTAL MILITARY TRAINING OFFICER (C-25207)"
  },
  "1CL|MIGUEL": {
    "fullName": "MIGUEL, JOHN ISAIAH ENTERIA",
    "sn": "C-27162",
    "platoon": "2nd Plt",
    "squad": "3RD",
    "designation": "COMPANY MILITARY TRAINING OFFICER, SECOND PLATOON LEADER (C-27162)"
  },
  "1CL|MOLANO": {
    "fullName": "MOLANO, JULIANA DENISSE SALARZA",
    "sn": "C-26244",
    "platoon": "3rd Plt",
    "squad": "2ND",
    "designation": "BATTALION CIVIL MILITARY OFFICER (C-26244)"
  },
  "1CL|OPLE": {
    "fullName": "OPLE, JAY MAR DELA CRUZ",
    "sn": "C-27178",
    "platoon": "2nd Plt",
    "squad": "1ST",
    "designation": "BATTALION EDUCATION AND TRAINING OFFICER (C-27178)"
  },
  "1CL|PALERO": {
    "fullName": "PALERO, MARTIN SIMON SENORIN",
    "sn": "C-27274",
    "platoon": "3rd Plt",
    "squad": "2ND",
    "designation": "REGIMENTAL ACADEMIC OFFICER (C-27274)"
  },
  "1CL|REONAL": {
    "fullName": "REONAL, CARLOS JOSE HOMO",
    "sn": "C-27207",
    "platoon": "3rd Plt",
    "squad": "3RD",
    "designation": "INTELLIGENCE OFFICER/ACADEMIC OFFICER (C-27207)"
  },
  "1CL|TORRES": {
    "fullName": "TORRES, LIAM CARLOS MIRANDA",
    "sn": "C-26332",
    "platoon": "3rd Plt",
    "squad": "1ST",
    "designation": "COMPANY LOGISTICS OFFICER (C-26332)"
  },
  "1CL|TRUMATA": {
    "fullName": "TRUMATA, MARK ANGELO CALAYAN",
    "sn": "C-27246",
    "platoon": "3rd Plt",
    "squad": "3RD",
    "designation": "1ST BATTALION INTELLIGENCE OFFICER (C-27246)"
  },
  "2CL|ABBAS": {
    "fullName": "ABBAS, RASHEED SHANE COTA",
    "sn": "C-28001",
    "platoon": "4th Plt",
    "squad": "2ND",
    "designation": "VALUE ETHICS STANDARD SERGEANT"
  },
  "2CL|ALIVEN": {
    "fullName": "ALIVEN, JIAN DALE VERANO",
    "sn": "C-28018",
    "platoon": "4th Plt",
    "squad": "1ST",
    "designation": "FIRST SERGEANT"
  },
  "2CL|AMBUCAY": {
    "fullName": "AMBUCAY, NIMROD KEDIAM",
    "sn": "C-27279",
    "platoon": "3rd Plt",
    "squad": "2ND",
    "designation": "Squadleader"
  },
  "2CL|AUSTRIA": {
    "fullName": "AUSTRIA, ALEXANDER VARICK BUCALEN",
    "sn": "C-28038",
    "platoon": "4th Plt",
    "squad": "3RD",
    "designation": "Assistant Squadleader"
  },
  "2CL|AVISADO": {
    "fullName": "AVISADO, SMART RABONSA",
    "sn": "C-28039",
    "platoon": "1st Plt",
    "squad": "1ST",
    "designation": "Squadleader"
  },
  "2CL|BACULI": {
    "fullName": "BACULI, JOSE LAMUELL GUEVARRA",
    "sn": "C-28040",
    "platoon": "3rd Plt",
    "squad": "1ST",
    "designation": "Company Executive Sergeant"
  },
  "2CL|BIADO": {
    "fullName": "BIADO, ALYSSA BEL OLITIN",
    "sn": "C-26058",
    "platoon": "2nd Plt",
    "squad": "3RD",
    "designation": "Assistant Squadleader"
  },
  "2CL|BOTIGAN": {
    "fullName": "BOTIGAN, VICTOR BALISONG",
    "sn": "C-26063",
    "platoon": "Unassigned",
    "squad": "",
    "designation": ""
  },
  "2CL|BUENO": {
    "fullName": "BUENO, JOHN CHRISTOPHE CASTILLO",
    "sn": "C-28064",
    "platoon": "2nd Plt",
    "squad": "1ST",
    "designation": "COMPANY FINANCE SERGEANT"
  },
  "2CL|CALANGI": {
    "fullName": "CALANGI, GERARD MATTHEW MIRANO",
    "sn": "C-28065",
    "platoon": "1st Plt",
    "squad": "3RD",
    "designation": "OPERATION SERGEANT"
  },
  "2CL|CARTAGENAS": {
    "fullName": "CARTAGENAS, ROEGEALLE LOECE ESCOTE",
    "sn": "C-28087",
    "platoon": "1st Plt",
    "squad": "1ST",
    "designation": "Company Education and Training Sergeant"
  },
  "2CL|CASTRO": {
    "fullName": "CASTRO, RAJIV MAHATMA VERGARA",
    "sn": "C-27051",
    "platoon": "1st Plt",
    "squad": "3RD",
    "designation": "Squadleader"
  },
  "2CL|CERVAS": {
    "fullName": "CERVAS, ANTHEA MARIE LOZADA",
    "sn": "C-28093",
    "platoon": "2nd Plt",
    "squad": "1ST",
    "designation": "Communications, Electronics, and Informations Systems Sergeant"
  },
  "2CL|COLOBONG": {
    "fullName": "COLOBONG, CARL ANDREI BAGAOISAN",
    "sn": "C-28095",
    "platoon": "3rd Plt",
    "squad": "1ST",
    "designation": "MESS SERGEANT"
  },
  "2CL|CUEVA": {
    "fullName": "CUEVA, LEXTER CARIAGA",
    "sn": "C-27064",
    "platoon": "1st Plt",
    "squad": "1ST",
    "designation": "Assistant Squadleader"
  },
  "2CL|DE GUZMAN": {
    "fullName": "DE GUZMAN, JASPER RAMIREZ",
    "sn": "C-27064",
    "platoon": "3rd Plt",
    "squad": "2ND",
    "designation": "Company Intelligence Sergeant"
  },
  "2CL|DELA TORRE": {
    "fullName": "DELA TORRE, KENT ANDREI PAMAN",
    "sn": "C-28117",
    "platoon": "4th Plt",
    "squad": "2ND",
    "designation": "BATTALION SERGEANT MAJOR"
  },
  "2CL|DIVINA": {
    "fullName": "DIVINA, JEFFREY JOHN FERD ABAD",
    "sn": "C-28123",
    "platoon": "4th Plt",
    "squad": "3RD",
    "designation": "4TH PLATOON SERGEANT"
  },
  "2CL|DULOS": {
    "fullName": "DULOS, CHRISTIAN -",
    "sn": "C-28130",
    "platoon": "3rd Plt",
    "squad": "3RD",
    "designation": "Education and Training NCO"
  },
  "2CL|FOCASAN": {
    "fullName": "FOCASAN, MAO-ED NEIL LAMTOCON",
    "sn": "C-26158",
    "platoon": "4th Plt",
    "squad": "1ST",
    "designation": "Platoon Sergeant"
  },
  "2CL|GONZALES": {
    "fullName": "GONZALES, KRISTINE CLAIRE DONA-AL",
    "sn": "C-27117",
    "platoon": "3rd Plt",
    "squad": "1ST",
    "designation": "Squadleader"
  },
  "2CL|GUTING": {
    "fullName": "GUTING, JOHN AMAR",
    "sn": "C-28174",
    "platoon": "2nd Plt",
    "squad": "1ST",
    "designation": "SUPPLY SERGEANT/ SAFETY SERGEANT"
  },
  "2CL|LACADEN": {
    "fullName": "LACADEN, JINO BESTRE",
    "sn": "C-28190",
    "platoon": "1st Plt",
    "squad": "2nd",
    "designation": "Company Logistics Sergeant"
  },
  "2CL|LADIONG": {
    "fullName": "LADIONG, GRAIZELLE MAYUMI",
    "sn": "C-27132",
    "platoon": "3rd Plt",
    "squad": "3RD",
    "designation": "Squadleader"
  },
  "2CL|LLADOC": {
    "fullName": "LLADOC, PAUL RAYMOND PAJE",
    "sn": "C-28198",
    "platoon": "4th Plt",
    "squad": "3RD",
    "designation": "Assistant Squadleader"
  },
  "2CL|MALOMAY": {
    "fullName": "MALOMAY, CATHERINA ALMIRA KIDDA CINCO",
    "sn": "C-28216",
    "platoon": "4th Plt",
    "squad": "1ST",
    "designation": "Regimental Plans and Programs Officer - NCO, S5"
  },
  "2CL|PAMONAG": {
    "fullName": "PAMONAG, JILVERT TABIOLO",
    "sn": "C-28263",
    "platoon": "3rd Plt",
    "squad": "1ST",
    "designation": "First Platoon Sergeant"
  },
  "2CL|RAMOS": {
    "fullName": "RAMOS, JOYCE RITAGA",
    "sn": "C-28287",
    "platoon": "3rd Plt",
    "squad": "2ND",
    "designation": "Company Academic Sergeant"
  },
  "2CL|ROBRIGADO": {
    "fullName": "ROBRIGADO, GABRIELLE OSTONAL",
    "sn": "C-28296",
    "platoon": "1st Plt",
    "squad": "2ND",
    "designation": "Squadleader"
  },
  "2CL|SANGGALANG": {
    "fullName": "SANGGALANG, JOHN KENN ATIENZA",
    "sn": "C-28308",
    "platoon": "4th Plt",
    "squad": "3RD",
    "designation": "Assistant Squadleader"
  },
  "2CL|SANGGO": {
    "fullName": "SANGGO, LEIF LAZAR BRILLANTES",
    "sn": "C-28306",
    "platoon": "2nd Plt",
    "squad": "3RD",
    "designation": "GAD SERGEANT"
  },
  "2CL|SENSANO": {
    "fullName": "SENSANO, IAN GEMAR PABALINAS",
    "sn": "C-28314",
    "platoon": "2nd Plt",
    "squad": "2ND",
    "designation": "Company Personnel Sergeant"
  },
  "2CL|SUMBID": {
    "fullName": "SUMBID, PRECIOUS JANNA BATAWE",
    "sn": "C-28322",
    "platoon": "4th Plt",
    "squad": "2ND",
    "designation": "Squadleader"
  },
  "2CL|TAJAAL": {
    "fullName": "TAJAAL, JHUMMEL EVANGELISTA",
    "sn": "C-28323",
    "platoon": "1st Plt",
    "squad": "3RD",
    "designation": "PLANS AND PROGRAM SERGEANT"
  },
  "2CL|TIMOG": {
    "fullName": "TIMOG, JOHNREY SEGUI",
    "sn": "C-28331",
    "platoon": "1st Plt",
    "squad": "1ST",
    "designation": "S6 NCO"
  },
  "2CL|TITO": {
    "fullName": "TITO, MAR KIMTON BRAEN CAMPION",
    "sn": "C-27244",
    "platoon": "1st Plt",
    "squad": "2ND",
    "designation": "Assistant Squadleader"
  },
  "2CL|TUCAQUI": {
    "fullName": "TUCAQUI, MARCO JOAQUIN FRANCO",
    "sn": "C-28337",
    "platoon": "4th Plt",
    "squad": "1ST",
    "designation": "Company Military Training Sergeant"
  },
  "2CL|TUMARAO": {
    "fullName": "TUMARAO, NOBELIE AXA BONSOL",
    "sn": "C-28338",
    "platoon": "2nd Plt",
    "squad": "2ND",
    "designation": "Squadleader"
  },
  "2CL|VIRREY": {
    "fullName": "VIRREY, VINCE DAVE MAURO",
    "sn": "C-28349",
    "platoon": "3rd Plt",
    "squad": "3RD",
    "designation": "CIVIL MILITARY OPERATION SERGEANT"
  },
  "2CL|WAYAGWAG": {
    "fullName": "WAYAGWAG, WILLY YNER GUDAREN",
    "sn": "C-28350",
    "platoon": "2nd Plt",
    "squad": "2ND",
    "designation": "AThletic Sergeant"
  },
  "3CL|ACOP": {
    "fullName": "ACOP, PERKINS CIABOI",
    "sn": "C-28353",
    "platoon": "1st Plt",
    "squad": "2ND",
    "designation": "Atheletic Corporal"
  },
  "3CL|ALAUYA": {
    "fullName": "ALAUYA, USMAN HANS STEPHEN NARAGAS",
    "sn": "C-28014",
    "platoon": "Unassigned",
    "squad": "",
    "designation": ""
  },
  "3CL|ARENAS": {
    "fullName": "ARENAS, JEZERYL GUINTO",
    "sn": "C-28035",
    "platoon": "2nd Plt",
    "squad": "1ST",
    "designation": "NONE"
  },
  "3CL|ARIG": {
    "fullName": "ARIG, CARL JHERWEN HIMBAS",
    "sn": "C-29024",
    "platoon": "4th Plt",
    "squad": "2ND",
    "designation": "Corporal Marcher"
  },
  "3CL|BADE": {
    "fullName": "BADE, KING ALEX COSADIO",
    "sn": "C-29032",
    "platoon": "2nd Plt",
    "squad": "2ND",
    "designation": "Responsible supply Corporal"
  },
  "3CL|BAEL": {
    "fullName": "BAEL, JOSEPH NATHANIEL NIMER",
    "sn": "C-29034",
    "platoon": "3rd Plt",
    "squad": "3RD",
    "designation": "Academic Corporal"
  },
  "3CL|BAPTISTA": {
    "fullName": "BAPTISTA, KURT RUSSEL CORPUZ",
    "sn": "C-29040",
    "platoon": "4th Plt",
    "squad": "3RD",
    "designation": "Executive Corporal"
  },
  "3CL|BONGOLAN": {
    "fullName": "BONGOLAN, NATHALIE ALVIAR",
    "sn": "C-28361",
    "platoon": "2nd Plt",
    "squad": "1ST",
    "designation": "NONE"
  },
  "3CL|BORRES": {
    "fullName": "BORRES, SELWYN KING AUGUIS",
    "sn": "C-29056",
    "platoon": "2nd Plt",
    "squad": "1ST",
    "designation": "Company Honor Committee Representative Corporal"
  },
  "3CL|CALAMBRO": {
    "fullName": "CALAMBRO, LESTER JAY ZAMORA",
    "sn": "C-28070",
    "platoon": "2nd Plt",
    "squad": "3RD",
    "designation": "Mess Corporal"
  },
  "3CL|DAMAYON": {
    "fullName": "DAMAYON, DEZERIE DEQUIÑA",
    "sn": "C-29104",
    "platoon": "1st Plt",
    "squad": "2ND",
    "designation": "Class Academic Corporal"
  },
  "3CL|DELICA": {
    "fullName": "DELICA, VON GUILLER PARCASIO",
    "sn": "C-29110",
    "platoon": "1st Plt",
    "squad": "2ND",
    "designation": "NONE"
  },
  "3CL|DOMALLIG": {
    "fullName": "DOMALLIG, MARICAR CAJIGAN",
    "sn": "C-29114",
    "platoon": "3rd Plt",
    "squad": "1ST",
    "designation": "CCPB Committee Representative Corporal"
  },
  "3CL|DUMALLEG": {
    "fullName": "DUMALLEG, NIMFA DALANAO",
    "sn": "C-29118",
    "platoon": "4th Plt",
    "squad": "1ST",
    "designation": "Civil Military Corporal"
  },
  "3CL|GALILA": {
    "fullName": "GALILA, LEENWILL LEE SOLDEVILLA",
    "sn": "C-29138",
    "platoon": "3rd Plt",
    "squad": "2ND",
    "designation": "COMPANY FINANCE CORPORAL"
  },
  "3CL|GALO": {
    "fullName": "GALO, LOUISE HENNESSY CAPARROSO",
    "sn": "C-29139",
    "platoon": "3rd Plt",
    "squad": "3RD",
    "designation": "NONE"
  },
  "3CL|GARCIA": {
    "fullName": "GARCIA, JOHN ANTHONY REVILLA",
    "sn": "C-29142",
    "platoon": "1st Plt",
    "squad": "3RD",
    "designation": "Company Honor Committee Representative Corporal"
  },
  "3CL|GARCIA JL": {
    "fullName": "GARCIA, JERICHO LAPLANA",
    "sn": "C-28154",
    "platoon": "4th Plt",
    "squad": "2ND",
    "designation": "Company Communications, Electronics, and Information System Corporal"
  },
  "3CL|GILO": {
    "fullName": "GILO, JOSHUA ZOREN LINAZA",
    "sn": "C-29151",
    "platoon": "3rd Plt",
    "squad": "2ND",
    "designation": "GAD Corporal"
  },
  "3CL|LIMSON": {
    "fullName": "LIMSON, CARLOS BENEDICT ESPANOLA",
    "sn": "C-29180",
    "platoon": "4th Plt",
    "squad": "3RD",
    "designation": "Color Corporal"
  },
  "3CL|LORICO": {
    "fullName": "LORICO, PAULINE KATE BROSA",
    "sn": "C-29189",
    "platoon": "2nd Plt",
    "squad": "3RD",
    "designation": "Company Gender Awareness and Development Corproal"
  },
  "3CL|MAPACPAC": {
    "fullName": "MAPACPAC, HANS DARACAN",
    "sn": "C-28225",
    "platoon": "4th Plt",
    "squad": "2ND",
    "designation": "NONE"
  },
  "3CL|MOJICA": {
    "fullName": "MOJICA, JEREMIAH DAVID ENRIQUEZ",
    "sn": "C-27165",
    "platoon": "Unassigned",
    "squad": "",
    "designation": ""
  },
  "3CL|MURILLO": {
    "fullName": "MURILLO, DEXTER JORDAN",
    "sn": "C-29225",
    "platoon": "4th Plt",
    "squad": "1ST",
    "designation": "Values, Ethics, Standard corporal"
  },
  "3CL|NAMBONG": {
    "fullName": "NAMBONG, CHEILAMAE ALEGADO",
    "sn": "C-29227",
    "platoon": "1st Plt",
    "squad": "1ST",
    "designation": "Company Personnel Corporal"
  },
  "3CL|OMOTONG": {
    "fullName": "OMOTONG, KIRK BLANCO",
    "sn": "C-29238",
    "platoon": "1st Plt",
    "squad": "1ST",
    "designation": "Company Honor Committee Representative Corporal"
  },
  "3CL|PADILLA": {
    "fullName": "PADILLA, MARK KENJIEH PASION",
    "sn": "C-29242",
    "platoon": "4th Plt",
    "squad": "1ST",
    "designation": "NONE"
  },
  "3CL|PALAHANG": {
    "fullName": "PALAHANG, VINCE KERL TANIOLA",
    "sn": "C-29244",
    "platoon": "1st Plt",
    "squad": "3RD",
    "designation": "NONE"
  },
  "3CL|PIZON": {
    "fullName": "PIZON, VENJEB AMIT",
    "sn": "C-29258",
    "platoon": "3rd Plt",
    "squad": "2ND",
    "designation": "Company Operations Corporal"
  },
  "3CL|PRACULLOS": {
    "fullName": "PRACULLOS, AUDREY MARIE",
    "sn": "C-28282",
    "platoon": "2nd Plt",
    "squad": "2ND",
    "designation": "Plans And Programs Corporal"
  },
  "3CL|RODRIGUEZ": {
    "fullName": "RODRIGUEZ, RAMON SAMBRONA",
    "sn": "C-29276",
    "platoon": "1st Plt",
    "squad": "1ST",
    "designation": "Logistic Corporal"
  },
  "3CL|ROSALES": {
    "fullName": "ROSALES, JOSHUA ROI BABIERA",
    "sn": "C-29279",
    "platoon": "3rd Plt",
    "squad": "1ST",
    "designation": "NONE"
  },
  "3CL|SABAS": {
    "fullName": "SABAS, JAN ANDREI SABAYBAY",
    "sn": "C-29283",
    "platoon": "3rd Plt",
    "squad": "3RD",
    "designation": "NONE"
  },
  "3CL|SAGARIO": {
    "fullName": "SAGARIO, CESAR WANIA",
    "sn": "C-29287",
    "platoon": "1st Plt",
    "squad": "3RD",
    "designation": "Company Education and Training Corporal"
  },
  "3CL|SILVERIO": {
    "fullName": "SILVERIO, MARVIN VELORIA",
    "sn": "C-29305",
    "platoon": "2nd Plt",
    "squad": "3RD",
    "designation": "Company Intelligence Corporal"
  },
  "3CL|SUMAOY": {
    "fullName": "SUMAOY, KIRK LYOD SISO",
    "sn": "C-29309",
    "platoon": "3rd Plt",
    "squad": "1ST",
    "designation": "NONE"
  },
  "4CL|ANDRES": {
    "fullName": "ANDRES, BENJ THEOPHILE DAQUIOAG",
    "sn": "C-30022",
    "platoon": "4th Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|ANGOLUAN": {
    "fullName": "ANGOLUAN, PRINCESS DESIREE TUNGCUL",
    "sn": "C-30023",
    "platoon": "1st Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  },
  "4CL|ARANDA": {
    "fullName": "ARANDA, TYRONE JON TAGUDIN",
    "sn": "C-29022",
    "platoon": "3rd Plt",
    "squad": "1ST",
    "designation": "SQUAD MEMBER"
  },
  "4CL|BALUNOS": {
    "fullName": "BALUNOS, RENIER SISON",
    "sn": "C-30036",
    "platoon": "2nd Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|BANGELES": {
    "fullName": "BANGELES, DAVE LESTHER PARCON",
    "sn": "C-30040",
    "platoon": "1st Plt",
    "squad": "1ST",
    "designation": "SQUAD MEMBER"
  },
  "4CL|BASILIO": {
    "fullName": "BASILIO, CLAUI CHANNEL SANTIAGO",
    "sn": "C-30042",
    "platoon": "4th Plt",
    "squad": "1ST",
    "designation": "SQUAD MEMBER"
  },
  "4CL|BAUTISTA": {
    "fullName": "BAUTISTA, JOHN FRANCIS LINGAD",
    "sn": "C-30047",
    "platoon": "4th Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  },
  "4CL|BERBER": {
    "fullName": "BERBER, JURIS PRIAM ZAMORA",
    "sn": "C-30050",
    "platoon": "1st Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  },
  "4CL|BILANGEL": {
    "fullName": "BILANGEL, JEREMIE VINCENT CARULLO",
    "sn": "C-30053",
    "platoon": "4th Plt",
    "squad": "1ST",
    "designation": "SQUAD MEMBER"
  },
  "4CL|BUSINOS": {
    "fullName": "BUSINOS, JULIAN PAUL BANDAL",
    "sn": "C-30069",
    "platoon": "3rd Plt",
    "squad": "1ST",
    "designation": "SQUAD MEMBER"
  },
  "4CL|CABALLERO": {
    "fullName": "CABALLERO, CEDRICK MIGUEL MALUBAY",
    "sn": "C-30071",
    "platoon": "3rd Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  },
  "4CL|CAPILI": {
    "fullName": "CAPILI, JEVEN CANE PADILLA",
    "sn": "C-30084",
    "platoon": "1st Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  },
  "4CL|COPREROS": {
    "fullName": "COPREROS, RANNULPH RODRIGUEZ",
    "sn": "C-30100",
    "platoon": "3rd Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|CUBIO": {
    "fullName": "CUBIO, JOSEPH KAROL ANGOSTURA",
    "sn": "C-30106",
    "platoon": "2nd Plt",
    "squad": "1ST",
    "designation": "SQUAD MEMBER"
  },
  "4CL|DE LAS ALAS": {
    "fullName": "DE LAS ALAS, DESIREE JEAN RODRIGUEZ",
    "sn": "C-30114",
    "platoon": "1st Plt",
    "squad": "1ST",
    "designation": "SQUAD MEMBER"
  },
  "4CL|DELA CRUZ": {
    "fullName": "DELA CRUZ, MARCUS KENDREW MAGBOO",
    "sn": "C-30118",
    "platoon": "2nd Plt",
    "squad": "1ST",
    "designation": "SQUAD MEMBER"
  },
  "4CL|ELEGORES": {
    "fullName": "ELEGORES, SAM ANDES",
    "sn": "C-30127",
    "platoon": "2nd Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  },
  "4CL|ESTRADA": {
    "fullName": "ESTRADA, JHON XANDER SORIANO",
    "sn": "C-30138",
    "platoon": "3rd Plt",
    "squad": "1ST",
    "designation": "SQUAD MEMBER"
  },
  "4CL|FAILAGO": {
    "fullName": "FAILAGO, PRINCES JEAN TABALOS",
    "sn": "C-30141",
    "platoon": "2nd Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|FANGAYEN": {
    "fullName": "FANGAYEN, ALLEN JAMES LIZARDO",
    "sn": "C-30143",
    "platoon": "3rd Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  },
  "4CL|FONTANILLA": {
    "fullName": "FONTANILLA, JOHN LAWRENCE RUALES",
    "sn": "C-30149",
    "platoon": "1st Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|GARINO": {
    "fullName": "GARINO, JERICHO PAOLO RAMOS",
    "sn": "C-30161",
    "platoon": "4th Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  },
  "4CL|GELVEZON": {
    "fullName": "GELVEZON, CAROLINE DELGADO",
    "sn": "C-30163",
    "platoon": "3rd Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  },
  "4CL|GUTIERREZ": {
    "fullName": "GUTIERREZ, CADE MCBRYDEN RITUAL",
    "sn": "C-30176",
    "platoon": "1st Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|JALALON": {
    "fullName": "JALALON, JOHN PHILIPP BENANUA",
    "sn": "C-30185",
    "platoon": "2nd Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|LADERA": {
    "fullName": "LADERA, LAWRENCE REY GETINO",
    "sn": "C-30192",
    "platoon": "1st Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|LIBATIQUE": {
    "fullName": "LIBATIQUE, DIOLYN GIFT GALON",
    "sn": "C-30202",
    "platoon": "3rd Plt",
    "squad": "1ST",
    "designation": "SQUAD MEMBER"
  },
  "4CL|LUMOD": {
    "fullName": "LUMOD, ISIS ALAIN NATIVIDAD",
    "sn": "C-30210",
    "platoon": "3rd Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|MACASIRAY": {
    "fullName": "MACASIRAY, WESLY GUTIERREZ",
    "sn": "C-30214",
    "platoon": "3rd Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  },
  "4CL|MAMITAG": {
    "fullName": "MAMITAG, KENT RAZZEL PADILLA",
    "sn": "C-30224",
    "platoon": "1st Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|MANUEL": {
    "fullName": "MANUEL, ALDRIN CHARLES ARTIZA",
    "sn": "C-30228",
    "platoon": "1st Plt",
    "squad": "1ST",
    "designation": "SQUAD MEMBER"
  },
  "4CL|MONTEMAYOR": {
    "fullName": "MONTEMAYOR, KAREN RAMOS",
    "sn": "C-30245",
    "platoon": "2nd Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  },
  "4CL|MORELO": {
    "fullName": "MORELO, RHAMUEL LANUZO",
    "sn": "C-30248",
    "platoon": "3rd Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|NERI": {
    "fullName": "NERI, EMMANUEL ANDRES",
    "sn": "C-30255",
    "platoon": "4th Plt",
    "squad": "1ST",
    "designation": "SQUAD MEMBER"
  },
  "4CL|NOVERO": {
    "fullName": "NOVERO, LIAN RIMAN",
    "sn": "C-30259",
    "platoon": "2nd Plt",
    "squad": "1ST",
    "designation": "SQUAD MEMBER"
  },
  "4CL|PAJE": {
    "fullName": "PAJE, YTHAN VON ANGAO",
    "sn": "C-30272",
    "platoon": "2nd Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|PILOBELLO": {
    "fullName": "PILOBELLO, JUSTINE GABRIEL MAPA",
    "sn": "C-30289",
    "platoon": "4th Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|REMO": {
    "fullName": "REMO, XYFFHER PRINCE HUEY ABBARANI",
    "sn": "C-29271",
    "platoon": "2nd Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|SALEM": {
    "fullName": "SALEM, CHRISTIAN KENTH ELBA",
    "sn": "C-30310",
    "platoon": "4th Plt",
    "squad": "3RD",
    "designation": "SQUAD MEMBER"
  },
  "4CL|SAMBAYAN": {
    "fullName": "SAMBAYAN, CHARLES HARVEY MANGUIAT",
    "sn": "C-30315",
    "platoon": "1st Plt",
    "squad": "1ST",
    "designation": "SQUAD MEMBER"
  },
  "4CL|SANTIAGO": {
    "fullName": "SANTIAGO, JERICHO YVEZ CONALES",
    "sn": "C-30318",
    "platoon": "1st Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  },
  "4CL|TANGCAY": {
    "fullName": "TANGCAY, LARA ANDREA SAINGAN",
    "sn": "C-30338",
    "platoon": "4th Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  },
  "4CL|VILLANUEVA": {
    "fullName": "VILLANUEVA, MERIEL ARROYO",
    "sn": "C-29339",
    "platoon": "3rd Plt",
    "squad": "3ED",
    "designation": "SQUAD MEMBER"
  },
  "4CL|VINCOY": {
    "fullName": "VINCOY, JOHN DIRCK FORTUNA",
    "sn": "C-30361",
    "platoon": "2nd Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  },
  "4CL|VITE": {
    "fullName": "VITE, MICO ANGELO PICHAY",
    "sn": "C-30364",
    "platoon": "2nd Plt",
    "squad": "2ND",
    "designation": "SQUAD MEMBER"
  }
};

  // Verified snapshot of the 151-cadet Google Sheet for instant 0ms first paint & offline resilience
  const INITIAL_SHEET_SNAPSHOT = [
  {
    "classYr": "1CL",
    "cadet": "ADTOON",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "1CL",
    "cadet": "AMANGAN",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "ATIWEN",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "BACCAY",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "BALDEMOR",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "BERTE",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "BONITA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "CASTRO",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "1CL",
    "cadet": "COCOY",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "DE MESA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "DECIERDO",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "1CL",
    "cadet": "DERAMA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "ENDINO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "FELIPE",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "GEPOLANI",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "GEROLA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "GRATIL",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "GUPAAL",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "IDULSA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "LUCERO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "MAGAYANES",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "MALANOT",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "MANCE",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "MIGUEL",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "MOLANO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "OPLE",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "PALERO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "REONAL",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "TORRES",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "1CL",
    "cadet": "TRUMATA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "ABBAS",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "ALIVEN",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "AMBUCAY",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "AUSTRIA",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "2CL",
    "cadet": "AVISADO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "BACULI",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "BIADO",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "2CL",
    "cadet": "BOTIGAN",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "2CL",
    "cadet": "BUENO",
    "colds": true,
    "cough": true,
    "flu": true,
    "fever": false,
    "none": false
  },
  {
    "classYr": "2CL",
    "cadet": "CALANGI",
    "colds": false,
    "cough": true,
    "flu": true,
    "fever": false,
    "none": false
  },
  {
    "classYr": "2CL",
    "cadet": "CARTAGENAS",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "CASTRO",
    "colds": false,
    "cough": false,
    "flu": true,
    "fever": false,
    "none": false
  },
  {
    "classYr": "2CL",
    "cadet": "CERVAS",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "2CL",
    "cadet": "COLOBONG",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "CUEVA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "DE GUZMAN",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "DELA TORRE",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "DIVINA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "DULOS",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "FOCASAN",
    "colds": false,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "2CL",
    "cadet": "GONZALES",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "GUTING",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "LACADEN",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "LADIONG",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "2CL",
    "cadet": "LLADOC",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "2CL",
    "cadet": "MALOMAY",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "2CL",
    "cadet": "PAMONAG",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "RAMOS",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "ROBRIGADO",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "2CL",
    "cadet": "SANGGALANG",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "2CL",
    "cadet": "SANGGO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "SENSANO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "SUMBID",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "TAJAAL",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "2CL",
    "cadet": "TIMOG",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "TITO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "TUCAQUI",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "TUMARAO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "VIRREY",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "2CL",
    "cadet": "WAYAGWAG",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "ACOP",
    "colds": false,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "3CL",
    "cadet": "ALAUYA",
    "colds": false,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "3CL",
    "cadet": "ARENAS",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "ARIG",
    "colds": false,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "3CL",
    "cadet": "BADE",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "3CL",
    "cadet": "BAEL",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "BAPTISTA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "BONGOLAN",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "BORRES",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "3CL",
    "cadet": "CALAMBRO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "DAMAYON",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "DELICA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "DOMALLIG",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "3CL",
    "cadet": "DUMALLEG",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "GALILA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "GALO",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": true,
    "none": false
  },
  {
    "classYr": "3CL",
    "cadet": "GARCIA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "GARCIA JL",
    "colds": false,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "3CL",
    "cadet": "GILO",
    "colds": false,
    "cough": true,
    "flu": true,
    "fever": false,
    "none": false
  },
  {
    "classYr": "3CL",
    "cadet": "LIMSON",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "LORICO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "MAPACPAC",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "MOJICA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "MURILLO",
    "colds": false,
    "cough": true,
    "flu": true,
    "fever": false,
    "none": false
  },
  {
    "classYr": "3CL",
    "cadet": "NAMBONG",
    "colds": true,
    "cough": false,
    "flu": true,
    "fever": false,
    "none": false
  },
  {
    "classYr": "3CL",
    "cadet": "OMOTONG",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "PADILLA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "PALAHANG",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "PIZON",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "PRACULLOS",
    "colds": true,
    "cough": false,
    "flu": true,
    "fever": false,
    "none": false
  },
  {
    "classYr": "3CL",
    "cadet": "RODRIGUEZ",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "ROSALES",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "SABAS",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "SAGARIO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "SILVERIO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "3CL",
    "cadet": "SUMAOY",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "ANDRES",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "ANGOLUAN",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "ARANDA",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "BALUNOS",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "BANGELES",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "BASILIO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "BAUTISTA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "BERBER",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "BILANGEL",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "BUSINOS",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "CABALLERO",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "CAPILI",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "COPREROS",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "CUBIO",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "DE LAS ALAS",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "DELA CRUZ",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "ELEGORES",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "ESTRADA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "FAILAGO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "FANGAYEN",
    "colds": false,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "FONTANILLA",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "GARINO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "GELVEZON",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "GUTIERREZ",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "JALALON",
    "colds": true,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "LADERA",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "LIBATIQUE",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "LUMOD",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "MACASIRAY",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "MAMITAG",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "MANUEL",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "MONTEMAYOR",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "MORELO",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "NERI",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "NOVERO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "PAJE",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "PILOBELLO",
    "colds": false,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "REMO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "SALEM",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "SAMBAYAN",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "SANTIAGO",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "TANGCAY",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "VILLANUEVA",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  },
  {
    "classYr": "4CL",
    "cadet": "VINCOY",
    "colds": true,
    "cough": true,
    "flu": false,
    "fever": false,
    "none": false
  },
  {
    "classYr": "4CL",
    "cadet": "VITE",
    "colds": false,
    "cough": false,
    "flu": false,
    "fever": false,
    "none": true
  }
];

  global.HEALTH_SHEET_CONFIG = HEALTH_SHEET_CONFIG;
  global.ALFA_CADET_META = ALFA_CADET_META;
  global.INITIAL_SHEET_SNAPSHOT = INITIAL_SHEET_SNAPSHOT;
})(typeof window !== 'undefined' ? window : globalThis);
