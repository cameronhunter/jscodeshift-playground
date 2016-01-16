This transform migrates FlightJS components using deprecated attribute
definitions such as direct `defaults` assignments and `defaultAttrs` to the new
`attributes` API.

### Before
```javascript
function myFlightComponent() {
  this.defaults = {
    foo: "foo"
  };

  this.after("initialize", function() {
    this.trigger(this.attr.foo);
    this.trigger(this.attr.bar);
  });
};
```

```javascript
function myFlightComponent() {
  this.defaultAttrs({
    foo: "foo"
  });

  this.after("initialize", function() {
    this.trigger(this.attr.foo);
    this.trigger(this.attr.bar);
  });
};
```

### After
```javascript
function myFlightComponent() {
  this.attributes({
    foo: "foo",
    bar: undefined
  });

  this.after("initialize", function() {
    this.trigger(this.attr.foo);
    this.trigger(this.attr.bar);
  });
};
```
