const MONTHS = ['January', 'February', 'March','April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'];
let monthFromDate = function (date) {
  if (!date) {
    date = null;
  }
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return MONTHS[date.getMonth()];
}
export { monthFromDate as default, monthFromDate };
console.log(monthFromDate())