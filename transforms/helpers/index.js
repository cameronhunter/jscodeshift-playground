const functionTypes = new Set(["FunctionExpression", "FunctionDeclaration"]);

export function isTopLevelFunction({ parent }) {
  if (!parent) {
    return true;
  } else if (functionTypes.has(parent.value.type)) {
    return false;
  } else {
    return isTopLevelFunction(parent);
  }
}

export function findTopLevelFunction(path) {
  if (functionTypes.has(path.value.type) && isTopLevelFunction(path)) {
    return path;
  } else if (!path.parentPath) {
    return null;
  } else {
    return findTopLevelFunction(path.parentPath);
  }
}

export function exists(obj, ...paths) {
  if (paths.length && obj != null) {
    const [head, ...tail] = paths;
    return obj != null && exists(obj[head], ...tail);
  } else {
    return obj != null;
  }
}

export const difference = (a, b) => [...a].filter(x => !b.has(x));
