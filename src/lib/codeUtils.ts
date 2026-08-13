export function getNextKnifeCode(knives: { code?: string }[] = []): string {
  let maxNum = 0;
  if (Array.isArray(knives)) {
    for (const k of knives) {
      if (k && k.code) {
        const match = k.code.match(/FC-?(\d+)/i) || k.code.match(/(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
  }
  const nextNum = maxNum + 1;
  return `FC-${String(nextNum).padStart(3, '0')}`;
}
