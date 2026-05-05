/*
  Now let's see how we can rename a dynamic Property...
*/

require([
  'baja!',
  'dialogs' ], function (
  baja,
  dialogs) {
  
  "use strict";

  const originalName = "BooleanWritable";
  const renamedName = "RenamedBooleanWritable";

  let oldName = originalName;
  let newName = renamedName;

  baja.Ord.make("station:|slot:/BajaScriptExamples/Components")
    .get()
    .then((components) => {
      // The 'has' method is a great way to test if a slot exists or
      // not. Remember to ensure the proxy component you're using is
      // subscribed before you use this.
      if (!components.has(originalName)) {
        oldName = renamedName;
        newName = originalName;
      }
      
      return components.rename({
        slot: oldName, 
        newName: newName
      });
    })
    .then(() => {
      dialogs.showOk("Renamed from " + oldName + " to " + newName);
    })
    .catch((err) => baja.error(err));
});
