/*
  In the last tutorial, you learnt how to resolve an ORD and read a live value.

  Now we're going to extend that original example by seeing how we can 'do something' to a Station by invoking an Action.
*/
require([
  'baja!', 
  'baja!control:NumericOverride',
  'dialogs' ], function (
  baja,
  types,
  dialogs) {
  
  "use strict";

  const sub = new baja.Subscriber();

  dialogs.showOk({
    content: (dlg, jq) => {
      jq.text("Waiting for change...");

      return baja.Ord.make("station:|slot:/BajaScriptExamples/Components/NumericWritable")
        .get({ subscriber: sub })
        .then((point) => {
          // The Promise returned from get() resolves after the ORD resolves to the point and it
          // has been subscribed. At that point, the following .then() handler will run.

          // Invoking the 'override' Action on a point requires an argument.
          // Therefore, we first need to create a control:NumericOverride object.
          // To create an instance of a Baja type (via the baja.$ method), we must first have the
          // Type itself imported. This is done by using the baja! plugin in the require() call
          // above.
          const overrideVal = baja.$("control:NumericOverride", {
            value: 123,
            duration: baja.RelTime.make({ seconds: 5 })
          });

          sub.attach("changed", function (prop, cx) {
            if (prop.getName() === "out") {
              jq.text("Out: " + point.getOutDisplay());
            }
          });

          // Invoke the Action on the point. This will result in an asynchronous network call...
          return point.invoke({
            slot: 'override',
            value: overrideVal
          });
        });
    }
  })
    .promise()
    .catch((err) => baja.error(err))
    .finally(function () {
      sub.unsubscribeAll();
      sub.detach();
    });

});
