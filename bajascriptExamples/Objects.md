/*
  As well as a powerful Component architecture, BajaScript also has a rich Object architecture...

  - The core JavaScript types have been augmented into BajaScript Types.
  - There are LOTS of different objects in BajaScript that match Niagara Types. Please see the JsDocs for more information!
*/

require([
  'baja!', 
  'baja!baja:CategoryMask,baja:Weekday',
  'dialogs' ], function (
  baja, 
  types,
  dialogs) {
  
  "use strict";

  const messages = [];

  function log(str) {
    messages.push(str);
  }

  // How about a String!
  log("So what's the Type for a String?".getType());

  // How about a number?
  log((12.2).getType());
  log(baja.Double.make(12.3).getType());
  log(baja.Integer.make(12).getType());
  log(baja.Long.make(14).getType());
  log(baja.Float.make(12.4).getType());

  // How about a boolean?
  log(true.getType());

  // Simples that don't exist
  log("What about unsupported Simples?");
  log("BajaScript hasn't got an implementation for all Simples.");
  log("For now, any unknown Simple falls back to a baja.DefaultSimple");
  const categoryMask = baja.$("baja:CategoryMask").make("12");
  log("For example, here's a CategoryMask constructor: " + categoryMask.constructor.name);
  log("and its string encoding: " + categoryMask.encodeToString());

  // How about Facets?
  const facets = baja.Facets.make({
    trueText: 'some true text',
    falseText: 'some false text'
  });

  // Encode to String and print out
  const encodedFacetsStr = facets.encodeToString();
  log("Some encoded Facets: " + encodedFacetsStr);

  // Relative Time
  log("Milliseconds: " + baja.RelTime.make({
    hours: 1,
    minutes: 2,
    seconds: 20
  }));

  // Absolute time
  log("Time now: " + baja.AbsTime.now());

  // Enums
  log(baja.$("baja:Weekday").get("monday"));

  // Status
  const status = baja.Status.make(baja.Status.DOWN | baja.Status.FAULT);
  log("Status down: " + status.isDown());
  log("Status fault: " + status.isFault());

  // Decode from String and print out
  // Facets should be decoded in an asynchronous fashion to ensure the needed types have been loaded
  baja.Facets.DEFAULT.decodeAsync(encodedFacetsStr)
    .then((facets) => {
      log("Let's print out the Facets...");
      facets.getKeys().forEach((key) => {
        log(`key: ${ key }, value: ${ facets.get(key) }`);
      });

      dialogs.showOk({
        content: "<pre>" + messages.join('\n') + "</pre>"
      });
    })
    .catch((err) => baja.error(err));
});
