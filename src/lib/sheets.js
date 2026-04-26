const SYNC_URL = 'https://script.google.com/macros/s/AKfycbyBpjp65AnLH8lA714S3Ljzp-pgRqr15VQ5gOZzJd5UwuY3pjQhYOyjgn23A76i_mSQnw/exec'

async function syncToSheets(action, payload) {
  try {
    await fetch(SYNC_URL, {
      method: 'POST',
      body: JSON.stringify({ action, payload }),
    })
  } catch {
    // sync is best-effort — don't block the user
  }
}

export const syncKid    = (payload) => syncToSheets('sync_kid', payload)
export const syncLog    = (payload) => syncToSheets('sync_log', payload)
export const syncEarn   = (payload) => syncToSheets('sync_earn', payload)
export const syncWallet = (payload) => syncToSheets('sync_wallet', payload)
