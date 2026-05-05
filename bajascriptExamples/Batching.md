/*
Note: as of Niagara 4.10, most network requests will batch together automatically as needed.
Manual batching is largely obsolete.

However, requests can still be manually batched together into a single network call if desired.
*/

require([
  'baja!',
  'baja!control:NumericWritable',
  'dialogs',
  'jquery',
  'Promise',
  'underscore',
  'nmodule/webEditors/rc/fe/feDialogs' ], function (
  baja,
  types,
  dialogs,
  $,
  Promise,
  _,
  feDialogs) {

  "use strict";

  // First ask the user to enter a number...
  feDialogs.showFor({
    title: 'Enter a number...',
    value: 1,
    buttons: [ 'ok' ]
  })
    .then((value) => {
      const sub = new baja.Subscriber();

      // Now invoke a whole bunch of actions on some points in batch and
      // listen for any changes.
      return dialogs.showOk((dlg, jq) => {

        function log(str) {
          jq.append($('<div></div').text(str));
        }

        // Listen for any changes.
        sub.attach("changed", function () {
          // this callback is a regular function, not an arrow function.
          // this is because a subscriber callback sets the function context (therefore the value of
          // "this") to the component that fired the event.
          const point = this;
          log(point.toPathString() + ' -> ' + point.getOutDisplay());
        });

        return baja.Ord.make("station:|slot:/BajaScriptExamples/Components/Batch")
          .get()
          .then((folder) => {
            const batch = new baja.comm.Batch();
            const points = folder.getSlots().is('control:NumericWritable').toValueArray();
            log(points.map((p) => p.getName()));

            // For each point, invoke the 'set' Action and subscribe the point so we can
            // listen for changes.

            // We are going to gather each promise into an array so that we can pass them to
            // Promise.all(). This way, if an error occurs, we can handle or log it.
            // Remember: don't let Promises go unreturned or unhandled!

            // passing the "batch" parameter means that these network calls don't go out just yet...
            const promises = points.map((point) => Promise.all([
              sub.subscribe({ comps: point, batch }),
              point.invoke({ slot: 'set', value, batch })
            ]));

            // Committing the batch will now make the network call.
            batch.commit();

            return Promise.all(promises);
          });
      })
      .promise()
      .finally(() => {
        sub.unsubscribeAll();
        sub.detach();
      });
    })
    .catch((err) => baja.error(err));
});
