export function chunkArray<T>(input: T[], chunkSize = 4): T[][] {
  if (chunkSize <= 0) {
    throw new Error('chunkSize must be greater than zero');
  }
  const result: T[][] = [];
  for (let i = 0; i < input.length; i += chunkSize) {
    result.push(input.slice(i, i + chunkSize));
  }
  return result;
}
