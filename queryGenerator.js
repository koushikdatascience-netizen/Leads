/**
 * Generates optimized search queries for Google Maps scraping
 */
function generateSearchQuery(businessType, city, state, country) {
  const queries = [];
  
  // Primary query - most specific
  queries.push(`${businessType} in ${city}, ${state}, ${country}`);
  
  // Secondary queries for broader coverage
  if (state) {
    queries.push(`best ${businessType} ${city} ${state}`);
    queries.push(`${businessType} near ${city}, ${state}`);
  }
  
  // Fallback queries
  queries.push(`${businessType} ${city}`);
  queries.push(`${city} ${businessType}`);
  
  return queries;
}

/**
 * Generate Google Maps search URL
 */
function generateMapsUrl(query) {
  const encodedQuery = encodeURIComponent(query);
  return `https://www.google.com/maps/search/${encodedQuery}`;
}

/**
 * Generate Google Search URL (fallback)
 */
function generateSearchUrl(query) {
  const encodedQuery = encodeURIComponent(query);
  return `https://www.google.com/search?q=${encodedQuery}`;
}

module.exports = {
  generateSearchQuery,
  generateMapsUrl,
  generateSearchUrl
};
