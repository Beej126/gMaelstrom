export const fetchAuthedJson = async (url: string, bearerToken: string) => {

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearerToken}` }
  });

  if (!res.ok) {
    throw new Error('Failed to fetch: ' + url);
  }

  return await res.json();
}