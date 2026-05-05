/*
  BajaScript can be used to query a Station via SQL, BQL etc...

  - For more information, please see the JsDocs for baja.coll.Table
*/
require([
  'baja!', 
  'dialogs' ], function (
  baja, 
  dialogs) {

  "use strict";
  
  const messages = [];

  function log(str) {
    messages.push(str);
  }

  // Run the BQL query in the Station and print out the results...
  baja.Ord.make("station:|slot:/|bql:select toPathString from baja:Component")
    .get({
      cursor: {
        before: function () {
          log("Called just before iterating through the Cursor");
        },
        after: function () {
          log("Called just after iterating through the Cursor");
        },
        each: function () {
          log("Each: " + this.get("toPathString"));
        },
        limit: 15, // Specify optional limit on the number of records (defaults to 10)
        offset: 0 // Specify optional record offset (defaults to 0)
      }  
    })
    .then((result) => {
      result.getColumns().forEach((c) => {
        log("Column: " + c.getDisplayName());
      });

      dialogs.showOk({
        content: "<pre>" + messages.join('\n') + "</pre>"
      });
    })
    .catch((err) => baja.error(err));
});
