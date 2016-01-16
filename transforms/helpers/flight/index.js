import j from "jscodeshift";
import { exists } from "../index";

export default {
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

    const attrs = this.find(j.ObjectExpression).filter(path => (
      exists(path, "parentPath", "node", "callee", "object") &&
      exists(path, "parentPath", "node", "callee", "property") &&
      "ThisExpression" == path.parentPath.parentPath.node.callee.object.type &&
      (attributes.has(path.parentPath.parentPath.node.callee.property.name)) &&
      "arguments" == path.parentPath.name
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
}
