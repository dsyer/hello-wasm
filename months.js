let monthFromDate;

let init = async function () {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  monthFromDate = function (date) {
    if (!date) {
      date = null;
    }
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    return MONTHS[date.getMonth()];
  }
  console.log(monthFromDate());
}

export default async function() {
  if (!monthFromDate) {
    await init();
  }
  return monthFromDate;
};