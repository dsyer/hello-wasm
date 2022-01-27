const months = await import('./months.js');
const monthFromDate = (await months.default()).monthFromDate;
const dateString = process.argv[2] ?? null;
console.log(monthFromDate(dateString));
