import jscodeshift from "jscodeshift";

const functionTypes = new Set(["FunctionExpression", "FunctionDeclaration"]);

function isTopLevelFunction(path) {
  if (!path.parent) {
    return true;
  } else if (functionTypes.has(path.parent.value.type)) {
    return false;
  } else {
    return isTopLevelFunction(path.parent);
  }
}

function findTopLevelFunction(path) {
  if (functionTypes.has(path.value.type) && isTopLevelFunction(path)) {
    return path;
  } else if (!path.parentPath) {
    return null;
  } else {
    return findTopLevelFunction(path.parentPath);
  }
}

const helpers = (j) => ({
  hasDirectAttrs() {
    return this.find(j.AssignmentExpression, {
      left: {
        type: "MemberExpression",
        object: { type: "ThisExpression" },
        property: { type: "Identifier", name: "attr" }
      },
      operator: "=",
      right: { type: "ObjectExpression" }
    }).size();
  },

  findDefaultAttrs() {
    return this.find(j.Identifier, { name: "defaultAttrs" }).filter(p => (
      p.parentPath.value.object.type == "ThisExpression"
    ));
  },

  findDefaultsAssignment() {
    return this.find(j.AssignmentExpression, {
      left: {
        type: "MemberExpression",
        object: { type: "ThisExpression" },
        property: { type: "Identifier", name: "defaults" }
      },
      operator: "=",
      right: { type: "ObjectExpression" }
    });
  },

  findDeclaredAttributes() {
    const attributes = new Set(["attributes", "defaultAttrs"]);

    const attrs = this.find(j.ObjectExpression).filter(({ parentPath }) => (
      parentPath &&
      parentPath.parentPath &&
      parentPath.parentPath.node &&
      parentPath.parentPath.node &&
      parentPath.parentPath.node.callee &&
      parentPath.parentPath.node.callee.object &&
      parentPath.parentPath.node.callee.property &&
      "ThisExpression" == parentPath.parentPath.node.callee.object.type &&
      (attributes.has(parentPath.parentPath.node.callee.property.name)) &&
      "arguments" == parentPath.name
    ));

    const defaults = this.find(j.AssignmentExpression, {
      left: {
        type: "MemberExpression",
        object: { type: "ThisExpression" },
        property: { type: "Identifier", name: "defaults" }
      },
      operator: "=",
      right: { type: "ObjectExpression" }
    }).find(j.ObjectExpression);

    return attrs.size() ? attrs : defaults;
  },

  findUsedAttributes() {
    return this.find(j.MemberExpression, {
      object: {
        object: { type: "ThisExpression" },
        property: { name: "attr" }
      }
    });
  }
});

jscodeshift.registerMethods(helpers(jscodeshift));

const transform = ({ source, path: file }, { jscodeshift: j }, options = {}) => {
  const ast = j(source);

  const { strict = false } = options;

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

      component.unshift(attributesExpression.toSource({ tabWidth: 2 }));

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

  return ast.toSource();
};

const difference = (a, b) => [...a].filter(x => !b.has(x));

export default transform;
