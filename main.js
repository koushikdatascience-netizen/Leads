const {
  runDistrictScraper,
  runStateScraper,
  getSupportedStates,
  getSupportedDistricts
} = require('./geo-scraper');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  console.log('Google Maps FL Shop Lead Scraper\n');

  try {
    console.log(`Supported states: ${getSupportedStates().join(', ')}`);
    const state = await askQuestion('State: ');

    const districts = getSupportedDistricts(state);
    if (districts.length > 0) {
      console.log(`Supported districts in ${state}: ${districts.join(', ')}`);
    }

    const district = await askQuestion('District (or "all"): ');
    const industryInput = await askQuestion('Industry (blank = FL/wine/liquor/bar/alcohol): ');
    const modeInput = await askQuestion('Mode (fast/thorough, blank = fast): ');
    const industry = industryInput || 'alcohol leads';
    const options = { mode: modeInput || 'fast' };

    if (district.toLowerCase().trim() === 'all') {
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

main();
