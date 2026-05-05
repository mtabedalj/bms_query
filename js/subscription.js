var SubscriptionManager = (function() {
  'use strict';

  var subscriber;
  var pathToDescriptor = {};
  var onChange = null;

  function subscribe(baja, descriptors, onValueChange) {
    onChange = onValueChange;
    pathToDescriptor = {};

    var ords = descriptors.map(function(d) {
      pathToDescriptor[d.slotPath] = d;
      return d.ord;
    });

    subscriber = new baja.Subscriber();

    subscriber.attach('changed', function(prop) {
      if (prop.getName() !== 'out') return;

      var path = this.toPathString();
      var descriptor = pathToDescriptor[path];

      if (descriptor) {
        var displayValue = formatValue(this.getOut());
        onChange(descriptor.slotPath, displayValue, descriptor.name);
      }
    });

    var resolve = new baja.BatchResolve(ords);

    return resolve.resolve({
      subscriber: subscriber,
      each: function() {
        var path = this.toPathString();
        var descriptor = pathToDescriptor[path];
        if (descriptor) {
          var displayValue = formatValue(this.getOut());
          onChange(descriptor.slotPath, displayValue, descriptor.name);
        }
      }
    });
  }

  function formatValue(value) {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      return Math.round(value * 100) / 100;
    }
    return value.toString();
  }

  function cleanup() {
    if (subscriber) {
      subscriber.unsubscribeAll();
      subscriber.detach();
    }
    pathToDescriptor = {};
    onChange = null;
    subscriber = null;
  }

  return {
    subscribe: subscribe,
    cleanup: cleanup
  };
})();
