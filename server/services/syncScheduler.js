const cron = require('node-cron');
const db = require('../db');
const googleSheetsService = require('./googleSheetsService');

function startSyncScheduler() {
  // Check every 10 minutes for active sheets that need syncing
  cron.schedule('*/10 * * * *', async () => {
    try {
      const sheets = db.prepare("SELECT id, name, spreadsheet_id, service_account_key FROM sheets WHERE is_active = 1 AND service_account_key IS NOT NULL").all();
      for (const sheet of sheets) {
        try {
          console.log(`[Auto-Sync] Syncing sheet: ${sheet.name} (ID: ${sheet.id})`);
          await googleSheetsService.syncInboundSheet(sheet.id);
        } catch (err) {
          console.error(`[Auto-Sync Error] Sheet ${sheet.id}:`, err.message);
        }
      }
    } catch (e) {
      console.error('[Auto-Sync Scheduler Error]:', e.message);
    }
  });

  console.log('⏰ Google Sheets periodic auto-sync scheduler initialized.');
}

module.exports = { startSyncScheduler };
