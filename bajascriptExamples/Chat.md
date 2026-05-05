/*
  A BajaScript Chat Application.
  Chat to anyone else using this App at the same time!
  Hit the run button to start listening. Enter any message
  below to and hit run to send.

  Please note, this will only work with users who are logged onto the same Station.
*/

require([
  'baja!',
  'bajaux/spandrel',
  'bajaux/mixin/subscriberMixIn',
  'dialogs',
  'nmodule/webEditors/rc/fe/feDialogs' ], function (
  baja,
  spandrel,
  subscriberMixIn,
  dialogs,
  feDialogs) {
  "use strict";
  
  const sub = new baja.Subscriber();
  let name;
  
  // Ask the user for their name.
  feDialogs.showFor({
    title: 'Enter Name',
    value: '',
    properties: { placeholder: 'Enter name here' }
  })
    .then((enteredName) => {
      name = enteredName || 'Unknown';

      // Resolve the chat Component.
      return baja.Ord.make("station:|slot:/BajaScriptExamples/Components/BajaScriptTestComp")
        .get({ subscriber: sub });
    })
    .then((comp) => {
      // Show the chat window.
      return dialogs.show({
        title: "BajaScript Chat - " + name,
        content: function (dlg, jq) {
          jq.html("Say: <input type='text' size='60' value=''>" +
            "<pre style='border: 1px solid grey'>Welcome to BajaScript Chat...\n</pre>");

          var input = jq.find("input"),
              chat = jq.find("pre");

          // To make this work, a BajaScriptTestComp has a Topic named "message". We will use
          // this Topic to send messages back and forth between clients.

          sub.attach("topicFired", function (topic, event, cx) {
            if (topic.getName() === 'message') {
              // when the component in the station fires the "message" topic, add the value
              // to the chat.
              chat.text(chat.text() + "\n" + event);
            }
          });

          // When the user hits the enter key, fire the Topic on the Station Component.
          input.keyup(function (e) {
            if (e.keyCode === 13) {
              comp.fire({
                slot: 'message',
                value: name + " says " + input.val()
              })
                .catch((err) => baja.error(err));
              input.val("");
            }
          });    
        },
        buttons: [ {
          name: "close",
          displayName: "Close",
          esc: true
        } ]
      }).promise();
    })
    .catch((err) => baja.error(err))
    .finally(() => {
      sub.unsubscribeAll();
      sub.detach();
    });
});
