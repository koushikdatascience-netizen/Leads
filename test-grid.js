// Test grid generation for Kolkata

const DISTRICT_COORDS = {
  'kolkata': { north: 22.72, south: 22.42, east: 88.48, west: 88.22 },
};

function calculateOptimalGridSize(bbox) {
  const heightKm = (bbox.north - bbox.south) * 111.32;
  const midLat = (bbox.north + bbox.south) / 2;
  const widthKm = (bbox.east - bbox.west) * 111.32 * Math.cos(midLat * Math.PI / 180);
  const areaKm2 = heightKm * widthKm;
  
  console.log(`\n📏 District size: ${heightKm.toFixed(1)}km × ${widthKm.toFixed(1)}km (≈${areaKm2.toFixed(0)} km²)`);
  
  if (areaKm2 < 500) {
    console.log('🔲 Using 5km grid (small district)');
    return 5;
  } else if (areaKm2 < 2000) {
    console.log('🔲 Using 8km grid (medium district)');
    return 8;
  } else if (areaKm2 < 5000) {
    console.log('🔲 Using 10km grid (large district)');
    return 10;
  } else {
    console.log('🔲 Using 15km grid (very large district)');
    return 15;
  }
}

function generateGrid(bbox, gridSizeKm = 10) {
  const points = [];
  const latStep = gridSizeKm / 111.32;
  const midLat = (bbox.north + bbox.south) / 2;
  const lngStep = gridSizeKm / (111.32 * Math.cos(midLat * Math.PI / 180));
  
  let gridRow = 0;
  let blockNum = 1;
  
  console.log(`\n📐 Grid: ${gridSizeKm}km cells`);
  console.log(`   Lat step: ${latStep.toFixed(4)}°, Lng step: ${lngStep.toFixed(4)}°\n`);
  
  for (let lat = bbox.south + latStep / 2; lat < bbox.north; lat += latStep) {
    let gridCol = 0;
    
    for (let lng = bbox.west + lngStep / 2; lng < bbox.east; lng += lngStep) {
      points.push({
        lat: lat.toFixed(4),
        lng: lng.toFixed(4),
        label: `Block ${gridRow}-${gridCol}`
      });
      
      console.log(`  Block ${blockNum} (${gridRow}-${gridCol}): ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      blockNum++;
      gridCol++;
    }
    gridRow++;
  }
  
  return points;
}

// Test for Kolkata
const bbox = DISTRICT_COORDS['kolkata'];
console.log('═'.repeat(60));
console.log('Testing Smart Grid Generation for KOLKATA');
console.log('═'.repeat(60));

const optimalSize = calculateOptimalGridSize(bbox);
const points = generateGrid(bbox, optimalSize);

console.log(`\n✅ Total blocks generated: ${points.length}`);
console.log(`\n📍 All unique coordinates:`);
points.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.lat}, ${p.lng} (${p.label})`);
});
