import jscodeshift from "jscodeshift";
import flightHelpers from "../helpers/flight";
import { findTopLevelFunction, difference } from "../helpers";

jscodeshift.registerMethods(flightHelpers);

const transform = ({ source, path: file }, { jscodeshift: j }, options = {}) => {
  const ast = j(source);

  const { strict = false, printOptions = { tabWidth: 2 } } = options;

  const defaultAttrs = ast.findDefaultAttrs();
  const attrs = ast.findDeclaredAttributes();

  const declaredAttrKeys = new Set(
    attrs.nodes().reduce((agg, { properties }) => [...agg, ...properties.map(p => p.key.name)], [])
  );

  const usedAttrKeys = new Set(
    ast.findUsedAttributes().nodes().map(p => p.property.name)
  );

  const undeclaredAttrKeys = difference(usedAttrKeys, declaredAttrKeys);

  const value = strict ? j.literal(null) : j.identifier("undefined");
  const properties = [
    ...attrs.nodes().reduce((r, node) => [...r, ...node.properties], []),
    ...undeclaredAttrKeys.map(attr => j.property("init", j.identifier(attr), value))
  ];

  // Declare previously undeclared attrs
  if (undeclaredAttrKeys.length) {

    // Using existing attributes
    if (attrs.size()) {
      attrs.replaceWith(path => {
        return j.objectExpression(properties);
      });

    // Create new attributes block (one didn't exist already)
    } else if (!ast.hasDirectAttrs()) {
      const component = ast.findUsedAttributes().at(0).map(path => findTopLevelFunction(path)).get().value.body.body;
      const attributesExpression = j(j.expressionStatement(j.callExpression(j.memberExpression(j.thisExpression(), j.identifier("attributes")), [
        j.objectExpression(properties)
      ])));

      component.unshift(attributesExpression.toSource(printOptions));

    // Uncertainty – log an error (and continue)
    } else {
      console.error(`Can't add attributes to ${file}`);
    }
  }

  // Rename `this.defaultAttrs` to `this.attributes`
  defaultAttrs.replaceWith(
    j.identifier("attributes")
  );

  // Replace `this.defaults` assignment with `this.attributes`
  ast.findDefaultsAssignment().replaceWith(
    j.callExpression(j.memberExpression(j.thisExpression(), j.identifier("attributes")), [
      j.objectExpression(properties)
    ])
  );

  return ast.toSource(printOptions);
};

export default transform;
