import months from './months.js';
const monthFromDate = await months();
const dateString = process.argv[2] ?? null;
console.log(monthFromDate(dateString));
