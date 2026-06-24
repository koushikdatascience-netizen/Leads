/**
 * Google Maps Structure Diagnostic Tool
 * Opens Google Maps and shows the exact HTML structure
 */

const { chromium } = require('playwright');

async function diagnose() {
  console.log('🔍 Opening Google Maps to analyze structure...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Search for something
  const query = 'FL shop near 22.4559,88.2589';
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  
  console.log(`📍 Navigating to: ${url}\n`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  // Wait for content to load
  await page.waitForTimeout(4000);
  
  console.log('📊 Analyzing page structure...\n');
  
  // Get detailed structure info
  const structure = await page.evaluate(() => {
    // Find the feed
    const feed = document.querySelector('[role="feed"]');
    
    if (!feed) {
      return { 
        error: 'No [role="feed"] found!',
        bodyChildren: [...document.body.children].map(c => ({
          tag: c.tagName,
          className: c.className?.substring(0, 100),
          id: c.id
        }))
      };
    }
    
    // Analyze feed structure
    const directChildren = [...feed.children];
    const firstCard = directChildren[0];
    
    if (!firstCard) {
      return {
        feedFound: true,
        childCount: directChildren.length,
        feedClassName: feed.className,
        error: 'Feed has no children'
      };
    }
    
    // Deep analysis of first card
    const analyzeElement = (el, depth = 0) => {
      if (depth > 3) return null;
      
      const info = {
        tag: el.tagName,
        className: el.className?.substring(0, 80) || '',
        text: el.textContent?.substring(0, 60)?.trim() || '',
        children: []
      };
      
      [...el.children].slice(0, 5).forEach(child => {
        const childInfo = analyzeElement(child, depth + 1);
        if (childInfo) info.children.push(childInfo);
      });
      
      return info;
    };
    
    // Find all potential business name elements
    const potentialNames = [];
    const allElements = [...feed.querySelectorAll('*')];
    
    allElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 3 && text.length < 100 && el.children.length === 0) {
        potentialNames.push({
          tag: el.tagName,
          className: el.className?.substring(0, 80),
          text: text.substring(0, 80)
        });
      }
    });
    
    return {
      feedFound: true,
      feedClassName: feed.className,
      directChildCount: directChildren.length,
      firstCardStructure: analyzeElement(firstCard),
      potentialBusinessNames: potentialNames.slice(0, 20),
      
      // Check for old selectors
      oldSelectors: {
        qBF1Pd: feed.querySelectorAll('.qBF1Pd').length,
        NrDZNb: feed.querySelectorAll('.NrDZNb').length,
        MW4etd: feed.querySelectorAll('.MW4etd').length,
        UY7F9: feed.querySelectorAll('.UY7F9').length,
        W4Efsd: feed.querySelectorAll('.W4Efsd').length
      }
    };
  });
  
  console.log('═'.repeat(70));
  console.log('GOOGLE MAPS STRUCTURE ANALYSIS');
  console.log('═'.repeat(70));
  console.log(JSON.stringify(structure, null, 2));
  console.log('═'.repeat(70));
  
  // Save to file for easier reading
  const fs = require('fs');
  fs.writeFileSync('maps-structure.json', JSON.stringify(structure, null, 2));
  console.log('\n💾 Full structure saved to: maps-structure.json');
  
  console.log('\n⏸️  Browser will stay open for 30 seconds for manual inspection...');
  console.log('👀 Look at the left panel and see what you can visually identify\n');
  
  await page.waitForTimeout(30000);
  await browser.close();
}

diagnose().catch(console.error);
