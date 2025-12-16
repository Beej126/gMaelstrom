// Centralized token store to avoid circular dependencies

let accessToken: string | null = null;

export const setGmailAccessToken = (token: string) => {
  accessToken = token;
  localStorage.setItem('gMaelstrom_accessToken', token);
};

export const getGmailAccessToken = (): string | null => {
  if (accessToken) return accessToken;
  return localStorage.getItem('gMaelstrom_accessToken');
};
