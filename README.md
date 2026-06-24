# 🎯 Lead Scraper - Google Maps

A simple Playwright script that scrapes business leads from Google Maps based on user input.

## Features

✅ User-friendly input (business type, city, state, country)  
✅ Automatic search query generation  
✅ Scrapes Google Maps listings  
✅ Extracts business details (name, address, phone, website, rating, etc.)  
✅ Stores data in JSON database  
✅ Duplicate detection  

## Installation

```bash
npm install
npx playwright install chromium
```

## Usage

Run the scraper:

```bash
node main.js
```

You'll be prompted to enter:
- **Business type**: e.g., restaurants, dentists, plumbers, gyms
- **City**: e.g., New York
- **State/Province**: e.g., NY
- **Country**: e.g., USA
- **Max results**: Number of leads to scrape (default: 20)

## Example

```
🏢 Business type: restaurants
🏙️  City: Austin
📍 State/Province: Texas
🌍 Country: USA
📊 Max results: 20
```

## Output

All scraped data is saved to `leads.json` with the following fields:

- Business Name
- Address
- Phone Number
- Website
- Rating
- Review Count
- Business Hours
- Description
- Google Maps URL
- Location (City, State, Country)
- Timestamp

## File Structure

```
lead-scraper/
├── main.js              # Entry point with user input
├── scraper.js           # Playwright scraping logic
├── queryGenerator.js    # Search query optimization
├── database.js          # JSON database handler
├── leads.json           # Scraped data (auto-created)
├── package.json
└── README.md
```

## Notes

- The scraper runs in visible browser mode (`headless: false`) so you can see what's happening
- Set `headless: true` in `scraper.js` line 108 for production use
- Small delays are added between requests to avoid rate limiting
- Duplicate leads are automatically skipped

## License

ISC
