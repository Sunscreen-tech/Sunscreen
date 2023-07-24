export function convertXMLValueToArray(xmlValue) {
  if (Array.isArray(xmlValue)) {
    return xmlValue;
  }
  if (xmlValue && typeof xmlValue === 'object' && xmlValue['0']) {}
  if (xmlValue) {
    return [xmlValue];
  }
  return [];
}
export function convertXMLFieldToArrayInPlace(xml, key) {
  xml[key] = convertXMLValueToArray(xml[key]);
}
//# sourceMappingURL=xml-utils.js.map