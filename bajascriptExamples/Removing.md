/*
  In this tutorial, we're going to remove the alarm extension that was added previously.
*/

require([
  'baja!', 
  'dialogs' ], function (
  baja, 
  dialogs) {
  
  "use strict";

  baja.Ord.make("station:|slot:/BajaScriptExamples/Components/Ramp")
    .get()
    .then((point) => {
      // Does the point already have an alarm extension added to it?
      const ext = point.getSlots().is("alarm:AlarmSourceExt").firstValue();

      if (ext) { 
        // Remove the alarm extension from the point. This will make a network call to the 
        // server to remove the extension.
        return point.remove(ext)
          .then(() => {
            dialogs.showOk("Removed alarm extension from point: " + point.getNavOrd().toString());
          });
      } else {
        dialogs.showOk("No alarm extension found.");
      }
    })
    .catch((err) => baja.error(err));
});
