let monthFromDate;

let calledInit = false;

let sleep = function(callback) {
  // Simulate doing some async work
  return new Promise((resolve) => {
    setTimeout(() => resolve(callback()), 1000)
  })
}

let init = async function () {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  if (!calledInit) {
    await sleep(() => console.log("Woke up."));
  }
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

await init();
export default monthFromDate;