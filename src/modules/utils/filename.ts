const lastNumberPattern = /(\d+)(?!.*\d)/;
const leadingNumberPattern = /^(\d+)/;

export function parseSequenceNumber(filename: string): number | null {
  const name = filename.replace(/\.[^.]+$/, '');
  const lastMatch = name.match(lastNumberPattern);
  if (lastMatch) {
    return Number.parseInt(lastMatch[1], 10);
  }
  const leadingMatch = name.match(leadingNumberPattern);
  if (leadingMatch) {
    return Number.parseInt(leadingMatch[1], 10);
  }
  return null;
}

export function naturalCompare(a: string, b: string): number {
  const ax: (string | number)[] = [];
  const bx: (string | number)[] = [];

  a.replace(/(\d+)|(\D+)/g, (_, $1, $2) => {
    ax.push($1 ? Number($1) : $2.toLowerCase());
    return '';
  });
  b.replace(/(\d+)|(\D+)/g, (_, $1, $2) => {
    bx.push($1 ? Number($1) : $2.toLowerCase());
    return '';
  });

  while (ax.length && bx.length) {
    const an = ax.shift();
    const bn = bx.shift();
    if (an === bn) continue;
    if (typeof an === 'number' && typeof bn === 'number') {
      return an - bn;
    }
    if (typeof an === 'number') return -1;
    if (typeof bn === 'number') return 1;
    return (an as string).localeCompare(bn as string);
  }
  return ax.length - bx.length;
}

export function sortFilesBySequence(files: File[]): File[] {
  return [...files].sort((a, b) => {
    const numA = parseSequenceNumber(a.name);
    const numB = parseSequenceNumber(b.name);
    if (numA !== null && numB !== null && numA !== numB) {
      return numA - numB;
    }
    if (numA !== null && numB === null) return -1;
    if (numA === null && numB !== null) return 1;
    return naturalCompare(a.name, b.name);
  });
}
