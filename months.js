let MONTHS;
let monthFromDate;

let calledInit = false;

async function bytes(path) {
  if (typeof fetch !== "undefined") {
    const response = await fetch(path);
    const file = await response.arrayBuffer();
    return file;
  }
  const fs = await import('fs');
  return fs.readFileSync(path)
}

let init = async function () {
  if (!calledInit) {
    calledInit = true;
    MONTHS = new TextDecoder().decode(await bytes('months.txt'))
      .split("\n")
      .filter(word => word.length > 0);
    console.log("Initialized months");
    monthFromDate = function (date) {
      if (!date) {
        date = null;
      }
      if (!(date instanceof Date)) {
        date = new Date(date);
      }
      return MONTHS[date.getMonth()];
    }
  }
  console.log(monthFromDate());
}

await init();
export { MONTHS, monthFromDate };
export default monthFromDate;