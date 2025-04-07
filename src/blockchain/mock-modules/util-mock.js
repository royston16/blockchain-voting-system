// Mock implementation of Node.js util module for browser
const util = {
  // Simple implementation of deprecate that returns the original function
  deprecate: function(fn, message) {
    // In a real Node.js environment, this would show deprecation warnings
    // In the browser, we'll just return the function as-is
    console.warn(`DEPRECATED: ${message}`);
    return fn;
  },
  
  // Add other util functions as needed
  inherits: function(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  },
  
  // Simple format function
  format: function(format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/%s/g, function() {
      return args.shift() || '';
    });
  }
};

export default util; 