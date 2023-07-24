export function parseExceptionReport(parsedXML) {
  var _exceptionReport$exce, _exceptionReport$exce2, _exceptionReport$exce3;
  const exceptionReport = parsedXML.exceptionReport;
  if (!exceptionReport) {
    return;
  }
  const errorMessage = ((_exceptionReport$exce = exceptionReport.exception) === null || _exceptionReport$exce === void 0 ? void 0 : _exceptionReport$exce.exceptionText) || ((_exceptionReport$exce2 = exceptionReport.exception) === null || _exceptionReport$exce2 === void 0 ? void 0 : _exceptionReport$exce2.exceptionCode) || ((_exceptionReport$exce3 = exceptionReport.exception) === null || _exceptionReport$exce3 === void 0 ? void 0 : _exceptionReport$exce3.locator) || 'server error';
  throw new Error("Catalog Server: ".concat(errorMessage));
}
//# sourceMappingURL=parse-exception-report.js.map