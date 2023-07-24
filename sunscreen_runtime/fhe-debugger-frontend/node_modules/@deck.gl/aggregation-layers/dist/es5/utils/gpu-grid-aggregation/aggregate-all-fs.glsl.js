"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = "#version 300 es\n#define SHADER_NAME gpu-aggregation-all-fs\n\nprecision highp float;\n\nin vec2 vTextureCoord;\nuniform sampler2D uSampler;\nuniform bool combineMaxMin;\nout vec4 fragColor;\nvoid main(void) {\n  vec4 textureColor = texture(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));\n  if (textureColor.a == 0.) {\n    discard;\n  }\n  fragColor.rgb = textureColor.rgb;\n  fragColor.a = combineMaxMin ? textureColor.r : textureColor.a;\n}\n";
exports.default = _default;
//# sourceMappingURL=aggregate-all-fs.glsl.js.map