const { runScraper } = require('./scraper');
const readline = require('readline');

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

const WEST_BENGAL_DISTRICTS = [
  'alipurduar',
  'bankura',
  'birbhum',
  'cooch behar',
  'dakshin dinajpur',
  'darjeeling',
  'hooghly',
  'howrah',
  'jalpaiguri',
  'jhargram',
  'kalimpong',
  'kolkata',
  'malda',
  'murshidabad',
  'nadia',
  'north 24 parganas',
  'paschim bardhaman',
  'paschim medinipur',
  'purba bardhaman',
  'purba medinipur',
  'purulia',
  'south 24 parganas',
  'uttar dinajpur'
];

const ODISHA_DISTRICTS = [
  'angul',
  'balangir',
  'balasore',
  'bargarh',
  'bhadrak',
  'boudh',
  'cuttack',
  'deogarh',
  'dhenkanal',
  'gajapati',
  'ganjam',
  'jagatsinghpur',
  'jajpur',
  'jharsuguda',
  'kalahandi',
  'kandhamal',
  'kendrapara',
  'kendujhar',
  'khordha',
  'koraput',
  'malkangiri',
  'mayurbhanj',
  'nabarangpur',
  'nayagarh',
  'nuapada',
  'puri',
  'rayagada',
  'sambalpur',
  'subarnapur',
  'sundargarh'
];

const MADHYA_PRADESH_DISTRICTS = [
  'agar malwa',
  'alirajpur',
  'anuppur',
  'ashoknagar',
  'balaghat',
  'barwani',
  'betul',
  'bhind',
  'bhopal',
  'burhanpur',
  'chhatarpur',
  'chhindwara',
  'damoh',
  'datia',
  'dewas',
  'dhar',
  'dindori',
  'guna',
  'gwalior',
  'harda',
  'indore',
  'jabalpur',
  'jhabua',
  'katni',
  'khandwa',
  'khargone',
  'maihar',
  'mandla',
  'mandsaur',
  'mauganj',
  'morena',
  'narmadapuram',
  'narsinghpur',
  'neemuch',
  'niwari',
  'pandhurna',
  'panna',
  'raisen',
  'rajgarh',
  'ratlam',
  'rewa',
  'sagar',
  'satna',
  'sehore',
  'seoni',
  'shahdol',
  'shajapur',
  'sheopur',
  'shivpuri',
  'sidhi',
  'singrauli',
  'tikamgarh',
  'ujjain',
  'umaria',
  'vidisha'
];

const UTTAR_PRADESH_DISTRICTS = [
  'agra',
  'aligarh',
  'ambedkar nagar',
  'amethi',
  'amroha',
  'auraiya',
  'ayodhya',
  'azamgarh',
  'baghpat',
  'bahraich',
  'ballia',
  'balrampur',
  'banda',
  'barabanki',
  'bareilly',
  'basti',
  'bhadohi',
  'bijnor',
  'budaun',
  'bulandshahr',
  'chandauli',
  'chitrakoot',
  'deoria',
  'etah',
  'etawah',
  'farrukhabad',
  'fatehpur',
  'firozabad',
  'gautam buddha nagar',
  'ghaziabad',
  'ghazipur',
  'gonda',
  'gorakhpur',
  'hamirpur',
  'hapur',
  'hardoi',
  'hathras',
  'jalaun',
  'jaunpur',
  'jhansi',
  'kannauj',
  'kanpur dehat',
  'kanpur nagar',
  'kasganj',
  'kaushambi',
  'kheri',
  'kushinagar',
  'lalitpur',
  'lucknow',
  'maharajganj',
  'mahoba',
  'mainpuri',
  'mathura',
  'mau',
  'meerut',
  'mirzapur',
  'moradabad',
  'muzaffarnagar',
  'pilibhit',
  'pratapgarh',
  'prayagraj',
  'raebareli',
  'rampur',
  'saharanpur',
  'sambhal',
  'sant kabir nagar',
  'shahjahanpur',
  'shamli',
  'shravasti',
  'siddharthnagar',
  'sitapur',
  'sonbhadra',
  'sultanpur',
  'unnao',
  'varanasi'
];

