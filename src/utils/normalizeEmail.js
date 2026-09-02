export const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
