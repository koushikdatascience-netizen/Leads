const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'leads.json');

// Load or initialize database
let leads = [];
if (fs.existsSync(dbPath)) {
  leads = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveLead(leadData) {
  // Check for duplicates
  const existing = leads.find(
    lead => lead.business_name === leadData.business_name && 
            lead.address === leadData.address
  );
  
  if (existing) {
    console.log(`  ⏭️  Skip: ${leadData.business_name} (already exists)`);
    return false;
  }
  
  // Add timestamp
  leadData.scraped_at = new Date().toISOString();
  leadData.id = leads.length + 1;
  
  leads.push(leadData);
  
  // Save to file
  fs.writeFileSync(dbPath, JSON.stringify(leads, null, 2));
  
  console.log(`  ✅ Saved: ${leadData.business_name}`);
  return true;
}

function getStats() {
  return { total: leads.length };
}

function getAllLeads() {
  return leads;
}

function close() {
  // No-op for JSON file
}

module.exports = { saveLead, getStats, getAllLeads, close };