const HARYANA_DISTRICTS = [
  'ambala',
  'bhiwani',
  'charkhi dadri',
  'faridabad',
  'fatehabad',
  'gurugram',
  'hansi',
  'hisar',
  'jhajjar',
  'jind',
  'kaithal',
  'karnal',
  'kurukshetra',
  'mahendragarh',
  'nuh',
  'palwal',
  'panchkula',
  'panipat',
  'rewari',
  'rohtak',
  'sirsa',
  'sonipat',
  'yamunanagar'
];

const STATE_DISTRICTS = {
  'west bengal': WEST_BENGAL_DISTRICTS,
  odisha: ODISHA_DISTRICTS,
  'madhya pradesh': MADHYA_PRADESH_DISTRICTS,
  'uttar pradesh': UTTAR_PRADESH_DISTRICTS,
  haryana: HARYANA_DISTRICTS
};

const STATE_ALIASES = {
  bengal: 'west bengal',
  wb: 'west bengal',
  orissa: 'odisha',
  odisha: 'odisha',
  mp: 'madhya pradesh',
  'm.p.': 'madhya pradesh',
  madhyapradesh: 'madhya pradesh',
  up: 'uttar pradesh',
  'u.p.': 'uttar pradesh',
  uttarpradesh: 'uttar pradesh',
  haryana: 'haryana'
};

const DISTRICT_ALIASES = {
  '24 parganas north': 'north 24 parganas',
  '24 parganas south': 'south 24 parganas',
  allahabad: 'prayagraj',
  bardhaman: 'purba bardhaman',
  baleshwar: 'balasore',
  burdwan: 'purba bardhaman',
  'east burdwan': 'purba bardhaman',
  'east bardhaman': 'purba bardhaman',
  'east medinipur': 'purba medinipur',
  'east midnapore': 'purba medinipur',
  'gautam buddh nagar': 'gautam buddha nagar',
  gautambuddhanagar: 'gautam buddha nagar',
  gurgaon: 'gurugram',
  hoshangabad: 'narmadapuram',
  keonjhar: 'kendujhar',
  'lakhimpur kheri': 'kheri',
  coochbehar: 'cooch behar',
  koochbehar: 'cooch behar',
  'maldah': 'malda',
  mewat: 'nuh',
  midnapore: 'paschim medinipur',
  'sant ravidas nagar': 'bhadohi',
  'west burdwan': 'paschim bardhaman',
  'west bardhaman': 'paschim bardhaman',
  'west medinipur': 'paschim medinipur',
  'west midnapore': 'paschim medinipur'
};

const ALCOHOL_TERMS = [
  'FL shop',
  'foreign liquor shop',
  'liquor shop',
  'wine shop',
  'wine store',
  'beer shop',
  'beer store',
  'alcohol shop',
  'alcohol store',
  'off shop',
  'bar',
  'licensed bar',
  'bar and restaurant',
  'pub'
];

