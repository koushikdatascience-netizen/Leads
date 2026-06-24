/**
 * Google Maps Left-Panel Scraper — Stealth Edition
 *
 * Usage:
 *   node scraper.js "liquor shops in Salt Lake Kolkata"
 *   node scraper.js "FL shop Howrah" "wine shop Dum Dum" --headless
 *
 * Install:
 *   npm install playwright-extra puppeteer-extra-plugin-stealth
 */

const { chromium }    = require('playwright-extra');
const stealth         = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth); // hides all bot fingerprints

const fs   = require('fs');
const path = require('path');

// ─── Output ───────────────────────────────────────────────────────────────────

const JSON_FILE = 'leads.json';
const CSV_FILE  = 'leads.csv';

function loadExisting() {
  if (fs.existsSync(JSON_FILE)) {
    try { return JSON.parse(fs.readFileSync(JSON_FILE, 'utf8')); } catch { return []; }
  }
  return [];
}

function saveLeads(leads) {
  fs.writeFileSync(JSON_FILE, JSON.stringify(leads, null, 2));
  const cols   = ['name','rating','reviewCount','businessType','address','phone','status','mapsUrl','query','industry','state','district','source','scrapedAt'];
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows   = [cols.join(','), ...leads.map(l => cols.map(c => escape(l[c])).join(','))];
  fs.writeFileSync(CSV_FILE, rows.join('\n'));
}

function makeLeadKey(lead) {
  const name = String(lead.name || '').trim().toLowerCase();
  const mapsUrl = String(lead.mapsUrl || '').trim();
  const phone = String(lead.phone || '').replace(/\D/g, '');
  const address = String(lead.address || '').trim().toLowerCase();

  if (mapsUrl) return name + '|' + mapsUrl;
  if (phone) return name + '|' + phone;
  return name + '|' + address;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Random delay between min–max ms  (avoids fixed-interval detection)
const jitter = (min = 700, max = 1600) =>
  new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min)) + min));

// Slow human-like scroll in small random steps
async function humanScroll(page, totalPx = 1800) {
  await page.evaluate(async (totalPx) => {
    const feed = document.querySelector('[role="feed"]');
    if (!feed) return;
    let done = 0;
    while (done < totalPx) {
      const step = 80 + Math.floor(Math.random() * 180); // 80–260 px per tick
      feed.scrollTop += step;
      done += step;
      await new Promise(r => setTimeout(r, 120 + Math.floor(Math.random() * 180)));
    }
  }, totalPx);
}

// ─── Core scrape loop ─────────────────────────────────────────────────────────

