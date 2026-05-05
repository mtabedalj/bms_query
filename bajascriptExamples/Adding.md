/*
  As well as reading live values and invoking Actions, we can also manipulate
  the Components running in a Station. For instance, we can add, remove, reorder or
  rename information!
*/

require([
  "baja!",
  "baja!alarm:AlarmSourceExt,alarm:OutOfRangeFaultAlgorithm,alarm:OutOfRangeAlgorithm",
  "dialogs" ], function (
  baja,
  types,
  dialogs) {

  "use strict";

  // Here, we're resolving an ORD without specifying a subscriber. Without any arguments
  // in the get() method, the Counter component will be "leased". When a component is leased,
  // it is temporarily subscribed for the default lease time (ten seconds). You can also specify
  // the lease time by passing a leaseTime property to the get() method.
  baja.Ord.make("station:|slot:/BajaScriptExamples/Components/Ramp")
    .get()
    .then((point) => {
      // Does the point already have an alarm extension added to it?
      if (!point.getSlots().is("alarm:AlarmSourceExt").isEmpty()) {
        dialogs.showOk("Alarm extension already added to point!");
        return;
      }

      // Create an instance of a out of range alarm extension. In order to create an instance
      // of a Type, we must already have the Type imported. In this example we've imported the
      // types we need using the baja! plugin in the require() call above. We can also import
      // types using the baja.importTypes() function. Here, if the types were not already imported,
      // baja.$() would throw an error.

      // When creating an instance of a Complex, we can specify its Properties using an object
      // literal as the second argument to baja.$().
      const ext = baja.$("alarm:AlarmSourceExt", {
        faultAlgorithm: baja.$("alarm:OutOfRangeFaultAlgorithm"),
        offnormalAlgorithm: baja.$("alarm:OutOfRangeAlgorithm")
      });

      // At this point we have an alarm extension in memory in the client. We haven't yet added it
      // to the point in the server. Before we do so, we can configure a few properties on the alarm
      // extension first.
      const offNormal = ext.getOffnormalAlgorithm();
      offNormal.setHighLimit(80);
      offNormal.setLowLimit(20);
      offNormal.getLimitEnable().setLowLimitEnable(true);
      offNormal.getLimitEnable().setHighLimitEnable(true);

      // Now add the extension to the point. The point is a proxy version of the real component
      // running in the Station. When we call 'add', this will make a network call to add the
      // Alarm Extension to the real Component running in the Station. If the current user doesn't
      // have permissions to add the extension to the point, this operation will fail.
      return point.add({
        slot: "alarmExt?", // The question mark is used here to guarantee a unique name is given to the new slot.
        value: ext
      })
        .then(() => {
          dialogs.showOk("Added alarm extension to " + point.getNavOrd().toString());
        })
        .catch((err) => {
          dialogs.showOk("Error adding extension to point: " + err);
        });
    })
    .catch((err) => baja.error(err));
});
