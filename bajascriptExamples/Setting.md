/*
  Let's take a look how we can set properties.

  Note the 'then' statements being used. BajaScript v2 has a completely Promise-based API. Learn
  more about Promises here:

  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
*/
require([
  'baja!',
  'dialogs' ], function (
  baja,
  dialogs) {
  
 "use strict";

  let counter;
  baja.Ord.make("station:|slot:/BajaScriptExamples/Components/Counter")
    .get({
      lease: true, // Temporarily subscribe the Counter for one minute.
      leaseTime: baja.RelTime.make({ minutes: 1 })
    })
    .then((point) => {
      counter = point;
      // Note how all of these calls return a promise. The next then() will be invoked only
      // after the Promise returned from the preceding one has resolved.
      // In the case of a dialog, the promise is resolved once the dialog has closed.
      return dialogs.showOk("Counter before setting: " + counter.getOutDisplay()).promise();
    })
    .then(() => {
      return counter.getCountUp().setValue(true);
    })
    .then(() => {
      // As soon as the Property has been set to true, change it back to false.
      return counter.getCountUp().setValue(false);
    })
    .then(() => {
      return dialogs.showOk("Counter after setting: " + counter.getOutDisplay()).promise();
    })
    .catch((err) => {
      // it's important that a Promise is always returned.
      // but when a returned Promise won't be handled (here, RequireJS won't know what to do with
      // it) then be sure to add a .catch() so any errors will be handled or at least be logged.
      baja.error(err);
    });
});
