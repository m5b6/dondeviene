export const canonicalServiceCode = (input: string): string => {
  const upper = input.trim().toUpperCase();
  if (upper === '') return upper;
  const last = upper.slice(-1);
  return /\d/.test(last) ? upper : `${upper.slice(0, -1)}${last.toLowerCase()}`;
};
