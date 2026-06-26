const fs = require('fs');
const { runScraper } = require('./scraper');

async function main() {
  const queryFile = process.argv[2];
  if (!queryFile) {
    console.error('Usage: node platform-runner.js queries.json');
    process.exit(1);
  }

  const entries = JSON.parse(fs.readFileSync(queryFile, 'utf8'));
  if (!Array.isArray(entries) || entries.length === 0) {
    console.error('No queries supplied.');
    process.exit(1);
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = typeof entries[i] === 'string' ? { query: entries[i] } : entries[i];
    console.log(`PLATFORM_QUERY ${i + 1}/${entries.length}`);
    await runScraper({
      queries: [entry.query],
      headless: true,
      pauseRangeMs: [1500, 3000],
      metadata: {
        source: 'google maps',
        state: entry.state || '',
        district: entry.district || '',
        industry: entry.industry || ''
      },
      failFast: true
    });
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
