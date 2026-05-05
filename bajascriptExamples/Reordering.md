/*
  Now let's see how we can reorder a number of dynamic Properties on a Component...
*/

require([
  'baja!', 
  'dialogs',
  'underscore' ], function (
  baja, 
  dialogs,
  _) {

  "use strict";

  baja.Ord.make("station:|slot:/BajaScriptExamples/Components/Reorder")
    .get()
    .then((folder) => {
      // Note how we're using BajaScript's powerful cursors to find the Slots 
      // we're interested in.
      const dynProps = folder.getSlots().dynamic().properties().toArray();
      const before = dynProps.join(", ");

      // Perform reorder on Server (this will make a network call)...
      return folder.reorder(dynProps.reverse())
        .then(function () {
          const after = folder.getSlots().dynamic().properties().toArray().join(", ");

          // remember to consider XSS vulnerabilities when building up HTML!
          // this is safe because slot names cannot contain special characters.
          // but we'll escape it anyway to demonstrate good practice.
          dialogs.showOk({
            content: `
              <div>Before reorder: ${ _.escape(before) } </div>
              <div>After reorder: ${ _.escape(after) }</div>
            `
          });
        });
    })
    .catch((err) => baja.error(err));
});
