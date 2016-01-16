var defineComponent = require("flight/lib/component");

module.exports = defineComponent(myComponent);

function myComponent() {
  this.defaultAttrs({
    attributeName: "default-value"
  });

  this.after("initialize", function() {
    this.attr.foo = 2;
  });
}
