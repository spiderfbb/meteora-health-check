/* Health Check at a Glance: content and reference data.
   All crew readings are SIMULATED for demonstration. Thresholds cite their sources in SOURCES. */


/* ---------- Sources (every threshold and claim points to one of these) ---------- */
const SOURCES = {
  STD3001_ECLSS:{s:"OCHMO-TB-002 (NASA-STD-3001 Vol. 2)",t:"NASA OCHMO Technical Brief OCHMO-TB-002: Environmental Control & Life Support System (derived from NASA-STD-3001 Vol. 2)",u:"https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-002-eclss.pdf",nasa:true},
  STD3001_CO2:{s:"OCHMO-TB-004 CO2",t:"NASA OCHMO Technical Brief OCHMO-TB-004: Carbon Dioxide (NASA-STD-3001 Vol. 2 [V2 6004])",u:"https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf",nasa:true},
  STD3001_RAD:{s:"OCHMO-TB-020 Radiation",t:"NASA OCHMO Technical Brief OCHMO-TB-020: Design for Ionizing Radiation Protection (NASA-STD-3001 Vol. 1 [V1 4030], [V1 4031])",u:"https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf",nasa:true},
  STD3001_BONE:{s:"OCHMO-TB-030 Bone loss",t:"NASA OCHMO Technical Brief OCHMO-TB-030: Bone Loss",u:"https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-030-bone-loss.pdf",nasa:true},
  HRP_BONE:{s:"NASA HRP bone evidence report",t:"NASA HRP Evidence Report: Risk of Bone Fracture due to Spaceflight-induced Changes to Bone (2017)",u:"https://ntrs.nasa.gov/api/citations/20170004597/downloads/20170004597.pdf",nasa:true},
  HRP_HAZ:{s:"NASA HRP hazards",t:"NASA Human Research Program: Hazards of Human Spaceflight (RIDGE)",u:"https://www.nasa.gov/hrp/hazards",nasa:true},
  HRP_BODY:{s:"NASA: Human Body in Space",t:"NASA: The Human Body in Space",u:"https://www.nasa.gov/humans-in-space/the-human-body-in-space/",nasa:true},
  DONKI:{s:"NASA DONKI API",t:"NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information), notifications API",u:"https://api.nasa.gov/DONKI/notifications",nasa:true},
  STD3001_TRAIN:{s:"NASA-STD-3001 Vol. 1 training",t:"NASA-STD-3001 Vol. 1, 5.0 Training: Crew Medical Officer training [V1 5003]",u:"https://www.nasa.gov/reference/5-0-training/",nasa:true},
  NTRS_EX:{s:"NASA NTRS exercise study",t:"NASA NTRS: Effects of Replacing Treadmill Running with Alternative Exercise Countermeasures (T2, CEVIS, ARED on ISS)",u:"https://ntrs.nasa.gov/citations/20240016101",nasa:true},
  EX2H:{s:"NASA via Phys.org: crew exercise",t:"NASA (2024). Important crew health for space missions: ISS crews now average about two hours of exercise per day (ARED, T2, CEVIS)",u:"https://phys.org/news/2024-05-important-crew-health-space-missions.html",nasa:true},
  PATEL:{s:"Patel et al. (2020)",t:"Patel, Z. S., et al. (2020). Red risks for a journey to the red planet. npj Microgravity, 6, 33",u:"https://doi.org/10.1038/s41526-020-00124-6",nasa:true},
  AHA:{s:"American Heart Association",t:"American Heart Association: normal resting heart rate (60 to 100 bpm) and blood pressure (below 120/80 mmHg)",u:"https://www.heart.org/en/news/2023/05/17/are-heart-rate-and-blood-pressure-the-same"},
  GLU:{s:"Fasting glucose categories (CDC cut-offs)",t:"Fasting blood sugar categories: 99 mg/dL or below normal, 100 to 125 prediabetes, 126 or above diabetes (CDC cut-offs as summarized by U.S. health systems)",u:"https://healthlibrary.ecuhealth.org/diabetes/types/prediabetes"},
  FEVER:{s:"CDC fever definition",t:"CDC definition of fever: measured temperature of at least 100.4 °F (38 °C)",u:"https://health-desk.org/articles/what-does-it-mean-to-have-a-fever"},
  LYTES:{s:"NHANES reference intervals",t:"Serum sodium 135 to 145 mmol/L and potassium 3.5 to 5.0 mmol/L reference intervals (NHANES analysis, PMC10975823)",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC10975823/"},
  SLEEP:{s:"CDC sleep guidance",t:"CDC: adults should sleep at least 7 hours each night (AASM / SRS recommendation)",u:"https://archive.cdc.gov/www_cdc_gov/media/releases/2016/p0215-enough-sleep.html"},
  NOMAD:{s:"Project NOMAD",t:"Project NOMAD: open-source offline knowledge server (design inspiration for offline guides)",u:"https://www.projectnomad.us/"},
  MUSCLEWIKI:{s:"MuscleWiki",t:"MuscleWiki (design inspiration for the clickable muscle map)",u:"https://musclewiki.com"}
};

/* ---------- Status rules: one source of truth for every color in the app ----------
   Nominal (green) = within reference range, Caution (amber) = outside reference, Warning (red) = needs medical review.
   Placeholder red cut-offs (muscle strength) are set by the mission's flight surgeons. */
const RULES = {
  hr:{name:"Resting heart rate",unit:"bpm",dec:0,ref:"60 to 100 bpm",src:"AHA",
      eval:v=> v>=60&&v<=100?'good': (v>=45&&v<60)||(v>100&&v<=115)?'warn':'bad'},
  sys:{name:"Blood pressure (systolic)",unit:"mmHg",dec:0,ref:"below 120 mmHg",src:"AHA",
      eval:v=> v<120?'good': v<140?'warn':'bad'},
  dia:{name:"Blood pressure (diastolic)",unit:"mmHg",dec:0,ref:"below 80 mmHg",src:"AHA",
      eval:v=> v<80?'good': v<90?'warn':'bad'},
  glu:{name:"Fasting blood sugar",unit:"mg/dL",dec:0,ref:"70 to 99 mg/dL",src:"GLU",
      eval:v=> v>=70&&v<=99?'good': (v>=60&&v<70)||(v>=100&&v<=125)?'warn':'bad'},
  temp:{name:"Body temperature",unit:"°C",dec:1,ref:"below 37.3 °C; fever at 38.0 °C",src:"FEVER",
      eval:v=> v<37.3&&v>=35.8?'good': v<38.0&&v>=35.0?'warn':'bad'},
  spo2:{name:"Oxygen saturation",unit:"%",dec:0,ref:"95 to 100 %",src:null,
      eval:v=> v>=95?'good': v>=92?'warn':'bad'},
  sleep:{name:"Sleep",unit:"h",dec:1,ref:"7 h or more",src:"SLEEP",
      eval:v=> v>=7?'good': v>=5.5?'warn':'bad'},
  mood:{name:"Mood and stress check",unit:"/5",dec:0,ref:"4 to 5",src:"HRP_HAZ",
      eval:v=> v>=4?'good': v>=3?'warn':'bad'},
  water:{name:"Water intake",unit:"L",dec:1,ref:"2.5 L a day",src:"STD3001_ECLSS",
      eval:v=> v>=2.2?'good': v>=1.6?'warn':'bad'},
  kcal:{name:"Energy intake",unit:"kcal",dec:0,ref:"about 3,000 kcal a day",src:"STD3001_ECLSS",
      eval:v=> v>=2600?'good': v>=2100?'warn':'bad'},
  na:{name:"Sodium",unit:"mmol/L",dec:0,ref:"135 to 145 mmol/L",src:"LYTES",
      eval:v=> v>=135&&v<=145?'good': v>=130&&v<=150?'warn':'bad'},
  k:{name:"Potassium",unit:"mmol/L",dec:1,ref:"3.5 to 5.0 mmol/L",src:"LYTES",
      eval:v=> v>=3.5&&v<=5.0?'good': v>=3.0&&v<=5.5?'warn':'bad'},
  bmd:{name:"Bone density loss rate",unit:"%/month",dec:1,ref:"below 1 % a month",src:"HRP_BONE",
      eval:v=> v<1.0?'good': v<=1.5?'warn':'bad'},
  career:{name:"Career radiation dose",unit:"mSv",dec:0,ref:"career limit 600 mSv",src:"STD3001_RAD",
      eval:v=> v<300?'good': v<480?'warn':'bad'},
  strength:{name:"Strength vs preflight",unit:"%",dec:0,ref:"90 % or more",src:null,
      eval:v=> v>=90?'good': v>=80?'warn':'bad'},
  /* habitat */
  co2:{name:"Cabin CO2 (1-hour average)",unit:"mmHg",dec:1,ref:"3 mmHg or less",src:"STD3001_CO2",
      eval:v=> v<=3.0?'good': v<=4.0?'warn':'bad'},
  o2:{name:"Oxygen partial pressure",unit:"mmHg",dec:0,ref:"145 to 155 mmHg",src:"STD3001_ECLSS",
      eval:v=> v>=145&&v<=155?'good': v>=135&&v<=165?'warn':'bad'},
  ctemp:{name:"Cabin temperature",unit:"°C",dec:1,ref:"20 to 25 °C",src:"STD3001_ECLSS",
      eval:v=> v>=20&&v<=25?'good': v>=18&&v<=27?'warn':'bad'},
  rh:{name:"Relative humidity",unit:"%",dec:0,ref:"30 to 60 %",src:"STD3001_ECLSS",
      eval:v=> v>=30&&v<=60?'good': v>=25&&v<=75?'warn':'bad'},
  press:{name:"Total cabin pressure",unit:"kPa",dec:1,ref:"34.5 to 103 kPa",src:"STD3001_ECLSS",
      eval:v=> v>34.5&&v<=103?'good':'bad'},
  dose:{name:"Area radiation dose rate",unit:"mSv/day",dec:2,ref:"below 0.8 mSv a day",src:"STD3001_RAD",
      eval:v=> v<0.8?'good': v<1.3?'warn':'bad'}
};
const STATUS_WORD={good:"Nominal",warn:"Caution",bad:"Warning"};
const STATUS_MEANING={good:"Within reference range. Keep the routine.",warn:"Outside reference range. Follow the guide and re-check.",bad:"Send a summary to the Crew Medical Officer for review."};
const STATUS_COLOR={good:"#3DB97A",warn:"#E3A23B",bad:"#E85D5A"};

/* ---------- Missions ---------- */
const MISSIONS = {
  iss:{name:"ISS, low Earth orbit",short:"ISS",gravity:"Microgravity",delay:0,delayTxt:"Real time",
       modules:["Destiny (US Lab)","Harmony (Node 2)","Tranquility (Node 3)","Columbus","Kibo"],
       eq:{R:"ARED",T:"T2 treadmill",C:"CEVIS cycle",B:"Resistance band"},path:"CMO on board reviews first; ground flight surgeons see the summary in real time."},
  orion:{name:"Orion, lunar flyby",short:"Orion",gravity:"Microgravity",delay:1.3,delayTxt:"1.3 s delay",
       modules:["Crew module"],
       eq:{R:"Compact flywheel device",T:"Flywheel rowing",C:"Flywheel rowing",B:"Resistance band"},path:"CMO reviews on board; flight surgeons respond within seconds."},
  lunar:{name:"Lunar surface habitat",short:"Lunar base",gravity:"Lunar gravity (about 1/6 g)",delay:1.3,delayTxt:"1.3 s delay",
       modules:["Habitat A","Habitat B","Airlock"],
       eq:{R:"Resistive device",T:"Treadmill",C:"Cycle",B:"Resistance band"},path:"CMO reviews on board; flight surgeons respond within seconds."},
  mars:{name:"Mars transit vehicle",short:"Mars transit",gravity:"Microgravity",delay:12*60,delayTxt:"12 min delay",
       modules:["Transit habitat","Shelter core"],
       eq:{R:"Resistive device",T:"Treadmill",C:"Cycle",B:"Resistance band"},path:"CMO decides on board. Flight surgeon copy arrives after the light delay, so a reply takes at least twice as long."}
};

/* ---------- Crew (fictional people, simulated data) ----------
   series spec: [start, end, noise] over 14 days, deterministic */
const CREW = [
  {id:"reyes",name:"CDR A. Reyes",role:"Commander",day:142,module:0,prior:61,missionDose:63,bmd:1.4,
   spec:{hr:[66,84,2],sys:[114,121,3],dia:[73,78,2],glu:[90,94,3],temp:[36.7,38.4,.12],spo2:[98,97,.5],sleep:[7.3,6.4,.4],mood:[4,3,.3],
         water:[2.5,1.4,.15],kcal:[2900,2350,90],na:[140,138,1],k:[4.2,3.8,.1]},
   muscles:{traps:96,shoulders:95,chest:94,biceps:97,triceps:93,forearms:98,abs:89,obliques:91,lats:90,lowerback:86,glutes:92,quads:85,hamstrings:88,calves:78},
   sessions:[9,14],eyes:"good",flags:["fever"]},
  {id:"santos",name:"FE M. Santos",role:"Flight Engineer",day:96,module:2,prior:18,missionDose:43,bmd:1.1,
   spec:{hr:[62,66,2],sys:[112,117,3],dia:[72,76,2],glu:[88,91,3],temp:[36.6,36.8,.1],spo2:[98,98,.4],sleep:[6.8,5.9,.35],mood:[4,3,.3],
         water:[2.4,2.1,.15],kcal:[3000,2850,80],na:[141,140,1],k:[4.3,4.2,.1]},
   muscles:{traps:94,shoulders:92,chest:95,biceps:95,triceps:94,forearms:97,abs:92,obliques:93,lats:88,lowerback:84,glutes:93,quads:91,hamstrings:92,calves:90},
   sessions:[12,14],eyes:"warn",flags:["vision","co2"]},
  {id:"cruz",name:"MS J. Cruz",role:"Mission Specialist",day:38,module:1,prior:0,missionDose:17,bmd:0.7,
   spec:{hr:[64,63,2],sys:[110,112,3],dia:[70,71,2],glu:[86,88,3],temp:[36.6,36.7,.1],spo2:[99,98,.4],sleep:[7.4,7.6,.3],mood:[4,5,.3],
         water:[2.4,2.0,.15],kcal:[3050,3000,70],na:[141,141,1],k:[4.1,3.4,.08]},
   muscles:{traps:99,shoulders:98,chest:98,biceps:99,triceps:98,forearms:99,abs:96,obliques:97,lats:97,lowerback:95,glutes:98,quads:96,hamstrings:97,calves:94},
   sessions:[13,14],eyes:"good",flags:[]}
];

/* ---------- Habitat (simulated, per module, 24 h at 1 h steps from spec) ---------- */
const HABITAT = {
  0:{co2:[2.4,2.9,.15],o2:[151,150,1],ctemp:[22.6,23.4,.3],rh:[44,48,2],press:[101.3,101.2,.05],dose:[.42,.46,.02]},
  1:{co2:[2.1,2.3,.15],o2:[151,151,1],ctemp:[22.0,22.4,.3],rh:[42,44,2],press:[101.3,101.3,.05],dose:[.40,.41,.02]},
  2:{co2:[2.8,3.4,.15],o2:[150,149,1],ctemp:[23.5,24.6,.3],rh:[50,58,2],press:[101.2,101.2,.05],dose:[.43,.44,.02]},
  3:{co2:[2.2,2.4,.15],o2:[151,151,1],ctemp:[22.0,22.2,.3],rh:[45,45,2],press:[101.3,101.3,.05],dose:[.44,.45,.02]},
  4:{co2:[2.3,2.6,.15],o2:[151,150,1],ctemp:[22.4,22.8,.3],rh:[46,47,2],press:[101.3,101.3,.05],dose:[.45,.47,.02]}
};

/* ---------- NASA DONKI notifications, 2026-10-16 to 2026-11-15 (cached on board, real data) ---------- */
const DONKI = [
  ["CME","20261115-AL-001","2026-11-15T01:21Z","C-type CME detected by GOES / SOHO."],
  ["RBE","20261114-AL-001","2026-11-14T21:34Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["CME","20261113-AL-001","2026-11-13T16:25Z","C-type CME detected by STEREO A / SOHO."],
  ["RBE","20261112-AL-001","2026-11-12T21:30Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["Report","20261111-7D-001","2026-11-11T21:02Z","Solar activity was at moderate level during this reporting period, with 7 M-class flares and 7 C-type CMEs."],
  ["RBE","20261110-AL-003","2026-11-10T21:31Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["CME","20261110-AL-002","2026-11-10T16:29Z","C-type CME detected by GOES / STEREO A / SOHO."],
  ["CME","20261110-AL-001","2026-11-10T13:06Z","C-type CME detected by GOES."],
  ["RBE","20261108-AL-002","2026-11-08T21:28Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["RBE","20261108-AL-001","2026-11-08T21:18Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["CME","20261106-AL-001","2026-11-06T01:56Z","C-type CME detected by GOES / SOHO."],
  ["RBE","20261105-AL-001","2026-11-05T13:29Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["Report","20261104-7D-001","2026-11-04T21:04Z","Solar activity was at low levels during this reporting period with one C-type CME."],
  ["RBE","20261103-AL-001","2026-11-03T13:28Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["CME","20261101-AL-002","2026-11-01T16:06Z","C-type CME detected by STEREO A / GOES / SOHO."],
  ["RBE","20261101-AL-001","2026-11-01T13:28Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["GST","20261031-AL-002","2026-10-31T21:11Z","Ongoing space weather storm in the Earth's magnetosphere."],
  ["GST","20261031-AL-001","2026-10-31T21:04Z","Ongoing space weather storm in the Earth's magnetosphere."],
  ["RBE","20261030-AL-001","2026-10-30T15:15Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["Report","20261028-7D-001","2026-10-28T20:01Z","Solar activity was at low levels during this reporting period with 11 C-type CMEs."],
  ["RBE","20261028-AL-001","2026-10-28T15:15Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["CME","20261027-AL-001","2026-10-27T00:17Z","C-type CME detected by GOES / SOHO."],
  ["RBE","20261026-AL-003","2026-10-26T20:37Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["CME","20261026-AL-002","2026-10-26T17:15Z","Update on CME 2026-10-26T09:48:00-CME-001, now simulated together with CME 2026-10-26T09:00:00-CME-001."],
  ["CME","20261026-AL-001","2026-10-26T13:50Z","C-type CME detected by STEREO A / GOES / SOHO."],
  ["RBE","20261024-AL-001","2026-10-24T20:46Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["CME","20261023-AL-001","2026-10-23T12:51Z","C-type CME detected by STEREO A / GOES / SOHO."],
  ["RBE","20261022-AL-002","2026-10-22T20:40Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["RBE","20261022-AL-001","2026-10-22T20:28Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["CME","20261021-AL-001","2026-10-21T23:44Z","C-type CME detected by STEREO A / GOES / SOHO."],
  ["Report","20261021-7D-001","2026-10-21T20:09Z","Solar activity was at low to moderate levels during this reporting period with 2 M-class flares, 5 C-type CMEs, and one O-type CME."],
  ["CME","20261017-AL-001","2026-10-17T13:12Z","O-type CME detected by STEREO A / GOES / SOHO."],
  ["RBE","20261016-AL-002","2026-10-16T13:43Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."],
  ["RBE","20261016-AL-001","2026-10-16T13:28Z","Significantly elevated energetic electron fluxes in the Earth's outer radiation belt."]
];
const DONKI_TYPES = {
  RBE:{label:"RBE",name:"Radiation belt enhancement",color:"#B7C3D1",bg:"rgba(183,195,209,.10)",action:"Elevated electrons in Earth's outer radiation belt. Low effect inside the cabin; flight control reviews any planned spacewalk."},
  CME:{label:"CME",name:"Coronal mass ejection",color:"#B7C3D1",bg:"rgba(183,195,209,.10)",action:"Watch only. A CME can lead to a geomagnetic storm or particle event; no crew action unless an SEP alert follows."},
  GST:{label:"GST",name:"Geomagnetic storm",color:"#B7C3D1",bg:"rgba(183,195,209,.10)",action:"Storm in Earth's magnetosphere. Expect higher dose rates on orbits through high latitudes; keep dosimeter on."},
  SEP:{label:"SEP",name:"Solar energetic particles",color:"#E85D5A",bg:"rgba(232,93,90,.15)",action:"Move to the shielded area and follow the solar event procedure until the all-clear."},
  Report:{label:"WEEK",name:"Weekly space weather report",color:"#8A94A1",bg:"rgba(138,148,161,.10)",action:"Weekly summary from NASA's space weather team."}
};

/* ---------- Muscle groups (Train mode) ---------- */
const HZ = {R:"Radiation",I:"Isolation",D:"Distance",G:"Gravity",E:"Hostile environment"};
const MUSCLES = {
  traps:{n:"Trapezius (traps)",fn:"Lifts and stabilizes the shoulder blades and supports the neck.",ex:[
    ["Shrug","R","3 x 12","Lift straight up, pause 1 s, lower slowly."],["Face pull","B","3 x 15","Pull the band to eye level, elbows high."],["Upright row","R","3 x 10","Bar close to the body, stop at chest height."]]},
  shoulders:{n:"Shoulders (deltoids)",fn:"Raise and rotate the arms; key for handling cargo and spacewalk tasks.",ex:[
    ["Overhead press","R","3 x 10","Brace the core against the platform, press straight up."],["Lateral raise","B","3 x 12","Raise to shoulder height, lower over 2 s."],["Rear-delt fly","B","3 x 15","Arms slightly bent, squeeze shoulder blades."]]},
  chest:{n:"Chest (pectorals)",fn:"Pushing muscles that get little natural load in microgravity.",ex:[
    ["Bench press","R","4 x 8","Bar path over mid-chest, full range."],["Push-up, band resisted","B","3 x 12","Feet in restraints, body in one line."],["Band fly","B","3 x 12","Slight elbow bend, slow return."]]},
  biceps:{n:"Biceps",fn:"Bend the elbow; used in every pull and handrail move.",ex:[
    ["Curl","R","3 x 10","Elbows fixed at the sides."],["Hammer curl","B","3 x 12","Thumbs up, slow lowering."],["Isometric hold","B","3 x 30 s","Hold at 90 degrees."]]},
  triceps:{n:"Triceps",fn:"Straighten the elbow; work in every push.",ex:[
    ["Close-grip bench press","R","3 x 10","Hands shoulder-width, elbows tucked."],["Overhead extension","B","3 x 12","Upper arms still, extend fully."],["Band pushdown","B","3 x 15","Lock elbows at the sides."]]},
  forearms:{n:"Forearms and grip",fn:"Grip strength for tools, handrails and gloves.",ex:[
    ["Wrist curl","R","3 x 15","Forearms supported, slow tempo."],["Grip trainer","B","3 x 20","Full squeeze, controlled release."],["Isometric bar hold","R","3 x 30 s","Hold the bar at mid-thigh."]]},
  abs:{n:"Abdominals",fn:"Brace the spine; less active when posture is not held against gravity.",ex:[
    ["Dead bug","B","3 x 12 per side","Feet in restraints, low back flat."],["Hollow hold","B","3 x 30 s","Ribs down, legs long."],["Cable crunch","R","3 x 12","Curl the spine, do not pull with arms."]]},
  obliques:{n:"Obliques",fn:"Rotate and side-bend the trunk; resist twisting.",ex:[
    ["Pallof press","B","3 x 10 per side","Press out, resist rotation."],["Band rotation","B","3 x 12 per side","Turn from the ribs, hips fixed."],["Side hold in foot loops","B","3 x 25 s","Body in a straight line."]]},
  lats:{n:"Latissimus dorsi (lats)",fn:"Pull the arms down and back; large back muscle.",ex:[
    ["Bent-over row","R","3 x 10","Neutral spine, pull to lower ribs."],["Band pull-down","B","3 x 12","Elbows to the hips."],["Single-arm row","B","3 x 12 per side","Pause at the top."]]},
  lowerback:{n:"Lower back (spinal erectors)",fn:"Hold the spine upright. These weaken without gravity, and back pain is common in space.",ex:[
    ["Deadlift","R","3 x 8","Hinge at the hips, neutral spine."],["Good morning","R","3 x 10","Soft knees, push hips back."],["Bird dog","B","3 x 10 per side","Slow, no rotation."]]},
  glutes:{n:"Glutes",fn:"Hip extension and stability; needed for walking after landing.",ex:[
    ["Squat","R","4 x 8","Full depth, knees track over toes."],["Hip thrust","R","3 x 10","Pause at the top, ribs down."],["Band side step","B","3 x 15 per side","Stay low, short steps."]]},
  quads:{n:"Quadriceps",fn:"Straighten the knee. Leg muscles lose the most mass in low gravity.",ex:[
    ["Back squat","R","4 x 8","Push through heels, steady tempo."],["Split squat","R","3 x 10 per side","Front knee over mid-foot."],["Interval run","T","20 min","Harness load as prescribed."]]},
  hamstrings:{n:"Hamstrings",fn:"Bend the knee and extend the hip.",ex:[
    ["Romanian deadlift","R","3 x 10","Slight knee bend, hinge back."],["Band leg curl","B","3 x 12","Slow lowering."],["Cycle intervals","C","15 min","Steady cadence."]]},
  calves:{n:"Calves and shins",fn:"Ankle push-off and balance. Calf loss raises fall and sprain risk after landing.",ex:[
    ["Heel raise","R","4 x 15","Pause 1 s at the top."],["Single-leg heel raise","B","3 x 12 per side","Full range, slow."],["Treadmill walk","T","15 min","Focus on heel-to-toe push-off."]]}
};
const GROUP_TO_MUSCLE = {traps:"traps",shoulders:"shoulders",chest:"chest",biceps:"biceps",triceps:"triceps",forearms:"forearms",abs:"abs",obliques:"obliques",lats:"lats",lowerback:"lowerback",glutes:"glutes",quads:"quads",hamstrings:"hamstrings",calves:"calves",shins:"calves"};

/* ---------- Treat (offline first-aid guides, adapted for microgravity) ---------- */
const ZONES = {
  head:{n:"Head and face",conds:["headache","eye","nosebleed","bump","motion"]},
  neck:{n:"Neck",conds:["neckstrain","headache"]},
  shoulder:{n:"Shoulder",conds:["strain","bruise"]},
  chest:{n:"Chest",conds:["chestpain","breath"]},
  abdomen:{n:"Abdomen",conds:["nausea","abdpain"]},
  back:{n:"Back",conds:["backpain","strain"]},
  upperarm:{n:"Upper arm",conds:["strain","bruise"]},
  forearm:{n:"Forearm and wrist",conds:["strain","skin","bruise"]},
  hand:{n:"Hand and fingers",conds:["cut","burn","nail"]},
  hip:{n:"Hip and groin",conds:["strain","cramp"]},
  thigh:{n:"Thigh",conds:["strain","cramp","bruise"]},
  knee:{n:"Knee",conds:["kneepain","bruise"]},
  lowerleg:{n:"Lower leg and ankle",conds:["sprain","cramp","bruise"]}
};
const ZONE_OF = (g,view)=>({head:"head",neck:"neck",traps:view==='f'?"neck":"back",shoulders:"shoulder",chest:"chest",sternum:"chest",abs:"abdomen",obliques:"abdomen",pelvis:"hip",lats:"back",lowerback:"back",biceps:"upperarm",triceps:"upperarm",forearms:"forearm",hands:"hand",glutes:"hip",quads:"thigh",hamstrings:"thigh",knees:"knee",shins:"lowerleg",calves:"lowerleg",feet:"lowerleg"})[g];
const MEDNOTE = "Use medicines only as listed in your mission medical checklist or as directed by the CMO or flight surgeon.";
const GUIDES = {
  headache:{n:"Headache",why:"In space, headaches often come from cabin CO2 build-up, fluid shifting toward the head, dehydration or poor sleep.",
    red:["Sudden, severe headache (worst ever)","Headache with vision change, confusion, weakness or numbness","Headache after a head bump","Fever with a stiff neck"],
    steps:[["Check the air","Open Habitat. If CO2 is above 3 mmHg, move to a well-ventilated module and tell the crew."],["Drink water","Take 250 to 500 mL over the next 30 minutes."],["Rest","Rest 20 minutes in a quiet, dim area with your head still."],["Re-check in 1 hour","Log the headache again. If it lasts past 24 hours or keeps returning, send a summary for review."]],
    kit:"Water pouch, sleep mask. "+MEDNOTE, linked:["co2","water","sleep"]},
  eye:{n:"Something in the eye",why:"Particles float instead of falling in microgravity, so debris in the eye is a common complaint.",
    red:["Chemical splash","Loss of vision or severe pain","Object stuck in the eye","Pain lasting after flushing"],
    steps:[["Do not rub","Rubbing can scratch the eye."],["Flush the eye","Use the eyewash or clean water pouch. Flush from the inner corner outward for several minutes."],["Blink and look","Blink several times and check in a mirror with a crewmate's help."],["Re-check","If it still hurts or vision is blurry after 15 minutes, send a summary for review."]],
    kit:"Eyewash, sterile water pouch, mirror, eye shield. "+MEDNOTE, linked:["co2"]},
  nosebleed:{n:"Nosebleed",why:"Dry cabin air and fluid shifts can cause nosebleeds. Blood will not drain downward, so catch it with gauze.",
    red:["Bleeding longer than 20 minutes","Nosebleed after a head injury","Heavy bleeding or trouble breathing"],
    steps:[["Stay upright and lean forward","Keep the head slightly forward so blood is not swallowed."],["Pinch the soft part","Pinch below the bony bridge for 10 to 15 minutes without letting go."],["Contain droplets","Hold gauze or an absorbent wipe under the nose; floating droplets must be captured."],["Cool and rest","Cold pack on the bridge of the nose. Avoid blowing the nose for several hours."]],
    kit:"Gauze, absorbent wipes, cold pack, gloves. "+MEDNOTE, linked:["rh","sys"]},
  bump:{n:"Head bump",why:"Bumps against hatches and handrails happen while floating between modules.",
    red:["Lost consciousness, even briefly","Vomiting, confusion or worsening headache","Unequal pupils or trouble speaking","Drowsiness that will not go away"],
    steps:[["Stop and stay still","Stop the task and hold a handrail."],["Cold pack","Apply a wrapped cold pack for 15 minutes."],["Buddy watch","A crewmate checks on you every few hours for the next 24 hours."],["Log symptoms","Log headache, nausea or vision change. Any red flag means review now."]],
    kit:"Cold pack, penlight for pupil check. "+MEDNOTE, linked:[]},
  motion:{n:"Space motion sickness",why:"Common in the first days of microgravity while the inner ear adapts.",
    red:["Vomiting that will not stop","Signs of dehydration (very dark urine, dizziness)","Symptoms after day 4 in space"],
    steps:[["Keep the head still","Avoid fast head turns; move the whole body slowly."],["Pick a visual 'up'","Align your body with the module floor and ceiling."],["Small sips","Take small sips of water often; keep an emesis bag nearby."],["Tell the CMO","Report symptoms so the medical checklist can be followed."]],
    kit:"Emesis bags, water pouch. "+MEDNOTE, linked:["water"]},
  neckstrain:{n:"Neck strain",why:"Holding the head in odd angles during tasks can strain neck muscles.",
    red:["Numbness, tingling or weakness in the arms","Neck pain after a head injury","Severe pain with fever"],
    steps:[["Rest the neck","Pause tasks that need looking up or turning."],["Warm pack","Apply a warm pack for 15 minutes."],["Gentle range of motion","Slowly turn and tilt the head within comfort, 5 times each way."],["Re-check tomorrow","Log the pain level. Send a summary if it is not improving after 48 hours."]],
    kit:"Warm pack. "+MEDNOTE, linked:[]},
  strain:{n:"Muscle strain",why:"Strains happen during exercise or cargo handling, especially with heavier ARED loads.",
    red:["A pop with sudden weakness","Large swelling or deformity","Numbness or loss of movement"],
    steps:[["Stop that exercise","Skip the exercise that hurts and tell your trainer."],["Cold pack","Wrap a cold pack and apply 15 to 20 minutes, every 2 to 3 hours on day 1."],["Compress","Use an elastic wrap, snug but not tight."],["Ease back","After 48 hours, start gentle movement and lighter loads."]],
    kit:"Cold pack, elastic wrap. "+MEDNOTE, linked:["strength"]},
  bruise:{n:"Bruise",why:"Bumps against equipment are common while moving through modules.",
    red:["Very large or fast-growing bruise","Bruising without any bump","Severe pain or numbness"],
    steps:[["Cold pack","Wrapped cold pack for 15 minutes."],["Protect","Pad the area if it touches equipment often."],["Watch it","Log the size today and tomorrow."]],
    kit:"Cold pack. "+MEDNOTE, linked:[]},
  chestpain:{n:"Chest pain or pressure",why:"Chest pain is never self-treated. It is reviewed by the medical team right away.",
    red:["Any chest pain, pressure or tightness","Pain spreading to arm, jaw or back","Shortness of breath, sweating or fainting"],
    steps:[["Stop all activity","Stop now and stay still."],["Alert the crew","Call the Crew Medical Officer immediately."],["Send for review","The summary below is sent with your latest heart readings."],["Follow the CMO","The CMO follows the emergency checklist with flight surgeons."]],
    kit:"Medical kit and monitor, used by the CMO.", linked:["hr","sys","spo2"],urgent:true},
  breath:{n:"Shortness of breath",why:"Can come from cabin air problems (CO2, low oxygen) or from the body itself.",
    red:["Breathless at rest","Chest pain or lips turning blue","Oxygen saturation below 92 %"],
    steps:[["Check the air","Open Habitat and check CO2 and oxygen; move to another module if they are out of range."],["Measure SpO2","Use the pulse oximeter on a warm finger and stay still for 30 s."],["Rest","Sit still and breathe slowly for 5 minutes."],["Send for review","If SpO2 is below 95 % or breathing does not settle, send a summary."]],
    kit:"Pulse oximeter. "+MEDNOTE, linked:["co2","o2","spo2"]},
  nausea:{n:"Nausea or upset stomach",why:"Can come from motion sickness, food, or illness.",
    red:["Vomiting blood or black material","Severe belly pain","Fever with vomiting","Unable to keep water down for 12 hours"],
    steps:[["Small sips","Small sips of water often."],["Light food","Choose plain menu items for the next meals."],["Rest","Keep head movement low."],["Log it","Log each episode. Send a summary if it lasts past 24 hours."]],
    kit:"Emesis bags, water pouch. "+MEDNOTE, linked:["water","temp"]},
  abdpain:{n:"Belly pain",why:"Most belly pain is minor, but some causes need fast medical care far from Earth.",
    red:["Severe pain, or pain in the lower right side","Hard or rigid belly","Fever with belly pain","Pain with blood in urine or stool"],
    steps:[["Note where and how it feels","Mark the spot on the body map and rate the pain 1 to 10."],["Rest and hydrate","Small sips of water, no heavy exercise."],["Measure temperature","Log a body temperature reading."],["Send for review","Any red flag, or pain over 4 hours, goes to the CMO."]],
    kit:"Thermometer. "+MEDNOTE, linked:["temp","water"]},
  backpain:{n:"Back pain",why:"The spine lengthens in microgravity, and back pain is a common complaint in the first weeks.",
    red:["Numbness or weakness in the legs","Loss of bladder or bowel control","Pain after a fall or impact"],
    steps:[["Fetal tuck","Hold your knees to your chest in a tucked position for 1 to 2 minutes."],["Warm pack","Warm pack on the lower back for 15 minutes."],["Keep training","Continue planned ARED deadlifts and squats with good form unless pain is sharp."],["Log it","Log pain level daily. Send a summary if it gets worse."]],
    kit:"Warm pack. "+MEDNOTE, linked:["strength"]},
  skin:{n:"Dry or irritated skin",why:"Dry cabin air and limited washing can irritate skin.",
    red:["Spreading redness, warmth or pus","Rash with fever","Blistering rash"],
    steps:[["Clean gently","Use a rinseless wipe on the area."],["Moisturize","Apply skin cream from the hygiene kit."],["Do not scratch","Cover the area if needed."],["Photo log","Take a photo in Check-in so changes can be compared."]],
    kit:"Rinseless wipes, skin cream. "+MEDNOTE, linked:["rh"]},
  cut:{n:"Cut or scrape",why:"Sharp edges on equipment can cause small cuts. Blood droplets must be captured.",
    red:["Bleeding that does not stop after 10 minutes of pressure","Deep cut, gaping edges or exposed tissue","Cut from a dirty or chemical source"],
    steps:[["Gloves on","Put on gloves before touching the wound."],["Press","Press with sterile gauze for 5 to 10 minutes; capture any droplets."],["Clean","Clean around the wound with a sterile wipe."],["Cover","Apply a bandage. Check daily for redness or pus."]],
    kit:"Gloves, gauze, sterile wipes, bandages. "+MEDNOTE, linked:[]},
  burn:{n:"Minor burn",why:"Hot food pouches, equipment or electrical faults can cause burns.",
    red:["Burn larger than the palm, or on face, hands, joints or genitals","Blisters or white or charred skin","Electrical or chemical burn"],
    steps:[["Cool it","Cool with clean, cool water from a pouch for 10 to 20 minutes. No ice."],["Remove rings","Take off rings or tight items before swelling starts."],["Cover","Cover loosely with a sterile non-stick dressing."],["Report hand burns","Hand burns can affect spacewalk tasks; send a summary."]],
    kit:"Sterile non-stick dressing, cool water pouch. "+MEDNOTE, linked:[]},
  nail:{n:"Finger or nail injury",why:"Spacesuit gloves can press on the fingertips and damage nails during spacewalks.",
    red:["Nail lifting with severe pain","Signs of infection","Numbness in the fingertips"],
    steps:[["Protect the finger","Cover the nail with a bandage."],["Trim edges","Trim any loose nail edge so it does not catch."],["Report after EVA","Log which fingers are affected after each spacewalk."]],
    kit:"Bandages, nail clippers. "+MEDNOTE, linked:[]},
  cramp:{n:"Muscle cramp",why:"Cramps can follow hard training, low fluids or low potassium.",
    red:["Cramp lasting over 15 minutes","Cramp with swelling and warmth in the calf","Repeated cramps every day"],
    steps:[["Stretch","Gently stretch the muscle and hold 30 seconds."],["Massage","Rub the muscle firmly for 1 minute."],["Hydrate","Drink 250 mL water."],["Check potassium","Open Elements and check potassium and hydration."]],
    kit:"Water pouch. "+MEDNOTE, linked:["k","water"]},
  kneepain:{n:"Knee pain",why:"Knee pain can follow heavy squats or treadmill running.",
    red:["Knee locks or gives way","Large swelling within hours","Unable to bend or straighten"],
    steps:[["Rest from loading","Skip squats and running today."],["Cold pack","Wrapped cold pack 15 minutes."],["Compress","Light elastic wrap."],["Check form","Review squat form with your trainer before loading again."]],
    kit:"Cold pack, elastic wrap. "+MEDNOTE, linked:["strength"]},
  sprain:{n:"Ankle or lower leg sprain",why:"Feet get caught in restraints or handholds, and weaker calves make sprains more likely.",
    red:["Cannot move the ankle or toes","Numbness, cold or pale foot","Visible deformity or a crack sound"],
    steps:[["Rest","Stop the task and keep the leg still in a foot restraint."],["Cold pack","Wrap a cold pack in cloth and apply 15 to 20 minutes, every 2 to 3 hours."],["Compress","Wrap with an elastic bandage from toes to mid-calf, snug but not tight."],["Support, not elevation","Raising the leg does not drain swelling in microgravity; keep it supported and still instead."],["Re-check in 24 hours","Log pain and swelling. Send a summary if it is not improving."]],
    kit:"Cold pack, elastic bandage, splint. "+MEDNOTE, linked:["strength"]}
};

/* ---------- Organs ---------- */
/* side/ly/at = callout column, label height and leader anchor on the anatomy view */
const ORGANS = {
  brain:{side:"L",ly:30,at:[150,30],n:"Brain and behavior",hz:["I","R"],fn:"Sleep, mood and thinking speed are affected by isolation, workload and radiation.",keys:["sleep","mood"],
    act:[["Protect sleep","Dim lights 1 hour before rest; use the sleep station."],["Stay connected","Schedule a private family call this week."],["Re-test tomorrow","Repeat the mood and reaction checks after sleep."]]},
  eyes:{side:"L",ly:78,at:[151,51],n:"Eyes and vision",hz:["G"],fn:"Fluid shifting toward the head can change the eye and vision on long missions (SANS).",keys:[],
    act:[["Vision chart","Use the onboard eye chart and log any change."],["Book a scan","Add an eye ultrasound to the next medical slot."],["Report headaches","Log any headache with the time it started."]]},
  ear:{side:"R",ly:56,at:[183,56],n:"Inner ear (balance)",hz:["G"],fn:"The balance organ adapts to microgravity; this causes motion sickness early and dizziness after landing.",keys:[],
    act:[["Move slowly","Avoid fast head turns in the first days."],["Log dizziness","Note any dizziness during tasks."],["Post-landing","Expect balance training after return."]]},
  heart:{side:"R",ly:132,at:[172,148],n:"Heart and blood vessels",hz:["G","R"],fn:"The heart works less without gravity and can lose fitness; radiation adds long-term risk.",keys:["hr","sys","dia"],
    act:[["Keep cardio","Treadmill or cycle sessions as planned."],["Weekly check","Wear the heart monitor during exercise."],["Watch for","Chest pain, fainting or racing heart: report right away."]]},
  lungs:{side:"L",ly:150,at:[136,140],n:"Lungs",hz:["E"],fn:"Breathing depends on cabin air: CO2 build-up, oxygen level and dust.",keys:["spo2","co2","o2"],
    act:[["Keep air moving","Stay near working vents during long tasks."],["Check Habitat","Compare CO2 to the 3 mmHg limit."],["Watch for","Shortness of breath at rest."]]},
  digestive:{side:"L",ly:238,at:[150,222],n:"Liver, stomach and gut",hz:["D","E"],fn:"Nutrition depends on eating enough of the stored food supply.",keys:["kcal","glu"],
    act:[["Eat the full menu","Low intake is common in space; log every meal."],["Vitamin D","Take the daily supplement with breakfast."],["Watch for","Pain on the right side or yellowing skin."]]},
  kidneys:{side:"R",ly:214,at:[182,206],n:"Kidneys",hz:["G"],fn:"Calcium released from bone raises kidney stone risk, especially with low fluid intake.",keys:["water","na","k"],
    act:[["Drink now","500 mL water in the next hour."],["Spread it out","Reminders every 90 minutes."],["Watch for","Sharp side or back pain: send for review."]]},
  bones:{side:"L",ly:360,at:[124,330],n:"Bones (spine, hips, legs)",hz:["G"],fn:"Without load, weight-bearing bones lose about 1 to 1.5 % of density per month.",keys:["bmd"],
    act:[["Load your bones","Do every ARED squat and deadlift on the plan."],["Calcium and vitamin D","Keep the daily supplement and menu."],["Medical review","Loss faster than 1.5 %/month is sent for review."]]}
};

/* ---------- Elements (Elements mode markers) ---------- */
const ELEMENTS = {
  temp:{n:"Core body temperature",lbl:"Temperature",key:"temp",pos:[160,44],side:"L",ly:34,via:"Oral thermometer, every morning",how:"Use the same thermometer each time, before exercise, and log at the same time of day.",fn:"High readings can mean infection or heat stress."},
  na:{n:"Sodium",lbl:"Sodium",key:"na",pos:[69,193],side:"L",ly:150,via:"Blood draw, weekly",how:"Measured from the weekly blood sample.",fn:"Controls fluid balance and nerve signals."},
  spo2:{n:"Oxygen saturation (SpO2)",lbl:"Blood oxygen",key:"spo2",pos:[22,290],side:"L",ly:268,via:"Pulse oximeter on fingertip",how:"Clip the pulse oximeter on a warm finger and stay still for 30 seconds.",fn:"How well oxygen moves from the lungs into the blood."},
  ca:{n:"Bone loss marker (calcium)",lbl:"Calcium (bone loss)",key:"bmd",pos:[160,262],side:"L",ly:372,via:"Urine sample and bone scans",how:"From urine calcium and scheduled bone scans.",fn:"Calcium leaving bone shows how fast bone density is dropping."},
  rad:{n:"Radiation dose",lbl:"Radiation dose",key:"career",pos:[193,124],side:"R",ly:96,via:"Personal dosimeter, worn always",how:"Wear the personal dosimeter in the chest pocket at all times.",fn:"Space radiation adds up across the whole career."},
  k:{n:"Potassium",lbl:"Potassium",key:"k",pos:[251,193],side:"R",ly:178,via:"Blood draw, weekly",how:"Measured from the weekly blood sample.",fn:"Needed for steady heart rhythm and muscle function."},
  water:{n:"Hydration",lbl:"Hydration",key:"water",pos:[178,232],side:"R",ly:248,via:"Drink log and urine color",how:"Log each pouch you drink. Check urine color in the evening.",fn:"Crew often feel less thirsty in space and drink too little."},
  glu:{n:"Blood sugar",lbl:"Blood sugar",key:"glu",pos:[297,290],side:"R",ly:330,via:"Fingerstick glucometer",how:"Clean the fingertip, prick, and read the glucometer before breakfast.",fn:"Energy balance on a stored-food diet."}
};

/* ---------- Routine (prompts) ---------- */
const ROUTINE = [
  ["07:30","Morning check-in: vitals, sleep, mood","checkin"],
  ["10:30","Resistance session (ARED)","train"],
  ["13:00","Hydration check: 1.2 L by now","water"],
  ["16:00","Cardio session (T2 or CEVIS)","train"],
  ["21:00","Evening log: mood and symptoms","checkin"]
];

/* ---------- Almanac: the offline reference book ----------
   Categories, in reading order. Entries built from GUIDES are added in app.js;
   the entries below cover what the body-area guides do not. */
const ALMANAC_CATS = [
  ["emergency","Emergencies","Act first, read later"],
  ["injury","Injuries","Sprains, cuts, burns and bumps"],
  ["illness","Illness and symptoms","Fever, pain, sleep and the body adapting"],
  ["prevent","Staying healthy in space","Daily habits that prevent problems"],
  ["measure","How to measure","Getting a reading you can trust"]
];
/* which category each body-area guide belongs to */
const GUIDE_CAT = {chestpain:"emergency",breath:"emergency",bump:"emergency",
  sprain:"injury",strain:"injury",bruise:"injury",cut:"injury",burn:"injury",nail:"injury",eye:"injury",nosebleed:"injury",kneepain:"injury",neckstrain:"injury",backpain:"injury",
  headache:"illness",motion:"illness",nausea:"illness",abdpain:"illness",skin:"illness",cramp:"illness"};
const ALMANAC_EXTRA = {
  unresponsive:{cat:"emergency",n:"Crewmate not responding",why:"Fainting, a seizure or a heart problem can leave a crewmate unresponsive. Help on board comes first.",
    red:["Not breathing normally","No response to voice or touch"],
    steps:[["Call for help","Alert the CMO and the crew at once."],["Secure both of you","Restrain the crewmate and yourself to a wall or the floor so you do not drift apart."],["Check breathing","Look, listen and feel for up to 10 seconds."],["No normal breathing: start CPR","Brace your back or feet against a fixed surface and press hard and fast on the center of the chest. The CMO leads from here."],["Breathing: stay with them","Keep the airway open, stay beside them, and note the time and what you saw."]],
    kit:"Medical kit, defibrillator where carried."},
  bleeding:{cat:"emergency",n:"Heavy bleeding",why:"Blood does not drip in microgravity. It pools on the wound and breaks into floating drops.",
    red:["Bleeding that does not slow after 10 minutes of pressure","Spurting blood","Pale, cold skin and a fast heartbeat"],
    steps:[["Gloves on","Put on gloves before touching blood."],["Press firmly","Press gauze hard on the wound and hold for 10 minutes without lifting."],["Catch the drops","Collect floating drops with gauze or a wipe before they reach eyes or equipment."],["Send for review","Any heavy bleed goes to the CMO right away."]],
    kit:"Gloves, gauze, pressure bandage, wipes."},
  smoke:{cat:"emergency",n:"Smoke or toxic air",why:"Fire, overheated equipment or a chemical leak can make cabin air harmful within minutes.",
    red:["Coughing, burning eyes or throat","Dizziness, headache or confusion"],
    steps:[["Protect your airway","Put on the emergency mask or breathing device first."],["Follow the vehicle procedure","Alert the crew and work the emergency checklist."],["Account for everyone","Check every crewmate has a mask on and is responding."],["Afterwards","Rinse eyes with water, log any symptoms, and have the CMO check each crew member."]],
    kit:"Emergency mask, eye wash."},
  pressure:{cat:"emergency",n:"Rapid pressure drop",why:"A leak lowers cabin pressure. Ears, sinuses and lungs feel it first.",
    red:["Ear pain that does not clear","Chest pain or shortness of breath","Confusion or blue lips"],
    steps:[["Follow the vehicle procedure","Mask on and work the pressure-loss checklist."],["Keep breathing","Do not hold your breath while the pressure changes."],["Clear your ears","Swallow, or pinch the nose gently and blow."],["Check the crew","After the event the CMO checks ears, chest and alertness for everyone."]],
    kit:"Emergency mask."},
  sep:{cat:"emergency",n:"Solar particle event",why:"A solar particle event can raise the radiation dose within hours. Shielding cuts the dose.",
    red:["Shelter alert from flight control or the on-board monitor"],
    steps:[["Go to the shelter","Move to the most shielded area straight away."],["Dosimeter on","Check that your personal dosimeter is worn and logging."],["Stay until all-clear","Remain until the alert clears."],["Log the time","The event dose is added to your career total."]],
    kit:"Personal dosimeter.",linked:["career"]},
  fever:{cat:"illness",n:"Fever",why:"A temperature of 38.0 °C or more usually means an infection. In a closed cabin, infections spread to the crew easily.",
    red:["38.5 °C or higher, or fever for more than 48 hours","Stiff neck, rash, confusion or trouble breathing","Pain when passing urine, or pain in the side"],
    steps:[["Re-measure","Rest 15 minutes, use the same thermometer, and log the reading."],["Limit contact","Keep your distance, wash hands often, and use your own towel and utensils."],["Fluids and rest","Drink an extra 500 mL to 1 L through the day and skip exercise."],["Send for review","Any reading at or above 38.0 °C goes to the CMO with your symptoms."]],
    kit:"Thermometer, water pouches, face mask. "+MEDNOTE,linked:["temp","hr","water"]},
  congestion:{cat:"illness",n:"Stuffy nose and puffy face",why:"Fluid shifts toward the head in microgravity, so a blocked nose and a full feeling in the head are common.",
    red:["Severe headache with a change in vision","Fever of 38.0 °C or more","Ear pain with hearing loss"],
    steps:[["Drink to your goal","Low fluid makes mucus thicker."],["Saline spray","Use the saline spray from the kit a few times a day."],["Exercise","Training moves fluid toward the legs for a while and eases the fullness."],["Log it","Add it in Check-in so the trend shows."]],
    kit:"Saline spray, tissues. "+MEDNOTE,linked:["water"]},
  sleep:{cat:"illness",n:"Trouble sleeping",why:"Light changes every 90 minutes in orbit. Noise, workload and cabin CO2 also disturb sleep.",
    red:["No sleep for two nights in a row","Low mood most days for two weeks"],
    steps:[["Keep one schedule","Sleep and wake at the same mission time each day."],["Dark and quiet","Use the eye mask and ear plugs. Dim screens an hour before sleep."],["Check the air","High CO2 in the sleep station makes sleep worse. Check Habitat."],["No late caffeine","None in the 6 hours before sleep."],["Talk to the CMO","If poor sleep lasts more than three nights, send a summary."]],
    kit:"Eye mask, ear plugs. "+MEDNOTE,linked:["sleep","co2","mood"]},
  vision:{cat:"illness",n:"Blurry or changed vision",why:"On long missions, fluid shifts can change the back of the eye and the optic nerve. Changes can be slow and easy to miss.",
    red:["Sudden loss of vision, or a shadow across what you see","Eye pain with headache","Double vision"],
    steps:[["Weekly eye chart","Do the near and far chart and log the result."],["Use your flight glasses","Many crew need adjustable or stronger glasses in flight."],["Report any change","New blur goes to the CMO. An eye scan may be scheduled."],["Keep CO2 low","Check Habitat and move to a well-ventilated module if CO2 is high."]],
    kit:"Eye chart, flight glasses.",linked:["co2"]},
  landing:{cat:"illness",n:"Dizziness after landing",why:"After time in low gravity, blood pools in the legs when you stand. Fainting is common in the first days back.",
    red:["Fainting","Chest pain or a racing heartbeat"],
    steps:[["Stand up slowly","Sit first, then stand while holding a support."],["Fluids and salt","Drink the fluid and salt load you are given before entry."],["Compression garment","Wear it until the medical team clears you."],["Walk with help","Have a crewmate beside you for the first steps."]],
    kit:"Compression garment, fluid and salt tablets."},
  bone:{cat:"prevent",n:"Protecting your bones",why:"Without load, weight-bearing bones lose about 1 to 1.5 % of their density each month.",
    steps:[["Lift heavy","Do every planned resistance session. Heavy loading is the main protection."],["Vitamin D and calcium","Take the supplements on the daily menu."],["Drink enough","Fluid lowers kidney stone risk while calcium leaves bone."],["Watch the rate","Check the bone loss rate in Elements."]],linked:["bmd","water"]},
  muscle:{cat:"prevent",n:"Protecting your muscles",why:"Leg and back muscles shrink fastest without gravity, and you need them on landing.",
    steps:[["Train most days","Follow the daily plan, about 2 hours including cardio."],["Legs and back first","Squats, heel raises and deadlifts protect the muscles used after landing."],["Eat the full menu","Low energy intake speeds muscle loss."],["Test weekly","Compare against preflight in Train."]],linked:["strength","kcal"]},
  hydration:{cat:"prevent",n:"Drinking enough",why:"Thirst drops in microgravity, so crew often drink less than they need.",
    steps:[["Goal 2.5 L a day","Spread it across the day."],["Log each pouch","Tap +250 mL in Check-in."],["Check urine color","Pale yellow is the goal."],["Add 500 mL on training days","Drink around hard sessions."]],linked:["water"]},
  radiation:{cat:"prevent",n:"Limiting radiation dose",why:"Space radiation adds up over a career and raises long-term health risks.",
    steps:[["Wear the dosimeter","Always, in the chest pocket."],["Sleep in shielded areas","Use the better-shielded crew quarters when you can."],["Follow shelter alerts","Move at once when a solar event alert sounds."],["Know your total","Check your career dose in Elements."]],linked:["career"]},
  mind:{cat:"prevent",n:"Mood and isolation",why:"Long missions, a small crew and distance from home all affect mood and teamwork.",
    steps:[["Daily mood check","Log your mood in Check-in. It takes ten seconds."],["Keep routines","Regular meals, exercise and sleep steady the mood."],["Stay in touch","Use your scheduled family and private calls."],["Speak up early","Tell the CMO or a crewmate if low mood lasts more than a week."]],linked:["mood","sleep"]},
  m_hr:{cat:"measure",n:"Resting heart rate",why:"A steady resting rate is a good daily sign of fitness, illness and stress.",
    steps:[["Sit still for 5 minutes","Before getting out of the sleep station is best."],["Sensor snug","Chest strap or wrist sensor, firmly in place."],["Read and log","Log the steady value."]],linked:["hr"]},
  m_bp:{cat:"measure",n:"Blood pressure",why:"Fluid shifts change blood pressure in flight, so regular readings matter.",
    steps:[["Rest 5 minutes","Arm supported, feet in the foot restraint."],["Cuff on bare upper arm","Level with the heart."],["Two readings","One minute apart. Log the lower one."]],linked:["sys","dia"]},
  m_glu:{cat:"measure",n:"Blood sugar",why:"Shows energy balance on a stored-food diet.",
    steps:[["Before breakfast","Measure fasting."],["Clean and prick","Clean the fingertip and prick the side of it."],["Catch the drop","Touch the strip to the drop. Wipe up any floating blood."]],linked:["glu"]},
  m_temp:{cat:"measure",n:"Body temperature",why:"The first sign of most infections.",
    steps:[["Same time, same thermometer","Every morning."],["Wait 30 minutes","After exercise or hot drinks."],["Know the line","38.0 °C or more counts as fever."]],linked:["temp"]},
  m_spo2:{cat:"measure",n:"Blood oxygen",why:"Shows how well oxygen moves from the lungs into the blood.",
    steps:[["Warm the hand","Cold fingers give low readings."],["Clip and keep still","30 seconds on a fingertip."],["Log the steady value","Ignore the first numbers while it settles."]],linked:["spo2"]},
  m_water:{cat:"measure",n:"Hydration",why:"There is no single sensor, so hydration comes from a drink log and simple checks.",
    steps:[["Log every pouch","Each 250 mL counts."],["Check urine color","In the evening."],["Compare with the goal","2.5 L a day."]],linked:["water"]}
};
/* check-in field group to the matching measuring entry */
const MEASURE_OF = {hr:"m_hr",sys:"m_bp",glu:"m_glu",temp:"m_temp",spo2:"m_spo2",sleep:"sleep",water:"m_water"};