const REGION_BBOX = {
  'west bengal': {
    alipurduar: { north: 26.75, south: 26.35, east: 89.65, west: 89.05 },
    bankura: { north: 23.55, south: 22.85, east: 87.35, west: 86.75 },
    birbhum: { north: 24.35, south: 23.55, east: 87.85, west: 87.15 },
    'cooch behar': { north: 26.55, south: 26.05, east: 89.75, west: 89.15 },
    'dakshin dinajpur': { north: 25.75, south: 25.15, east: 88.45, west: 88.05 },
    darjeeling: { north: 27.15, south: 26.55, east: 88.45, west: 87.95 },
    hooghly: { north: 23.10, south: 22.40, east: 88.35, west: 87.85 },
    howrah: { north: 22.75, south: 22.35, east: 88.25, west: 87.95 },
    jalpaiguri: { north: 26.75, south: 26.15, east: 88.85, west: 88.15 },
    jhargram: { north: 22.85, south: 22.15, east: 87.30, west: 86.50 },
    kalimpong: { north: 27.20, south: 26.85, east: 88.85, west: 88.35 },
    kolkata: { north: 22.72, south: 22.42, east: 88.48, west: 88.22 },
    malda: { north: 25.35, south: 24.75, east: 88.35, west: 87.85 },
    murshidabad: { north: 24.55, south: 23.75, east: 88.65, west: 87.95 },
    nadia: { north: 23.65, south: 23.05, east: 88.75, west: 88.35 },
    'north 24 parganas': { north: 23.05, south: 22.50, east: 88.95, west: 88.35 },
    'paschim bardhaman': { north: 23.95, south: 23.35, east: 87.50, west: 86.75 },
    'paschim medinipur': { north: 22.85, south: 21.85, east: 87.85, west: 86.85 },
    'purba bardhaman': { north: 23.55, south: 22.90, east: 88.15, west: 87.35 },
    'purba medinipur': { north: 22.35, south: 21.55, east: 88.15, west: 87.35 },
    purulia: { north: 23.65, south: 22.95, east: 86.85, west: 86.15 },
    'south 24 parganas': { north: 22.50, south: 21.50, east: 88.85, west: 87.85 },
    'uttar dinajpur': { north: 26.15, south: 25.55, east: 88.35, west: 87.95 }
  },
  maharashtra: {
    mumbai: { north: 19.27, south: 18.95, east: 72.98, west: 72.77 }
  },
  delhi: {
    delhi: { north: 28.88, south: 28.40, east: 77.35, west: 76.84 }
  },
  karnataka: {
    bangalore: { north: 13.15, south: 12.80, east: 77.80, west: 77.45 },
    bengaluru: { north: 13.15, south: 12.80, east: 77.80, west: 77.45 }
  }
};

