/*
  BajaScript has an RPC mechanism to invoke Java methods on the Server.
  
  To implement an RPC, annotate one of your Java methods with the @NiagaraRpc annotation. You may
  additionally specify permissions requirements for a user to be able to call the RPC method.
  BajaScript will make an asynchronous network call, call the specified Java method on the server,
  and resolve the result.

  Please see the documentation on @NiagaraRpc itself for full details:
  module://docDeveloper/doc/baja-rt/javax/baja/rpc/NiagaraRpc.bajadoc
*/

require([
  'baja!', 
  'dialogs' ], function (
  baja,
  dialogs) {

  "use strict";        
        
  // First resolve an instanceof docDeveloper:BajaScriptTestComp.
  // This class has a Java method named hello() that is annotated with @NiagaraRpc.
  baja.Ord.make("station:|slot:/BajaScriptExamples/Components/BajaScriptTestComp")
    .get()
    .then((comp) => {
      // invoke the Java method hello() on this component in the server and show the response.
      return comp.rpc('hello', 'Thomas');
    })
    .then((response) => {
      dialogs.showOk(response);
    })
    .catch((err) => baja.error(err));
});
