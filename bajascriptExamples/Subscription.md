/*
  This code snippet is taken from from the 'gettingStarted' BajaScript tutorial.
  More information can be found by navigating to this ORD...

  module://docDeveloper/doc/jsdoc/bajaScript-ux/tutorial-gettingStarted.html
*/

// Subscribe to a Ramp. When it changes, print out the results.
require([
  'baja!',
  'dialogs' ], function (
  baja,
  dialogs) {

  "use strict";

  // A Subscriber is used to listen to Component events in Niagara.
  const sub = new baja.Subscriber();

  // This shows a dialog. The function passed into 'showOk' is used to generate the dialog
  // box's content.
  dialogs.showOk({
    content: function (dlg, jq) {
      jq.text("Loading...");

      // The 'update' method is called whenever the text needs to be updated.
      function update(ramp) {
        jq.text(ramp.getOutDisplay());
      }

      // Called whenever the Ramp changes.
      sub.attach('changed', function (prop) {
        if (prop.getName() === 'out') { update(this); }
      });

      // Resolve the ORD to the Ramp and update the text.
      baja.Ord.make('station:|slot:/BajaScriptExamples/Components/Ramp').get({ subscriber: sub })
        .then((ramp) => {
          // update once to capture the initial value. the subscriber will continue to update
          // as the value changes.
          update(ramp);
        })
        .catch((err) => baja.error(err));
    }
  })
    // A Promise is an amazing way to handle asynchronous events in JavaScript. For
    // more information on Promises, please visit
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
    .promise()
    .finally(() => {
      // Called when the dialog is closed.

      // Unsubscribe the Component so we're no longer listening to live
      // events.
      sub.unsubscribeAll();

      // Detach all subscription handlers to ensure we don't unnecessarily
      // create memory leaks.
      sub.detach();
    });
});
