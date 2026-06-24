const LEAD_PLATFORM_BASE_URL = 'http://127.0.0.1:8000';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Lead Platform')
    .addItem('Pull Leads', 'pullLeads')
    .addItem('Pull Summary', 'pullSummary')
    .addToUi();
}

function pullLeads() {
  const sheet = getOrCreateSheet_('Leads');
  const config = readConfig_();
  const params = buildQuery_(config);
  const url = `${config.baseUrl}/api/leads?limit=500&${params}`;
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true
  });

  if (response.getResponseCode() >= 400) {
    throw new Error(response.getContentText());
  }

  const data = JSON.parse(response.getContentText());
  const columns = [
    'name',
    'industry',
    'business_type',
    'phone',
    'rating',
    'review_count',
    'address',
    'state',
    'district',
    'source',
    'scraped_at'
  ];

  sheet.clearContents();
  sheet.getRange(1, 1, 1, columns.length).setValues([columns]);

  if (data.items.length > 0) {
    const rows = data.items.map(item => columns.map(column => item[column] || ''));
    sheet.getRange(2, 1, rows.length, columns.length).setValues(rows);
  }

  sheet.autoResizeColumns(1, columns.length);
  SpreadsheetApp.getUi().alert(`Pulled ${data.items.length} of ${data.total} matching leads.`);
}

function pullSummary() {
  const config = readConfig_();
  const response = UrlFetchApp.fetch(`${config.baseUrl}/api/summary`, {
    method: 'get',
    muteHttpExceptions: true
  });

  if (response.getResponseCode() >= 400) {
    throw new Error(response.getContentText());
  }

  const data = JSON.parse(response.getContentText());
  const sheet = getOrCreateSheet_('Summary');
  const rows = [
    ['Total Leads', data.total],
    ['States', data.by_state.length],
    ['Industries', data.by_industry.length],
    [],
    ['State', 'Count'],
    ...data.by_state.map(item => [item.state || 'Unknown', item.total])
  ];

  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.autoResizeColumns(1, 2);
}

function readConfig_() {
  const sheet = getOrCreateSheet_('Config');

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 5, 2).setValues([
      ['baseUrl', LEAD_PLATFORM_BASE_URL],
      ['state', ''],
      ['district', ''],
      ['industry', ''],
      ['search', '']
    ]);
    sheet.autoResizeColumns(1, 2);
  }

  const values = sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), 2).getValues();
  const config = {};
  values.forEach(([key, value]) => {
    if (key) config[String(key).trim()] = String(value || '').trim();
  });

  return {
    baseUrl: config.baseUrl || LEAD_PLATFORM_BASE_URL,
    state: config.state || '',
    district: config.district || '',
    industry: config.industry || '',
    search: config.search || ''
  };
}

function buildQuery_(config) {
  const params = {
    state: config.state,
    district: config.district,
    industry: config.industry,
    q: config.search
  };

  return Object.keys(params)
    .filter(key => params[key])
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

function getOrCreateSheet_(name) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}