function normalize(value) {
  return String(value || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizeState(value) {
  const state = normalize(value);
  return STATE_ALIASES[state] || state;
}

function normalizeDistrict(value) {
  const district = normalize(value);
  return DISTRICT_ALIASES[district] || district;
}

function getSupportedStates() {
  return [...new Set([
    ...Object.keys(STATE_DISTRICTS),
    ...Object.keys(REGION_BBOX)
  ])].sort();
}

function getSupportedDistricts(state) {
  const stateKey = normalizeState(state);
  if (STATE_DISTRICTS[stateKey]) return [...STATE_DISTRICTS[stateKey]];

  const districts = REGION_BBOX[stateKey] || {};
  return Object.keys(districts).sort();
}

function resolveBbox(state, district) {
  const stateKey = normalizeState(state);
  const districtKey = normalizeDistrict(district);
  return REGION_BBOX[stateKey]?.[districtKey] || null;
}

function buildFallbackBbox() {
  return {
    north: 23.0,
    south: 22.5,
    east: 88.5,
    west: 88.0
  };
}

function generateGrid(bbox, gridSizeKm) {
  const points = [];
  const latStep = gridSizeKm / 111.32;
  const midLat = (bbox.north + bbox.south) / 2;
  const lngStep = gridSizeKm / (111.32 * Math.cos(midLat * Math.PI / 180));

  let row = 0;
  for (let lat = bbox.south + latStep / 2; lat < bbox.north; lat += latStep) {
    let col = 0;
    for (let lng = bbox.west + lngStep / 2; lng < bbox.east; lng += lngStep) {
      points.push({
        lat: lat.toFixed(4),
        lng: lng.toFixed(4),
        label: `Block ${row + 1}-${col + 1}`
      });
      col++;
    }
    row++;
  }

  return points;
}

function calculateOptimalGridSize(bbox) {
  const heightKm = (bbox.north - bbox.south) * 111.32;
  const midLat = (bbox.north + bbox.south) / 2;
  const widthKm = (bbox.east - bbox.west) * 111.32 * Math.cos(midLat * Math.PI / 180);
  const areaKm2 = heightKm * widthKm;

  console.log(`District size: ${heightKm.toFixed(1)}km x ${widthKm.toFixed(1)}km (~${areaKm2.toFixed(0)} km2)`);

  if (areaKm2 < 500) return 5;
  if (areaKm2 < 2000) return 8;
  if (areaKm2 < 5000) return 10;
  return 12;
}

function buildQueries(gridPoints, district, state, terms) {
  const queries = [];

  for (const point of gridPoints) {
    for (const term of terms) {
      queries.push(`${term} in ${district}, ${state} @${point.lat},${point.lng},15z`);
    }
  }

  return queries;
}

function buildDistrictQueries(district, state, terms) {
  return terms.map(term => `${term} in ${district}, ${state}`);
}

function isAlcoholIndustry(industry) {
  const value = normalize(industry);
  return !value || /\b(fl|foreign liquor|wine|liquor|alcohol|beer|bar|pub|off shop)\b/.test(value);
}

function buildIndustryTerms(industry) {
  const cleaned = industry.trim();
  if (isAlcoholIndustry(cleaned)) {
    return ALCOHOL_TERMS;
  }

  return [
    cleaned,
    `${cleaned} shop`,
    `${cleaned} store`
  ].filter((term, index, list) => list.indexOf(term) === index);
}

function normalizeMode(mode) {
  const value = normalize(mode);
  return value === 'thorough' || value === 'grid' ? 'thorough' : 'fast';
}

function buildScrapePlan(state, district, industry, options = {}) {
  const stateKey = normalizeState(state);
  const canonicalDistrict = normalizeDistrict(district);
  const exactBbox = resolveBbox(stateKey, canonicalDistrict);
  const industryTerms = buildIndustryTerms(industry);
  const requestedMode = normalizeMode(options.mode);
  const mode = requestedMode === 'thorough' && exactBbox ? 'thorough' : 'fast';

  if (mode === 'fast') {
    return {
      bbox: exactBbox,
      district: canonicalDistrict,
      mode,
      usedFallback: false,
      phase1GridSize: null,
      phase2GridSize: null,
      phase1Queries: buildDistrictQueries(canonicalDistrict, stateKey, industryTerms),
      phase2Queries: [],
      state: stateKey
    };
  }

  const phase1GridSize = calculateOptimalGridSize(exactBbox);
  const phase2GridSize = Math.max(5, phase1GridSize - 2);
  const phase2Terms = isAlcoholIndustry(industry)
    ? ['FL shop', 'liquor shop', 'wine shop', 'bar']
    : [industry.trim()];

  return {
    bbox: exactBbox,
    district: canonicalDistrict,
    mode,
    usedFallback: !exactBbox,
    phase1GridSize,
    phase2GridSize,
    phase1Queries: buildQueries(generateGrid(exactBbox, phase1GridSize), canonicalDistrict, stateKey, industryTerms),
    phase2Queries: buildQueries(generateGrid(exactBbox, phase2GridSize), canonicalDistrict, stateKey, phase2Terms),
    state: stateKey
  };
}

async function runDistrictScraper(state, district, industry, options = {}) {
  const plan = buildScrapePlan(state, district, industry, options);

  console.log(`\nTarget region: ${plan.district}, ${plan.state}`);
  console.log(`Mode: ${plan.mode}`);
  console.log(`Industry terms: ${buildIndustryTerms(industry).join(', ')}`);
  if (plan.bbox) {
    console.log(`Bounds: N ${plan.bbox.north}, S ${plan.bbox.south}, E ${plan.bbox.east}, W ${plan.bbox.west}`);
  }

  if (plan.mode === 'fast') {
    console.log('Fast mode uses district-name searches. Use mode "thorough" for grid search where coordinates exist.');
  }

  const phase1Label = plan.phase1GridSize
    ? `${plan.phase1GridSize}km grid`
    : 'district search';
  console.log(`Phase 1: ${plan.phase1Queries.length} searches using ${phase1Label}`);
  await runScraper({
    queries: plan.phase1Queries,
    headless: true,
    pauseRangeMs: [1500, 3000],
    metadata: {
      state: plan.state,
      district: plan.district,
      source: 'google maps',
      industry
    }
  });

  if (plan.phase2Queries.length === 0) {
    return;
  }

  console.log(`\nPhase 2: refining with ${plan.phase2Queries.length} searches using ${plan.phase2GridSize}km grid`);
  await runScraper({
    queries: plan.phase2Queries,
    headless: true,
    pauseRangeMs: [1000, 2000],
    metadata: {
      state: plan.state,
      district: plan.district,
      source: 'google maps',
      industry
    }
  });
}

async function runStateScraper(state, industry, options = {}) {
  const stateKey = normalizeState(state);
  const districts = getSupportedDistricts(state);
  if (districts.length === 0) {
    throw new Error(`No saved districts found for state: ${state}`);
  }

  console.log(`\nRunning ${districts.length} districts in ${stateKey}: ${districts.join(', ')}`);
  for (let i = 0; i < districts.length; i++) {
    const district = districts[i];
    console.log(`\n=== District ${i + 1}/${districts.length}: ${district} ===`);
    await runDistrictScraper(stateKey, district, industry, options);
  }
}

function summarizeScrapePlan(state, district, industry, options = {}) {
  const plan = buildScrapePlan(state, district, industry, options);
  return {
    district: plan.district,
    mode: plan.mode,
    phase1GridSize: plan.phase1GridSize,
    phase2GridSize: plan.phase2GridSize,
    phase1Queries: plan.phase1Queries.length,
    phase2Queries: plan.phase2Queries.length,
    totalQueries: plan.phase1Queries.length + plan.phase2Queries.length,
    usedFallback: plan.usedFallback
  };
}

function printScrapePlan(state, district, industry, options = {}) {
  const districts = normalize(district) === 'all' ? getSupportedDistricts(state) : [district];
  const summaries = districts.map(item => summarizeScrapePlan(state, item, industry, options));
  const total = summaries.reduce((sum, item) => sum + item.totalQueries, 0);

  console.log(`\nScrape plan for ${normalizeState(state)} / ${district}`);
  console.log(`Mode: ${normalizeMode(options.mode)}`);
  console.log(`Industry terms: ${buildIndustryTerms(industry).join(', ')}`);
  console.log('District | Mode | Phase 1 | Phase 2 | Total');
  console.log('--- | --- | ---: | ---: | ---:');
  for (const item of summaries) {
    console.log(`${item.district} | ${item.mode} | ${item.phase1Queries} | ${item.phase2Queries} | ${item.totalQueries}`);
  }
  console.log(`Total searches: ${total}`);
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('Google Maps FL Shop District Scraper\n');

  try {
    console.log(`Supported states: ${getSupportedStates().join(', ')}`);
    const state = await askQuestion(rl, 'State: ');

    const districts = getSupportedDistricts(state);
    if (districts.length > 0) {
      console.log(`Supported districts in ${state}: ${districts.join(', ')}`);
    }

    const district = await askQuestion(rl, 'District (or "all"): ');
    const industryInput = await askQuestion(rl, 'Industry (blank = FL/wine/liquor/bar/alcohol): ');
    const modeInput = await askQuestion(rl, 'Mode (fast/thorough, blank = fast): ');
    const industry = industryInput || 'alcohol leads';
    const options = { mode: modeInput || 'fast' };

    if (normalize(district) === 'all') {
      await runStateScraper(state, industry, options);
    } else {
      await runDistrictScraper(state, district, industry, options);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--plan') {
    const state = args[1] || 'West Bengal';
    const district = args[2] || 'all';
    const modeArgIndex = args.findIndex(arg => arg === '--mode');
    const mode = modeArgIndex >= 0 ? args[modeArgIndex + 1] : 'fast';
    const industryArgs = modeArgIndex >= 0 ? args.slice(3, modeArgIndex) : args.slice(3);
    const industry = industryArgs.join(' ') || 'alcohol leads';
    printScrapePlan(state, district, industry, { mode });
  } else {
    main();
  }
}

module.exports = {
  REGION_BBOX,
  buildQueries,
  buildDistrictQueries,
  buildIndustryTerms,
  buildScrapePlan,
  calculateOptimalGridSize,
  generateGrid,
  getSupportedDistricts,
  getSupportedStates,
  normalizeDistrict,
  normalizeState,
  printScrapePlan,
  runDistrictScraper,
  runStateScraper,
  summarizeScrapePlan
};
