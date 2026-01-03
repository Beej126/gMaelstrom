// @internal - Only import via gMailApi.ts

// Batch fetch Gmail message metadata for a list of message IDs
// Returns an array of message objects (with the same fields as before)
import { getAuthedUser } from './gAuthApi';


// Helper to sleep for ms milliseconds
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export const gmailApiBatchFetch = async (
  messageIds: string[],
  fields: string = 'id,threadId,snippet,labelIds,payload(headers,parts)'
): Promise<gapi.client.gmail.Message[]> => {
  const token = (await getAuthedUser())?.accessToken;
  const url = 'https://gmail.googleapis.com/batch';
  const BATCH_SIZE = 10;
  const DELAY_MS = 300;
  const allResults: gapi.client.gmail.Message[] = [];
  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const chunk = messageIds.slice(i, i + BATCH_SIZE);
    const boundary = 'batch_boundary_' + Math.random().toString(36).slice(2);
    const body = chunk.map(
      (id) =>
        [
          `--${boundary}`,
          'Content-Type: application/http',
          '',
          `GET /gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&fields=${fields}`,
          '',
        ].join('\r\n')
    ).join('') + `\r\n--${boundary}--`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/mixed; boundary=${boundary}`,
        'Accept': 'application/json',
      },
      body,
    });
    const text = await response.text();
    // Parse multipart/mixed response
    const parts = text.split(`--${boundary}`);
    for (const part of parts) {
      // Check for HTTP status in the part
      const statusMatch = part.match(/HTTP\/1\.1 (\d{3})/);
      if (statusMatch && statusMatch[1] === '429') {
        throw new Error('Gmail API rate limit (429) encountered. Stopping batch fetch.');
      }
      // Extract all JSON objects in the part (handle multiple per part, if present)
      let idx = 0;
      while (idx < part.length) {
        const firstBrace = part.indexOf('{', idx);
        if (firstBrace === -1) break;
        let depth = 0;
        let end = -1;
        for (let i = firstBrace; i < part.length; i++) {
          if (part[i] === '{') depth++;
          if (part[i] === '}') depth--;
          if (depth === 0 && i > firstBrace) {
            end = i;
            break;
          }
        }
        if (end !== -1) {
          const jsonStr = part.substring(firstBrace, end + 1);
          try {
            allResults.push(JSON.parse(jsonStr));
          } catch (e) {
            console.warn('[gMaelstrom] Failed to parse JSON from batch part:', e, jsonStr);
          }
          idx = end + 1;
        } else {
          break;
        }
      }
    }
    // Throttle: wait before next batch unless last batch
    if (i + BATCH_SIZE < messageIds.length) {
      await sleep(DELAY_MS);
    }
  }
  return allResults;
};
