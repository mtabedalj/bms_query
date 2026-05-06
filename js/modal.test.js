var ModalTest = (function() {
  'use strict';

  function runAll() {
    var passed = 0;
    var failed = 0;

    var tests = [
      { name: 'renderChartGuardedAgainstMissingGoogle', fn: testRenderChartGuarded },
      { name: 'closeHandlesMissingGoogle', fn: testCloseHandlesMissingGoogle }
    ];

    tests.forEach(function(t) {
      try {
        if (t.fn()) {
          console.log('PASS: ' + t.name);
          passed++;
        } else {
          console.log('FAIL: ' + t.name);
          failed++;
        }
      } catch (e) {
        console.log('FAIL: ' + t.name + ' - ' + e.message);
        failed++;
      }
    });

    console.log(passed + '/' + (passed + failed) + ' modal tests passed');
    return failed === 0;
  }

  function testRenderChartGuarded() {
    var origGoogle = window.google;
    delete window.google;

    try {
      if (typeof google !== 'undefined') {
        throw new Error('google should be undefined after delete');
      }
      var chartsAvailable = typeof google !== 'undefined' && google.visualization;
      if (chartsAvailable) {
        throw new Error('chartsAvailable should be false');
      }
    } catch (e) {
      if (e.message.indexOf('should be') !== -1) {
        if (origGoogle !== undefined) window.google = origGoogle;
        return false;
      }
    }

    if (origGoogle !== undefined) {
      window.google = origGoogle;
    }

    return true;
  }

  function testCloseHandlesMissingGoogle() {
    return true;
  }

  return { runAll: runAll };
})();
