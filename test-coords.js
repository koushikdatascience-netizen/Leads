// Quick test to verify coordinate search URLs

const testCoords = [
  { lat: '22.4559', lng: '88.2589' },
  { lat: '22.4559', lng: '88.3367' },
  { lat: '22.5278', lng: '88.2589' },
];

console.log('Testing coordinate-based search queries:\n');

testCoords.forEach((coord, i) => {
  const query = `FL shop @${coord.lat},${coord.lng},15z`;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  
  console.log(`Block ${i + 1}:`);
  console.log(`  Query: ${query}`);
  console.log(`  URL: ${url}`);
  console.log(`  Should search at: ${coord.lat}, ${coord.lng}`);
  console.log('');
});

console.log('Key differences from "near" format:');
console.log('  ❌ OLD: "FL shop near 22.4559,88.2589" → Google ignores & uses your location');
console.log('  ✅ NEW: "FL shop @22.4559,88.2589,15z" → Google searches AT those coordinates');
console.log('');
console.log('The @ symbol + zoom level (15z) forces Google to use exact coordinates!');
