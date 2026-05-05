/*
  Let's recap on all of the different component events we can listen for...

  - There are lots of different events to listen to. For a list, please see the JsDocs for baja.Subscriber#attach.
  - There's also a 'detach' method to remove handlers.
  - There are many different ways to attach event handlers as shown in the commented out examples below...
*/

require([
  'baja!', 
  'dialogs',
  'jquery' ], function (
  baja,
  dialogs,
  $) {

  "use strict";

  const sub = new baja.Subscriber();
  const ordStr = "station:|slot:/BajaScriptExamples/Components/EventTest";

  dialogs.showOk({
    content: (dlg, jq) => {

      function log(msg) {
        jq.append($("<div></div>").text(msg));
      }

      // Attaching a single event listener function...
      /*
      sub.attach("changed", function(prop, cx) {
        update("Property changed: " + prop.getName());
      });
      */

      // Attach one function to multiple events...
      /*
      sub.attach("subscribed changed added removed", function() {
        update("Event received: " + this.toPathString());
      });
      */

      log("Open another browser or workbench. Navigate to...");
      log("...");
      log(ordStr);
      log("...");
      log("Now add and remove Components to this folder. Note the events that appear below...");
      log("...");

      // Use an Object Literal to define multiple event handlers in one call...
      sub.attach({
        changed: function (prop, cx) {
          log("Changed");
        },

        added: function (prop, cx) {
          log("Added");
        },

        removed: function (prop, val, cx) {
          log("Removed");
        },

        renamed: function (prop, oldName, cx) {
          log("Renamed");
        },

        reordered: function (cx) {
          log("Reordered");
        },

        topicFired: function (topic, event, cx) {
          log("Topic Fired");
        },

        flagsChanged: function (slot, cx) {
          log("Flags Changed");
        },

        facetsChanged: function (slot, cx) {
          log("Facets Changed");
        },

        subscribed: function (cx) {
          log("Subscribed");
        },

        unsubscribed: function (cx) {
          log("Unsubscribed");
        },

        unmount: function (cx) {
          log("EventTest removed from Station!");
        },

        componentRenamed: function (oldName, cx) {
          log("Original EventTest has been renamed: " + oldName);
        },

        componentFlagsChanged: function (cx) {
          log("EventTest parent Property flags changed");
        },

        componentFacetsChanged: function (cx) {
          log("EventTest parent Property facets changed");
        },

        componentReordered: function (cx) {
          log("EventTest has been reordered in parent");
        }
      });

      return baja.Ord.make(ordStr)
        .get({ subscriber: sub });
    }
  })
    .promise()
    .catch((err) => baja.error(err))
    .finally(function () {
      sub.unsubscribeAll();
      sub.detach();
    });

});
