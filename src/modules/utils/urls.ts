export function atUriToBskyAppUrl(uri: string): string | null {
  if (!uri.startsWith('at://')) return null;
  const withoutScheme = uri.slice('at://'.length);
  const parts = withoutScheme.split('/');
  if (parts.length < 3) {
    return null;
  }
  const did = parts[0]?.trim();
  const collection = parts[1]?.trim();
  const rkey = parts[2]?.trim();
  if (!did || collection !== 'app.bsky.feed.post' || !rkey) {
    return null;
  }
  return `https://bsky.app/profile/${did}/post/${rkey}`;
}
