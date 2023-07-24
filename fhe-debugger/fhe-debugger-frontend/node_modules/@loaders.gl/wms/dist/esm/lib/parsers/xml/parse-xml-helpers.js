export function getXMLArray(xmlValue) {
  if (Array.isArray(xmlValue)) {
    return xmlValue;
  }
  if (xmlValue) {
    return [xmlValue];
  }
  return [];
}
export function getXMLStringArray(xmlValue) {
  const xmlArray = getXMLArray(xmlValue);
  if (xmlArray.length > 0 && xmlArray.every(_ => typeof _ === 'string')) {
    return xmlArray;
  }
  return [];
}
export function getXMLFloat(xmlValue) {
  let defaultValue = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
  switch (typeof xmlValue) {
    case 'number':
      return xmlValue;
    case 'string':
      return parseFloat(xmlValue);
    default:
      return undefined;
  }
}
export function getXMLInteger(xmlValue) {
  let defaultValue = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
  switch (typeof xmlValue) {
    case 'number':
      return xmlValue;
    case 'string':
      return parseInt(xmlValue, 10);
    default:
      return undefined;
  }
}
export function getXMLBoolean(xmlValue) {
  switch (xmlValue) {
    case 'true':
      return true;
    case 'false':
      return false;
    case '1':
      return true;
    case '0':
      return false;
    default:
      return false;
  }
}
//# sourceMappingURL=parse-xml-helpers.js.map