async function scrapeLeftPanel(page, query, metadata = {}) {
  // Extract coordinates from query if present
  const coordMatch = query.match(/@(\d+\.\d+),(\d+\.\d+)/);
  
  let searchUrl;
  if (coordMatch) {
    // Use direct coordinate URL that bypasses "near me"
    const lat = coordMatch[1];
    const lng = coordMatch[2];
    const searchType = query.replace(/@.*$/, '').trim(); // Get "FL shop" part
    searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchType)}/@${lat},${lng},15z/data=!3m1!4b1`;
    console.log(`\n🔍  Query : "${query}"`);
    console.log(`🌐  URL   : ${searchUrl}`);
    console.log(`📍  Forced: ${lat}, ${lng}`);
  } else {
    searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    console.log(`\n🔍  Query : "${query}"`);
    console.log(`🌐  URL   : ${searchUrl}`);
  }

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await jitter(1200, 2200); // faster settle time after page load

  await page.waitForSelector('[role="feed"]', { timeout: 12000 }).catch(() => {
    console.warn('⚠️  Feed not found — check if Google blocked or changed layout.');
  });

  const leads = loadExisting();
  const seen  = new Set(leads.map(makeLeadKey));

  let newLeadsTotal = 0;
  let stallRounds   = 0;
  const MAX_STALL   = 4;
  const MAX_RESULTS = 100; // Auto-subdivide threshold

  console.log('📜  Scrolling panel…\n');

  while (true) {

    // ── Extract visible cards ────────────────────────────────────────────────
    const cards = await page.evaluate(() => {
      const feed = document.querySelector('[role="feed"]');
      if (!feed) return [];

      // Try multiple selectors for business cards
      const allDivs = [...feed.querySelectorAll(':scope > div')];
      
      return allDivs.map(el => {
        // Name - try multiple possible selectors
        const name =
          el.querySelector('.qBF1Pd')?.textContent?.trim() ||
          el.querySelector('.NrDZNb')?.textContent?.trim() ||
          el.querySelector('[class*="fontHeadline"]')?.textContent?.trim() ||
          el.querySelector('div[aria-hidden="true"]')?.textContent?.trim() ||
          [...el.querySelectorAll('span')].find(s => 
            s.textContent && s.textContent.length > 3 && s.textContent.length < 100
          )?.textContent?.trim() || '';

        if (!name) return null;

        // Rating
        const ratingEl = el.querySelector('.MW4etd') || 
                         el.querySelector('[aria-label*="rated"]') ||
                         [...el.querySelectorAll('span')].find(s => 
                           /^\d\.\d$/.test(s.textContent?.trim())
                         );
        const rating = ratingEl ? parseFloat(ratingEl.textContent) || 0 : 0;

        // Review count - NEW: Look for text with parentheses like "(123)"
        const reviewEl = [...el.querySelectorAll('span')].find(s => {
          const text = s.textContent?.trim();
          return text && /^\(\d+\)$/.test(text);  // Matches "(123)" pattern
        });
        const reviewCount = reviewEl 
          ? parseInt(reviewEl.textContent.replace(/[^0-9]/g, '')) || 0
          : 0;

        // All info spans (category · address · phone · open status)
        // NEW: Google now uses simple spans without W4Efsd wrapper
        const allSpans = [
          ...el.querySelectorAll('.W4Efsd span'),
          ...el.querySelectorAll('span')  // Fallback to all spans
        ]
          .map(s => s.textContent?.trim())
          .filter(s => s && s !== '·' && s !== '•' && s.length > 0);

        const allText = allSpans.join(' | ');

        // Phone - look for number patterns
        const phoneMatch = allText.match(/(\+?[\d][\d\s\-()+]{6,14}\d)/);
        const phone = phoneMatch ? phoneMatch[1].replace(/\s+/g, ' ').trim() : '';

        // Category — typically: "Liquor Shop", "Wine store", etc.
        const categoryKeywords = ['shop', 'store', 'liquor', 'wine', 'restaurant', 'cafe'];
        const businessType = allSpans.find(s => 
          categoryKeywords.some(kw => s.toLowerCase().includes(kw))
        ) || '';

        // Address — longest span that isn't category/phone/status
        const address = allSpans
          .filter(s => {
            const lower = s.toLowerCase();
            return s !== businessType && 
                   s !== phone && 
                   !lower.includes('closed') && 
                   !lower.includes('open') &&
                   !categoryKeywords.some(kw => lower.includes(kw)) &&
                   s.length > 10;  // Addresses are usually longer
          })
          .sort((a, b) => b.length - a.length)[0] || '';

        // Status
        const statusEl =
          el.querySelector('.eXlrNe') ||
          el.querySelector('.oh0gkr') ||
          [...el.querySelectorAll('span')].find(s => /open|closed|hours/i.test(s.textContent));
        const status = statusEl?.textContent?.trim() || '';

        // Stable Maps URL — strip /data= and ?auth tokens
        const rawHref = el.querySelector('a[href*="/maps/place/"]')?.href || 
                        el.querySelector('a[href*="google.com/maps"]')?.href || '';
        const mapsUrl = rawHref.replace(/\/data=.*/, '').replace(/\?.*/, '');

        return { name, rating, reviewCount, businessType, address, phone, status, mapsUrl };

      }).filter(Boolean);
    });

    // Debug: Show extraction stats
    if (cards.length === 0) {
      console.log(`  ⚠️  Found 0 cards - checking page structure...`);
      const debugInfo = await page.evaluate(() => {
        const feed = document.querySelector('[role="feed"]');
        if (!feed) return { hasFeed: false };
        
        const divs = feed.querySelectorAll(':scope > div');
        const firstDiv = divs[0];
        
        return {
          hasFeed: true,
          totalDivs: divs.length,
          firstDivClasses: firstDiv ? firstDiv.className : 'none',
          hasQBF1Pd: feed.querySelectorAll('.qBF1Pd').length,
          hasNrDZNb: feed.querySelectorAll('.NrDZNb').length,
          hasW4Efsd: feed.querySelectorAll('.W4Efsd').length,
          sampleText: firstDiv ? firstDiv.textContent?.substring(0, 100) : 'none'
        };
      });
      console.log(`  🔍 Debug:`, JSON.stringify(debugInfo, null, 2));
    } else {
      console.log(`  📊 Extracted ${cards.length} cards from this scroll position`);
    }

    // ── Dedup + save ─────────────────────────────────────────────────────────
    let newThisRound = 0;
    for (const card of cards) {
      const key = makeLeadKey(card);
      if (!seen.has(key)) {
        seen.add(key);
        leads.push({
          ...card,
          query,
          industry: metadata.industry || '',
          state: metadata.state || '',
          district: metadata.district || '',
          source: metadata.source || 'google maps',
          scrapedAt: new Date().toISOString()
        });
        newThisRound++;
        newLeadsTotal++;
        console.log(
          `  ✅ [${newLeadsTotal}] ${card.name}` +
          (card.rating  ? `  ⭐ ${card.rating}` : '') +
          (card.address ? `  📍 ${card.address}` : '') +
          (card.phone   ? `  📞 ${card.phone}` : '')
        );
      }
    }

    if (newThisRound > 0) saveLeads(leads);

    // ── Check if we exceeded MAX_RESULTS (need subdivision) ──────────────────
    if (newLeadsTotal >= MAX_RESULTS) {
      console.log(`\n⚠️  Reached ${MAX_RESULTS}+ results! This area needs smaller grid blocks.`);
      console.log(`💡  Use geo-scraper.js with 10km grid for better coverage.\n`);
      break;
    }

    // ── End of results ───────────────────────────────────────────────────────
    const reachedEnd = await page.evaluate(() => {
      const feed = document.querySelector('[role="feed"]');
      if (!feed) return false;
      const text = feed.textContent || '';
      if (
        text.includes("You've reached the end") ||
        text.includes("No more results")        ||
        text.includes("end of list")
      ) return true;
      if (feed.querySelector('[data-state="stop"], [jsaction*="endOfList"]')) return true;
      return false;
    });

    if (reachedEnd) { console.log('\n🏁  End of results.'); break; }

    // ── Stall check ──────────────────────────────────────────────────────────
    if (newThisRound === 0) {
      stallRounds++;
      console.log(`  ⏳  Nothing new (${stallRounds}/${MAX_STALL})`);
      if (stallRounds >= MAX_STALL) { console.log('\n⚠️  Stalled — stopping.'); break; }
    } else {
      stallRounds = 0;
    }

    // ── Human-like scroll + random wait ─────────────────────────────────────
    const scrollPx = 1400 + Math.floor(Math.random() * 800); // 1400–2200 px
    await humanScroll(page, scrollPx);
    await jitter(700, 1400);
  }

  return newLeadsTotal;
}

// ─── Runner ───────────────────────────────────────────────────────────────────

// ─── Randomised browser fingerprint pool ─────────────────────────────────────
// Each session picks a random UA + viewport so consecutive sessions look like
// completely different devices to Google's backend.

const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

const VIEWPORT_POOL = [
  { width: 1440, height: 900  },
  { width: 1536, height: 864  },
  { width: 1280, height: 800  },
  { width: 1920, height: 1080 },
  { width: 1366, height: 768  },
];

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Launch one fresh browser for a single query then close it ───────────────

async function launchFreshSession(query, headless, metadata = {}) {
  const ua       = randomPick(UA_POOL);
  const viewport = randomPick(VIEWPORT_POOL);
  const coordMatch = query.match(/@(\d+\.\d+),(\d+\.\d+)/);

  console.log(`\n🖥️   Session fingerprint → ${ua.slice(0, 60)}…`);
  console.log(`📐  Viewport → ${viewport.width}×${viewport.height}`);
  if (coordMatch) {
    console.log(`📍  Geolocation: ${coordMatch[1]}, ${coordMatch[2]}`);
  }

  const browser = await chromium.launch({
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=en-US']
  });

  const context = await browser.newContext({
    userAgent  : ua,
    viewport,
    locale     : 'en-US',
    timezoneId : 'Asia/Kolkata',
    permissions: ['geolocation']  // Grant geolocation so we can set fake coords
  });

  const page = await context.newPage();
  let count = 0;

  try {
    // Set geolocation to match search coordinates if present
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      
      await context.setGeolocation({ latitude: lat, longitude: lng });
    }

    count = await scrapeLeftPanel(page, query, metadata);
  } finally {
    await page.close();
    await context.close();
    await browser.close();   // ← full teardown — no cookies/session carry over
    console.log(`  🔒  Browser closed. Session wiped.`);
  }

  return count;
}

// ─── Orchestrator — runs each query in its own isolated session ───────────────

async function runScraper({ queries, headless = false, pauseRangeMs = [2000, 5000], metadata = {} }) {
  console.log('🚀  Google Maps Stealth Scraper');
  console.log(`🔁  Queries  : ${queries.length}  (one fresh browser each)`);
  console.log(`💾  JSON     : ${path.resolve(JSON_FILE)}`);
  console.log(`📊  CSV      : ${path.resolve(CSV_FILE)}\n`);

  let grandTotal = 0;

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`\n━━━ Query ${i + 1} / ${queries.length} ━━━`);
    console.log(`🔍 Searching: "${query}"`);

    try {
      const count = await launchFreshSession(query, headless, metadata);
      grandTotal += count;
      console.log(`  📦  New leads from this query: ${count}`);
    } catch (err) {
      console.error(`  ❌  Failed: ${err.message}`);
    }

    if (i < queries.length - 1) {
      const [minPauseMs, maxPauseMs] = pauseRangeMs;
      const pauseMs = Math.max(minPauseMs, Math.floor(Math.random() * (maxPauseMs - minPauseMs + 1)) + minPauseMs);
      console.log('\\n  Waiting ' + (pauseMs / 1000).toFixed(1) + 's before next session...');
      await new Promise(r => setTimeout(r, pauseMs));
    }
  }

  console.log(`\n✅  All done!  Total new leads: ${grandTotal}`);
  console.log(`📁  ${path.resolve(JSON_FILE)}  |  ${path.resolve(CSV_FILE)}`);
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const args     = process.argv.slice(2);
  const headless = args.includes('--headless');
  const queries  = args.filter(a => !a.startsWith('--'));

  if (queries.length === 0) {
    console.log('Usage: node scraper.js "query 1" "query 2" ... [--headless]');
    console.log('Example:');
    console.log('  node scraper.js "FL shop Salt Lake Kolkata" "liquor shop Howrah" "wine shop Park Street Kolkata"');
    process.exit(0);
  }

  runScraper({ queries, headless });
}

module.exports = { runScraper };








