const GL_NO_ERROR = 0;
const GL_INVALID_ENUM = 0x0500;
const GL_INVALID_VALUE = 0x0501;
const GL_INVALID_OPERATION = 0x0502;
const GL_OUT_OF_MEMORY = 0x0505;
const GL_CONTEXT_LOST_WEBGL = 0x9242;
const GL_INVALID_FRAMEBUFFER_OPERATION = 0x0506;
const GL_ERROR_MESSAGES = {
  [GL_CONTEXT_LOST_WEBGL]: 'WebGL context lost',
  [GL_INVALID_ENUM]: 'WebGL invalid enumerated argument',
  [GL_INVALID_VALUE]: 'WebGL invalid value',
  [GL_INVALID_OPERATION]: 'WebGL invalid operation',
  [GL_INVALID_FRAMEBUFFER_OPERATION]: 'WebGL invalid framebuffer operation',
  [GL_OUT_OF_MEMORY]: 'WebGL out of memory'
};

function glGetErrorMessage(gl, glError) {
  return GL_ERROR_MESSAGES[glError] || "WebGL unknown error ".concat(glError);
}

export function glGetError(gl) {
  const errorStack = [];
  let glError = gl.getError();

  while (glError !== GL_NO_ERROR) {
    errorStack.push(glGetErrorMessage(gl, glError));
    glError = gl.getError();
  }

  return errorStack.length ? new Error(errorStack.join('\n')) : null;
}
export function glCheckError(gl) {
  if (gl.debug) {
    const error = glGetError(gl);

    if (error) {
      throw error;
    }
  }
}
//# sourceMappingURL=get-error.js.map