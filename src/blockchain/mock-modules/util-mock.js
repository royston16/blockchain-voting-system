//mock implementation of Node.js util module for browser
const util = {
  //simple implementation of deprecate that returns the original function
  deprecate: function(fn, message) {
    
    //set the console warning to show the deprecation message
    console.warn(`DEPRECATED: ${message}`);
    return fn;
  },
  
  //add other util functions as needed
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
  
  //simple format function
  format: function(format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/%s/g, function() {
      return args.shift() || '';
    });
  }
};

//export the util object
export default util; 