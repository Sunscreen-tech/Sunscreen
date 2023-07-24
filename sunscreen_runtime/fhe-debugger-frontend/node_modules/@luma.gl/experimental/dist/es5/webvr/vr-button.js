"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createEnterVRButton = createEnterVRButton;

function createEnterVRButton(_ref) {
  var canvas = _ref.canvas,
      title = _ref.title;

  var _canvas$getBoundingCl = canvas.getBoundingClientRect(),
      top = _canvas$getBoundingCl.top,
      left = _canvas$getBoundingCl.left,
      width = _canvas$getBoundingCl.width,
      height = _canvas$getBoundingCl.height;

  var container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = "".concat(top, "px");
  container.style.left = "".concat(left, "px");
  container.style.width = "".concat(width, "px");
  container.style.height = "".concat(height, "px");
  container.style.pointerEvents = 'none';
  container.style.zIndex = '999';
  document.body.appendChild(container);
  var button = document.createElement('button');
  button.style.padding = '16px';
  button.style.border = '1px solid #fff';
  button.style.borderRadius = '8px';
  button.style.background = 'rgba(0,0,0,0.5)';
  button.style.color = '#fff';
  button.style.font = 'normal 20px sans-serif';
  button.style.cursor = 'pointer';
  button.style.margin = '20px auto';
  button.style.display = 'block';
  button.style.pointerEvents = 'all';
  button.textContent = title;
  container.appendChild(button);
  return button;
}
//# sourceMappingURL=vr-button.js.map