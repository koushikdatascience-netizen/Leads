# 🗺️ Geo-Grid FL Shop Scraper - Quick Guide

## Current West Bengal Alcohol Lead Workflow

Use the main app:

```bash
node main.js
```

Then enter:

```text
State: West Bengal
District (or "all"): all
Industry (blank = FL/wine/liquor/bar/alcohol):
```

Leaving industry blank uses a broad alcohol lead set:

```text
FL shop, foreign liquor shop, liquor shop, wine shop, wine store,
beer shop, beer store, alcohol shop, alcohol store, off shop,
bar, licensed bar, bar and restaurant, pub
```

To scrape only one district:

```text
State: West Bengal
District (or "all"): Kolkata
Industry (blank = FL/wine/liquor/bar/alcohol):
```

Before a long run, estimate the search count without scraping:

```bash
node geo-scraper.js --plan "West Bengal" all
node geo-scraper.js --plan "West Bengal" Kolkata
```

The project now stores all 23 current West Bengal districts and common aliases like
`Burdwan`, `Bardhaman`, `West Midnapore`, and `East Midnapore`.

## Faster Multi-State Runs

The scraper also supports:

```text
Odisha / Orissa
Madhya Pradesh / MP
Uttar Pradesh / UP
Haryana
```

Use `fast` mode for large state runs. It searches every district by name and is much
lighter than coordinate-grid scraping:

```bash
node geo-scraper.js --plan "UP" all --mode fast
node geo-scraper.js --plan "MP" all --mode fast
node geo-scraper.js --plan "Odisha" all --mode fast
node geo-scraper.js --plan "Haryana" all --mode fast
```

When running `node main.js`, leave mode blank or type `fast`.

## How It Works

### Simple Input, Smart Output
You only provide:
1. **State** (e.g., West Bengal)
2. **District** (e.g., Kolkata)

The scraper does everything else automatically!

---

## 🚀 Usage

```bash
node geo-scraper.js
```

### Example Session:
```
📍 State (e.g., West Bengal): West Bengal
🏙️  District (e.g., Kolkata): Kolkata

⏳  Analyzing district boundaries...
📐  District bounds: 22.72°N to 22.42°S, 88.48°E to 88.22°W

🔲  PHASE 1: Generating 15km grid blocks...
✅  Created 4 grid blocks (15km)

📊  Phase 1 Search Plan:
  Blocks: 4
  Grid: 15km x 15km
  Threshold: Auto-subdivide if >100 results

🚀  Start Phase 1 scraping? (y/n): y
```

---

## 🎯 Two-Phase System

### Phase 1: 15km Grid (Default)
- Covers the entire district with 15km × 15km blocks
- Fast initial scan
- Stops automatically if >100 results per block

### Phase 2: 10km Grid (Auto-Triggered)
- Activates if Phase 1 finds >50 leads
- Higher resolution 10km × 10km blocks
- More thorough coverage of dense areas
- **Automatic deduplication** - skips existing leads

---

## 📊 Features

✅ **Smart Grid Generation** - Automatically divides district into searchable blocks  
✅ **Coordinate-Based Search** - Uses lat/lng for precise location targeting  
✅ **Auto-Deduplication** - Never saves the same business twice  
✅ **Two-Phase Coverage** - 15km → 10km subdivision for dense areas  
✅ **Stealth Mode** - Anti-detection, randomized fingerprints  
✅ **Dual Output** - Saves to both JSON and CSV  
✅ **Session Isolation** - Fresh browser for each query  

---

## 📁 Output Files

### leads.json
Detailed data including:
- Business name
- Rating & review count
- Address
- Phone number
- Business type
- Google Maps URL
- Coordinates searched
- Timestamp

### leads.csv
Spreadsheet-ready format for Excel/Google Sheets

---

## 🗺️ Supported Districts

### West Bengal (All 23 districts):
- Kolkata, North 24 Parganas, South 24 Parganas
- Howrah, Hooghly, Bardhaman
- Murshidabad, Nadia, Birbhum
- Bankura, Purulia, Paschim Medinipur
- Purba Medinipur, Jalpaiguri, Darjeeling
- Cooch Behar, Alipurduar, Malda
- Dakshin Dinajpur, Uttar Dinajpur

### Major Cities:
- Mumbai, Delhi, Bangalore

**Want to add more districts?** Edit the `DISTRICT_COORDS` object in `geo-scraper.js` with the bounding box coordinates.

---

## 🔧 Customization

### Change Grid Size
Edit in `geo-scraper.js`:
```javascript
const gridPoints15 = generateGrid(bbox, 15); // Change 15 to your preferred km
const gridPoints10 = generateGrid(bbox, 10); // Change 10 to your preferred km
```

### Change Result Threshold
Edit in `scraper.js`:
```javascript
const MAX_RESULTS = 100; // Change threshold for auto-subdivision
```

### Add New Districts
Add to `DISTRICT_COORDS` in `geo-scraper.js`:
```javascript
'district_name': { 
  north: 23.0,  // Northern boundary
  south: 22.5,  // Southern boundary
  east: 88.5,   // Eastern boundary
  west: 88.0    // Western boundary
}
```

Find coordinates: Search "[district name] bounding box coordinates" on Google

---

## 💡 Tips

1. **Start with Phase 1** - It's fast and covers most areas
2. **Use Phase 2 for dense districts** - Urban areas like Kolkata benefit from 10km grid
3. **Check results between phases** - Review leads.json to see coverage
4. **Run in batches** - For large districts, you can run multiple times
5. **CSV for analysis** - Use leads.csv in Excel for filtering/sorting

---

## ⚡ Performance

- **Small district** (e.g., Kolkata): ~4-9 blocks = 10-20 minutes
- **Large district** (e.g., North 24 Parganas): ~20-30 blocks = 30-60 minutes
- **Phase 2** adds ~50% more time but captures 30-40% more leads

---

## 🆚 Comparison: geo-scraper.js vs main.js

| Feature | geo-scraper.js | main.js |
|---------|----------------|---------|
| Input | State + District only | Business type + City + State |
| Grid coverage | ✅ Automatic | ❌ Manual |
| Auto-subdivision | ✅ 15km → 10km | ❌ No |
| Coordinate search | ✅ Yes | ❌ No |
| Best for | **Complete district coverage** | **Specific business types** |

---

## 🐛 Troubleshooting

**"District not found"** → Uses default 50x50km grid, or add coordinates to DISTRICT_COORDS

**Too many results** → Phase 2 auto-triggers with smaller grid

**Google blocking requests** → Stealth mode is active, try increasing delays in scraper.js

**Missing leads** → Run Phase 2 with 10km grid for better coverage

---

## 📞 Support

For issues or to add more districts to the database, check the district coordinates online and add them to the `DISTRICT_COORDS` object.

Happy scraping! 🎯
