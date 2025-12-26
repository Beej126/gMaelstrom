/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */

// Usage: node scripts/gmail_fetch.cjs
// Example: node scripts/gmail_fetch.cjs (token is embedded in the script)

const https = require('https');

const ACCESS_TOKEN = '';

if (!ACCESS_TOKEN) {
  console.error('No access token provided.');
  process.exit(1);
}

function gmailApi(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'gmail.googleapis.com',
      path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        Accept: 'application/json'
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    const list = await gmailApi('/gmail/v1/users/me/messages?maxResults=5');
    if (!list.messages) throw new Error('No messages found');
    const details = await Promise.all(
      list.messages.map(msg =>
        gmailApi(`/gmail/v1/users/me/messages/${msg.id}?format=metadata`)
      )
    );
    // Print a summary table for each message
    details.forEach((msg, i) => {
      const headers = (msg.payload && msg.payload.headers) || [];
      const getHeader = name => {
        const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return h ? h.value : '';
      };
      console.log('--- Message', i + 1, '---');
      console.log('id:', msg.id);
      console.log('labelIds:', Array.isArray(msg.labelIds) ? msg.labelIds : msg.labelIds ? msg.labelIds : 'MISSING');
      if (!msg.labelIds || !Array.isArray(msg.labelIds) || msg.labelIds.length === 0) {
        console.log('*** WARNING: labelIds missing or empty! ***');
      }
      console.log('snippet:', msg.snippet);
      console.log('Subject:', getHeader('Subject'));
      console.log('From:', getHeader('From'));
      console.log('To:', getHeader('To'));
      console.log('Date:', getHeader('Date'));
      console.log('----------------------\n');
    });
    // Optionally, print the full details for inspection
    // console.dir(details, { depth: null });
  } catch (err) {
    console.error('Error:', err);
  }
})();
