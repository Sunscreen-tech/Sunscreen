"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.COLOR = void 0;
exports.addColor = addColor;

var _env = require("@probe.gl/env");

var COLOR;
exports.COLOR = COLOR;

(function (COLOR) {
  COLOR[COLOR["BLACK"] = 30] = "BLACK";
  COLOR[COLOR["RED"] = 31] = "RED";
  COLOR[COLOR["GREEN"] = 32] = "GREEN";
  COLOR[COLOR["YELLOW"] = 33] = "YELLOW";
  COLOR[COLOR["BLUE"] = 34] = "BLUE";
  COLOR[COLOR["MAGENTA"] = 35] = "MAGENTA";
  COLOR[COLOR["CYAN"] = 36] = "CYAN";
  COLOR[COLOR["WHITE"] = 37] = "WHITE";
  COLOR[COLOR["BRIGHT_BLACK"] = 90] = "BRIGHT_BLACK";
  COLOR[COLOR["BRIGHT_RED"] = 91] = "BRIGHT_RED";
  COLOR[COLOR["BRIGHT_GREEN"] = 92] = "BRIGHT_GREEN";
  COLOR[COLOR["BRIGHT_YELLOW"] = 93] = "BRIGHT_YELLOW";
  COLOR[COLOR["BRIGHT_BLUE"] = 94] = "BRIGHT_BLUE";
  COLOR[COLOR["BRIGHT_MAGENTA"] = 95] = "BRIGHT_MAGENTA";
  COLOR[COLOR["BRIGHT_CYAN"] = 96] = "BRIGHT_CYAN";
  COLOR[COLOR["BRIGHT_WHITE"] = 97] = "BRIGHT_WHITE";
})(COLOR || (exports.COLOR = COLOR = {}));

function getColor(color) {
  return typeof color === 'string' ? COLOR[color.toUpperCase()] || COLOR.WHITE : color;
}

function addColor(string, color, background) {
  if (!_env.isBrowser && typeof string === 'string') {
    if (color) {
      color = getColor(color);
      string = "\x1B[".concat(color, "m").concat(string, "\x1B[39m");
    }

    if (background) {
      color = getColor(background);
      string = "\x1B[".concat(background + 10, "m").concat(string, "\x1B[49m");
    }
  }

  return string;
}
//# sourceMappingURL=color.js.map