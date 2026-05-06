var BootstrapTest = (function() {
  'use strict';

  function runAll() {
    var passed = 0;
    var failed = 0;

    var tests = [
      { name: 'showsErrorWhenBajaRequireMissing', fn: testShowsErrorWhenBajaRequireMissing },
      { name: 'hidesLoadingWhenBajaRequireMissing', fn: testHidesLoadingWhenBajaRequireMissing },
      { name: 'callsBajaRequireWhenAvailable', fn: testCallsBajaRequireWhenAvailable },
      { name: 'noReferenceErrorWhenMissing', fn: testNoReferenceErrorWhenMissing }
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

    console.log(passed + '/' + (passed + failed) + ' bootstrap tests passed');
    return failed === 0;
  }

  function setupDom() {
    var loading = document.createElement('div');
    loading.id = 'loading';
    loading.style.display = 'block';
    loading.textContent = 'Loading points...';
    document.body.appendChild(loading);

    var error = document.createElement('div');
    error.id = 'error';
    error.className = 'error';
    error.style.display = 'none';
    error.textContent = '';
    document.body.appendChild(error);
  }

  function teardownDom() {
    var loading = document.getElementById('loading');
    var error = document.getElementById('error');
    if (loading) loading.parentNode.removeChild(loading);
    if (error) error.parentNode.removeChild(error);
  }

  function testShowsErrorWhenBajaRequireMissing() {
    setupDom();

    var called = false;

    BajaBootstrap.start(undefined, function() {
      called = true;
    });

    var errorDiv = document.getElementById('error');
    var result = errorDiv.style.display !== 'none'
      && errorDiv.textContent.indexOf('Niagara Framework') !== -1
      && !called;

    teardownDom();
    return result;
  }

  function testHidesLoadingWhenBajaRequireMissing() {
    setupDom();

    BajaBootstrap.start(undefined, function() {});

    var loadingDiv = document.getElementById('loading');
    var result = loadingDiv.style.display === 'none';

    teardownDom();
    return result;
  }

  function testCallsBajaRequireWhenAvailable() {
    setupDom();

    var bajaRequireCalled = false;
    var mockBajaRequire = function(deps, cb) {
      bajaRequireCalled = true;
    };

    BajaBootstrap.start(mockBajaRequire, function() {});

    teardownDom();
    return bajaRequireCalled;
  }

  function testNoReferenceErrorWhenMissing() {
    setupDom();

    var threw = false;
    try {
      BajaBootstrap.start(undefined, function() {});
    } catch (e) {
      threw = true;
    }

    teardownDom();
    return !threw;
  }

  return { runAll: runAll };
})();
