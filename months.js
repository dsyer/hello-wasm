var Module = (function () {

  return (
    function (Module) {
      Module = Module || {};

      var Module = typeof Module !== "undefined" ? Module : {};
      var readyPromiseResolve, readyPromiseReject;
      Module["ready"] = new Promise(function (resolve, reject) {
        readyPromiseResolve = resolve;
        readyPromiseReject = reject
      });

      let init = function() {
        console.log(monthFromDate());
        readyPromiseResolve(Module);
      }

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
      Module["monthFromDate"] = monthFromDate;
      init();
      return Module.ready
    }
  );

})();

export default Module;