"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initializeHierarchy = initializeHierarchy;
exports.traverseHierarchy = traverseHierarchy;
var defined = function defined(x) {
  return x !== undefined;
};
function initializeHierarchy(batchTable, jsonHeader, binaryBody) {
  if (!jsonHeader) {
    return null;
  }
  var hierarchy = batchTable.getExtension('3DTILES_batch_table_hierarchy');
  var legacyHierarchy = jsonHeader.HIERARCHY;
  if (legacyHierarchy) {
    console.warn('3D Tile Parser: HIERARCHY is deprecated. Use 3DTILES_batch_table_hierarchy.');
    jsonHeader.extensions = jsonHeader.extensions || {};
    jsonHeader.extensions['3DTILES_batch_table_hierarchy'] = legacyHierarchy;
    hierarchy = legacyHierarchy;
  }
  if (!hierarchy) {
    return null;
  }
  return initializeHierarchyValues(hierarchy, binaryBody);
}
function initializeHierarchyValues(hierarchyJson, binaryBody) {
  var i;
  var classId;
  var binaryAccessor;
  var instancesLength = hierarchyJson.instancesLength;
  var classes = hierarchyJson.classes;
  var classIds = hierarchyJson.classIds;
  var parentCounts = hierarchyJson.parentCounts;
  var parentIds = hierarchyJson.parentIds;
  var parentIdsLength = instancesLength;
  if (defined(classIds.byteOffset)) {
    classIds.componentType = defaultValue(classIds.componentType, GL.UNSIGNED_SHORT);
    classIds.type = AttributeType.SCALAR;
    binaryAccessor = getBinaryAccessor(classIds);
    classIds = binaryAccessor.createArrayBufferView(binaryBody.buffer, binaryBody.byteOffset + classIds.byteOffset, instancesLength);
  }
  var parentIndexes;
  if (defined(parentCounts)) {
    if (defined(parentCounts.byteOffset)) {
      parentCounts.componentType = defaultValue(parentCounts.componentType, GL.UNSIGNED_SHORT);
      parentCounts.type = AttributeType.SCALAR;
      binaryAccessor = getBinaryAccessor(parentCounts);
      parentCounts = binaryAccessor.createArrayBufferView(binaryBody.buffer, binaryBody.byteOffset + parentCounts.byteOffset, instancesLength);
    }
    parentIndexes = new Uint16Array(instancesLength);
    parentIdsLength = 0;
    for (i = 0; i < instancesLength; ++i) {
      parentIndexes[i] = parentIdsLength;
      parentIdsLength += parentCounts[i];
    }
  }
  if (defined(parentIds) && defined(parentIds.byteOffset)) {
    parentIds.componentType = defaultValue(parentIds.componentType, GL.UNSIGNED_SHORT);
    parentIds.type = AttributeType.SCALAR;
    binaryAccessor = getBinaryAccessor(parentIds);
    parentIds = binaryAccessor.createArrayBufferView(binaryBody.buffer, binaryBody.byteOffset + parentIds.byteOffset, parentIdsLength);
  }
  var classesLength = classes.length;
  for (i = 0; i < classesLength; ++i) {
    var classInstancesLength = classes[i].length;
    var properties = classes[i].instances;
    var binaryProperties = getBinaryProperties(classInstancesLength, properties, binaryBody);
    classes[i].instances = combine(binaryProperties, properties);
  }
  var classCounts = new Array(classesLength).fill(0);
  var classIndexes = new Uint16Array(instancesLength);
  for (i = 0; i < instancesLength; ++i) {
    classId = classIds[i];
    classIndexes[i] = classCounts[classId];
    ++classCounts[classId];
  }
  var hierarchy = {
    classes: classes,
    classIds: classIds,
    classIndexes: classIndexes,
    parentCounts: parentCounts,
    parentIndexes: parentIndexes,
    parentIds: parentIds
  };
  validateHierarchy(hierarchy);
  return hierarchy;
}
function traverseHierarchy(hierarchy, instanceIndex, endConditionCallback) {
  if (!hierarchy) {
    return;
  }
  var parentCounts = hierarchy.parentCounts;
  var parentIds = hierarchy.parentIds;
  if (parentIds) {
    return endConditionCallback(hierarchy, instanceIndex);
  }
  if (parentCounts > 0) {
    return traverseHierarchyMultipleParents(hierarchy, instanceIndex, endConditionCallback);
  }
  return traverseHierarchySingleParent(hierarchy, instanceIndex, endConditionCallback);
}
function traverseHierarchyMultipleParents(hierarchy, instanceIndex, endConditionCallback) {
  var classIds = hierarchy.classIds;
  var parentCounts = hierarchy.parentCounts;
  var parentIds = hierarchy.parentIds;
  var parentIndexes = hierarchy.parentIndexes;
  var instancesLength = classIds.length;
  var visited = scratchVisited;
  visited.length = Math.max(visited.length, instancesLength);
  var visitedMarker = ++marker;
  var stack = scratchStack;
  stack.length = 0;
  stack.push(instanceIndex);
  while (stack.length > 0) {
    instanceIndex = stack.pop();
    if (visited[instanceIndex] === visitedMarker) {
      continue;
    }
    visited[instanceIndex] = visitedMarker;
    var result = endConditionCallback(hierarchy, instanceIndex);
    if (defined(result)) {
      return result;
    }
    var parentCount = parentCounts[instanceIndex];
    var parentIndex = parentIndexes[instanceIndex];
    for (var i = 0; i < parentCount; ++i) {
      var parentId = parentIds[parentIndex + i];
      if (parentId !== instanceIndex) {
        stack.push(parentId);
      }
    }
  }
  return null;
}
function traverseHierarchySingleParent(hierarchy, instanceIndex, endConditionCallback) {
  var hasParent = true;
  while (hasParent) {
    var result = endConditionCallback(hierarchy, instanceIndex);
    if (defined(result)) {
      return result;
    }
    var parentId = hierarchy.parentIds[instanceIndex];
    hasParent = parentId !== instanceIndex;
    instanceIndex = parentId;
  }
  throw new Error('traverseHierarchySingleParent');
}
function validateHierarchy(hierarchy) {
  var scratchValidateStack = [];
  var classIds = hierarchy.classIds;
  var instancesLength = classIds.length;
  for (var i = 0; i < instancesLength; ++i) {
    validateInstance(hierarchy, i, stack);
  }
}
function validateInstance(hierarchy, instanceIndex, stack) {
  var parentCounts = hierarchy.parentCounts;
  var parentIds = hierarchy.parentIds;
  var parentIndexes = hierarchy.parentIndexes;
  var classIds = hierarchy.classIds;
  var instancesLength = classIds.length;
  if (!defined(parentIds)) {
    return;
  }
  assert(instanceIndex < instancesLength, "Parent index ".concat(instanceIndex, " exceeds the total number of instances: ").concat(instancesLength));
  assert(stack.indexOf(instanceIndex) === -1, 'Circular dependency detected in the batch table hierarchy.');
  stack.push(instanceIndex);
  var parentCount = defined(parentCounts) ? parentCounts[instanceIndex] : 1;
  var parentIndex = defined(parentCounts) ? parentIndexes[instanceIndex] : instanceIndex;
  for (var i = 0; i < parentCount; ++i) {
    var parentId = parentIds[parentIndex + i];
    if (parentId !== instanceIndex) {
      validateInstance(hierarchy, parentId, stack);
    }
  }
  stack.pop(instanceIndex);
}
//# sourceMappingURL=tile-3d-batch-table-hierarchy.js.map