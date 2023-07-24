"use strict";
// A set of typescript types manually adapted from the Draco web IDL
// Draco JS is a bit tricky to work with due to the C++ emscripten code base
// sparse documentation, so these types provide an extra safety net.
Object.defineProperty(exports, "__esModule", { value: true });
exports.draco_StatusCode = exports.draco_DataType = exports.draco_EncodedGeometryType = exports.draco_GeometryAttribute_Type = void 0;
// DRACO WEB DECODER IDL
/** Draco3D geometry attribute type */
var draco_GeometryAttribute_Type;
(function (draco_GeometryAttribute_Type) {
    draco_GeometryAttribute_Type[draco_GeometryAttribute_Type["draco_GeometryAttribute::INVALID"] = 0] = "draco_GeometryAttribute::INVALID";
    draco_GeometryAttribute_Type[draco_GeometryAttribute_Type["draco_GeometryAttribute::POSITION"] = 1] = "draco_GeometryAttribute::POSITION";
    draco_GeometryAttribute_Type[draco_GeometryAttribute_Type["draco_GeometryAttribute::NORMAL"] = 2] = "draco_GeometryAttribute::NORMAL";
    draco_GeometryAttribute_Type[draco_GeometryAttribute_Type["draco_GeometryAttribute::COLOR"] = 3] = "draco_GeometryAttribute::COLOR";
    draco_GeometryAttribute_Type[draco_GeometryAttribute_Type["draco_GeometryAttribute::TEX_COORD"] = 4] = "draco_GeometryAttribute::TEX_COORD";
    draco_GeometryAttribute_Type[draco_GeometryAttribute_Type["draco_GeometryAttribute::GENERIC"] = 5] = "draco_GeometryAttribute::GENERIC";
})(draco_GeometryAttribute_Type = exports.draco_GeometryAttribute_Type || (exports.draco_GeometryAttribute_Type = {}));
/** Draco3D encoded geometry type */
var draco_EncodedGeometryType;
(function (draco_EncodedGeometryType) {
    draco_EncodedGeometryType[draco_EncodedGeometryType["draco::INVALID_GEOMETRY_TYPE"] = 0] = "draco::INVALID_GEOMETRY_TYPE";
    draco_EncodedGeometryType[draco_EncodedGeometryType["draco::POINT_CLOUD"] = 1] = "draco::POINT_CLOUD";
    draco_EncodedGeometryType[draco_EncodedGeometryType["draco::TRIANGULAR_MESH"] = 2] = "draco::TRIANGULAR_MESH";
})(draco_EncodedGeometryType = exports.draco_EncodedGeometryType || (exports.draco_EncodedGeometryType = {}));
/** Draco3D data type */
var draco_DataType;
(function (draco_DataType) {
    draco_DataType[draco_DataType["draco::DT_INVALID"] = 0] = "draco::DT_INVALID";
    draco_DataType[draco_DataType["draco::DT_INT8"] = 1] = "draco::DT_INT8";
    draco_DataType[draco_DataType["draco::DT_UINT8"] = 2] = "draco::DT_UINT8";
    draco_DataType[draco_DataType["draco::DT_INT16"] = 3] = "draco::DT_INT16";
    draco_DataType[draco_DataType["draco::DT_UINT16"] = 4] = "draco::DT_UINT16";
    draco_DataType[draco_DataType["draco::DT_INT32"] = 5] = "draco::DT_INT32";
    draco_DataType[draco_DataType["draco::DT_UINT32"] = 6] = "draco::DT_UINT32";
    draco_DataType[draco_DataType["draco::DT_INT64"] = 7] = "draco::DT_INT64";
    draco_DataType[draco_DataType["draco::DT_UINT64"] = 8] = "draco::DT_UINT64";
    draco_DataType[draco_DataType["draco::DT_FLOAT32"] = 9] = "draco::DT_FLOAT32";
    draco_DataType[draco_DataType["draco::DT_FLOAT64"] = 10] = "draco::DT_FLOAT64";
    draco_DataType[draco_DataType["draco::DT_BOOL"] = 11] = "draco::DT_BOOL";
    draco_DataType[draco_DataType["draco::DT_TYPES_COUNT"] = 12] = "draco::DT_TYPES_COUNT";
})(draco_DataType = exports.draco_DataType || (exports.draco_DataType = {}));
/** Draco3D status code */
var draco_StatusCode;
(function (draco_StatusCode) {
    draco_StatusCode[draco_StatusCode["draco_Status::OK"] = 0] = "draco_Status::OK";
    draco_StatusCode[draco_StatusCode["draco_Status::DRACO_ERROR"] = 1] = "draco_Status::DRACO_ERROR";
    draco_StatusCode[draco_StatusCode["draco_Status::IO_ERROR"] = 2] = "draco_Status::IO_ERROR";
    draco_StatusCode[draco_StatusCode["draco_Status::INVALID_PARAMETER"] = 3] = "draco_Status::INVALID_PARAMETER";
    draco_StatusCode[draco_StatusCode["draco_Status::UNSUPPORTED_VERSION"] = 4] = "draco_Status::UNSUPPORTED_VERSION";
    draco_StatusCode[draco_StatusCode["draco_Status::UNKNOWN_VERSION"] = 5] = "draco_Status::UNKNOWN_VERSION";
})(draco_StatusCode = exports.draco_StatusCode || (exports.draco_StatusCode = {}));
