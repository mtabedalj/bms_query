var ShimsTest = (function() {
  'use strict';

  function runAll() {
    var passed = 0;
    var failed = 0;

    var tests = [
      { name: 'definesBajaRequire', fn: testDefinesBajaRequire },
      { name: 'bajaRequireProvidesBajaAndJquery', fn: testBajaRequireProvidesBajaAndJquery },
      { name: 'ordMakeGetResolvesToComponent', fn: testOrdMakeGetResolvesToComponent },
      { name: 'componentHasRequiredMethods', fn: testComponentHasRequiredMethods },
      { name: 'batchResolveResolvesAllOrds', fn: testBatchResolveResolvesAllOrds },
      { name: 'batchResolveCallsEach', fn: testBatchResolveCallsEach },
      { name: 'subscriberHasRequiredMethods', fn: testSubscriberHasRequiredMethods },
      { name: 'bajaErrorPrintsToConsole', fn: testBajaErrorPrintsToConsole },
      { name: 'shimProvidesSampleDataForVisionMetering', fn: testShimProvidesSampleDataForVisionMetering }
    ];

    function runTest(index) {
      if (index >= tests.length) {
        console.log(passed + '/' + (passed + failed) + ' shims tests passed');
        return failed === 0;
      }

      var t = tests[index];
      try {
        var result = t.fn();
        if (result && typeof result.then === 'function') {
          return result.then(function(ok) {
            if (ok) {
              console.log('PASS: ' + t.name);
              passed++;
            } else {
              console.log('FAIL: ' + t.name);
              failed++;
            }
            return runTest(index + 1);
          });
        } else {
          if (result) {
            console.log('PASS: ' + t.name);
            passed++;
          } else {
            console.log('FAIL: ' + t.name);
            failed++;
          }
          return runTest(index + 1);
        }
      } catch (e) {
        console.log('FAIL: ' + t.name + ' - ' + e.message);
        failed++;
        return runTest(index + 1);
      }
    }

    return runTest(0);
  }

  function testDefinesBajaRequire() {
    return typeof window.bajaRequire === 'function';
  }

  function testBajaRequireProvidesBajaAndJquery() {
    var passed = true;
    window.bajaRequire(['baja!', 'jquery'], function(baja, $) {
      if (typeof baja !== 'object' || baja === null) passed = false;
      if (typeof $ !== 'function') passed = false;
    });
    return passed;
  }

  function testOrdMakeGetResolvesToComponent() {
    var baja = getMockBaja();

    return baja.Ord.make('station:|slot:/Test/Point').get()
      .then(function(component) {
        return component !== null && typeof component === 'object';
      })
      .catch(function() {
        return false;
      });
  }

  function testComponentHasRequiredMethods() {
    var baja = getMockBaja();

    return baja.Ord.make('station:|slot:/Test/Point').get()
      .then(function(component) {
        var hasGetName = typeof component.getName === 'function';
        var hasGet = typeof component.get === 'function';
        var hasGetOut = typeof component.getOut === 'function';
        var hasGetSlots = typeof component.getSlots === 'function';
        return hasGetName && hasGet && hasGetOut && hasGetSlots;
      });
  }

  function testBatchResolveResolvesAllOrds() {
    var baja = getMockBaja();
    var ords = [
      'station:|slot:/Test/Main_Energy_kWh',
      'station:|slot:/Test/Solar_Energy_kWh'
    ];
    var resolve = new baja.BatchResolve(ords);
    var eachCalled = 0;

    return resolve.resolve({
      subscriber: new baja.Subscriber(),
      each: function() { eachCalled++; }
    }).then(function() {
      return eachCalled === 2;
    });
  }

  function testBatchResolveCallsEach() {
    var baja = getMockBaja();
    var resolve = new baja.BatchResolve([
      'station:|slot:/Test/Main_Energy_kWh'
    ]);
    var descriptorReceived = null;

    return resolve.resolve({
      subscriber: new baja.Subscriber(),
      each: function() {
        descriptorReceived = this.toPathString();
      }
    }).then(function() {
      return descriptorReceived !== null;
    });
  }

  function testSubscriberHasRequiredMethods() {
    var baja = getMockBaja();
    var sub = new baja.Subscriber();

    var hasAttach = typeof sub.attach === 'function';
    var hasUnsubscribeAll = typeof sub.unsubscribeAll === 'function';
    var hasDetach = typeof sub.detach === 'function';

    return hasAttach && hasUnsubscribeAll && hasDetach;
  }

  function testBajaErrorPrintsToConsole() {
    var baja = getMockBaja();
    var errMsg = '';

    var origError = console.error;
    console.error = function(msg) { errMsg = msg; };

    baja.error('test error message');

    console.error = origError;
    return errMsg === 'test error message';
  }

  function testShimProvidesSampleDataForVisionMetering() {
    var baja = getMockBaja();
    var folderOrd = 'station:|slot:/Drivers/AbstractMqttDriverNetwork/FordHiveMQTT/points/VisionMetering';

    return baja.Ord.make(folderOrd).get()
      .then(function(folder) {
        var slots = folder.getSlots();
        if (slots.isEmpty()) return false;

        var found = false;
        slots.list().forEach(function(slot) {
          if (slot.getName().indexOf('Energy') !== -1) found = true;
        });
        return found;
      });
  }

  function getMockBaja() {
    var baja = null;
    window.bajaRequire(['baja!', 'jquery'], function(b, $) {
      baja = b;
    });
    return baja;
  }

  return { runAll: runAll };
})();
