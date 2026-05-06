var BajaBootstrap = (function() {
  'use strict';

  function start(bajaRequire, initCallback) {
    if (typeof bajaRequire !== 'function') {
      var errorDiv = document.getElementById('error');
      var loadingDiv = document.getElementById('loading');

      if (loadingDiv) {
        loadingDiv.style.display = 'none';
      }

      if (errorDiv) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'This application requires the Niagara Framework. Please load this page from within a Niagara station.';
      }

      return;
    }

    bajaRequire(['baja!', 'jquery'], initCallback);
  }

  return { start: start };
})();
