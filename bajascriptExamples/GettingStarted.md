/*
  Welcome to the BajaScript tutorials. BajaScript is JavaScript library 
  used for accessing data from a Station. It's not a User Interface library.
  For more information, please navigate to the following ORD...

  module://docDeveloper/doc/jsdoc/bajaScript-ux/index.html

  As described in the documentation, the 'BajaScriptExamples' folder from 
  the docDeveloper palette should be placed in the root of the Station for 
  all of these examples to work.
 */

// This 'require' method is part of RequireJS. Please visit http://requirejs.org/
// for more information. 
require([ 'baja!', 'dialogs' ], function (baja, dialogs) {

  "use strict";

  // Now we've imported both BajaScript and Niagara 4's own dialog library,
  // we can print out BajaScript's version in a dialog.
  dialogs.showOk('BajaScript version: ' + baja.version);
});
