import monthFromDate from './months.js';
const dateString = process.argv[2] ?? null;
console.log(monthFromDate(dateString));
