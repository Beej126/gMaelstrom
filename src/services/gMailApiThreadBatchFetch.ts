import { getAuthedUser } from './gAuthApi';
import type { GThreadWithMessages } from './gMailApi';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const THREAD_METADATA_FIELDS = encodeURIComponent('id,snippet,messages(id,threadId,snippet,labelIds,payload(headers))');

export const gmailApiThreadBatchFetch = async (
  threadIds: string[]
): Promise<GThreadWithMessages[]> => {
  const token = (await getAuthedUser())?.accessToken;
  const url = 'https://gmail.googleapis.com/batch';
  const batchSize = 10;
  const delayMs = 300;
  const results: GThreadWithMessages[] = [];

  for (let index = 0; index < threadIds.length; index += batchSize) {
    const chunk = threadIds.slice(index, index + batchSize);
    const boundary = 'batch_boundary_' + Math.random().toString(36).slice(2);
    const body = chunk.map(threadId => [
      `--${boundary}`,
      'Content-Type: application/http',
      '',
      `GET /gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&fields=${THREAD_METADATA_FIELDS}`,
      '',
    ].join('\r\n')).join('') + `\r\n--${boundary}--`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/mixed; boundary=${boundary}`,
        Accept: 'application/json',
      },
      body,
    });

    const text = await response.text();
    const parts = text.split(`--${boundary}`);

    for (const part of parts) {
      const statusMatch = part.match(/HTTP\/1\.1 (\d{3})/);
      if (statusMatch && statusMatch[1] === '429') {
        throw new Error('Gmail API rate limit (429) encountered while fetching thread metadata.');
      }

      let cursor = 0;
      while (cursor < part.length) {
        const firstBrace = part.indexOf('{', cursor);
        if (firstBrace === -1) break;

        let depth = 0;
        let end = -1;
        for (let braceIndex = firstBrace; braceIndex < part.length; braceIndex++) {
          if (part[braceIndex] === '{') depth++;
          if (part[braceIndex] === '}') depth--;
          if (depth === 0 && braceIndex > firstBrace) {
            end = braceIndex;
            break;
          }
        }

        if (end === -1) break;

        const jsonText = part.substring(firstBrace, end + 1);
        try {
          results.push(JSON.parse(jsonText) as GThreadWithMessages);
        } catch (error) {
          console.warn('[gMaelstrom] Failed to parse JSON from thread batch part:', error, jsonText);
        }
        cursor = end + 1;
      }
    }

    if (index + batchSize < threadIds.length) {
      await sleep(delayMs);
    }
  }

  return results;
};