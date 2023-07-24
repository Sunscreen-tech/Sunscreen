(() => {
  // src/lib/async-queue/async-queue.ts
  var AsyncQueue = class {
    constructor() {
      this._values = [];
      this._settlers = [];
      this._closed = false;
    }
    [Symbol.asyncIterator]() {
      return this;
    }
    push(value) {
      return this.enqueue(value);
    }
    enqueue(value) {
      if (this._closed) {
        throw new Error("Closed");
      }
      if (this._settlers.length > 0) {
        if (this._values.length > 0) {
          throw new Error("Illegal internal state");
        }
        const settler = this._settlers.shift();
        if (value instanceof Error) {
          settler.reject(value);
        } else {
          settler.resolve({ value });
        }
      } else {
        this._values.push(value);
      }
    }
    close() {
      while (this._settlers.length > 0) {
        const settler = this._settlers.shift();
        settler.resolve({ done: true });
      }
      this._closed = true;
    }
    next() {
      if (this._values.length > 0) {
        const value = this._values.shift();
        if (value instanceof Error) {
          return Promise.reject(value);
        }
        return Promise.resolve({ done: false, value });
      }
      if (this._closed) {
        if (this._settlers.length > 0) {
          throw new Error("Illegal internal state");
        }
        return Promise.resolve({ done: true, value: void 0 });
      }
      return new Promise((resolve, reject) => {
        this._settlers.push({ resolve, reject });
      });
    }
  };

  // src/lib/worker-utils/get-transfer-list.ts
  function getTransferList(object, recursive = true, transfers) {
    const transfersSet = transfers || new Set();
    if (!object) {
    } else if (isTransferable(object)) {
      transfersSet.add(object);
    } else if (isTransferable(object.buffer)) {
      transfersSet.add(object.buffer);
    } else if (ArrayBuffer.isView(object)) {
    } else if (recursive && typeof object === "object") {
      for (const key in object) {
        getTransferList(object[key], recursive, transfersSet);
      }
    }
    return transfers === void 0 ? Array.from(transfersSet) : [];
  }
  function isTransferable(object) {
    if (!object) {
      return false;
    }
    if (object instanceof ArrayBuffer) {
      return true;
    }
    if (typeof MessagePort !== "undefined" && object instanceof MessagePort) {
      return true;
    }
    if (typeof ImageBitmap !== "undefined" && object instanceof ImageBitmap) {
      return true;
    }
    if (typeof OffscreenCanvas !== "undefined" && object instanceof OffscreenCanvas) {
      return true;
    }
    return false;
  }

  // src/lib/worker-farm/worker-body.ts
  function getParentPort() {
    let parentPort;
    try {
      eval("globalThis.parentPort = require('worker_threads').parentPort");
      parentPort = globalThis.parentPort;
    } catch {
    }
    return parentPort;
  }
  var onMessageWrapperMap = new Map();
  var WorkerBody = class {
    static inWorkerThread() {
      return typeof self !== "undefined" || Boolean(getParentPort());
    }
    static set onmessage(onMessage) {
      function handleMessage(message) {
        const parentPort3 = getParentPort();
        const { type, payload } = parentPort3 ? message : message.data;
        onMessage(type, payload);
      }
      const parentPort2 = getParentPort();
      if (parentPort2) {
        parentPort2.on("message", handleMessage);
        parentPort2.on("exit", () => console.debug("Node worker closing"));
      } else {
        globalThis.onmessage = handleMessage;
      }
    }
    static addEventListener(onMessage) {
      let onMessageWrapper = onMessageWrapperMap.get(onMessage);
      if (!onMessageWrapper) {
        onMessageWrapper = (message) => {
          if (!isKnownMessage(message)) {
            return;
          }
          const parentPort3 = getParentPort();
          const { type, payload } = parentPort3 ? message : message.data;
          onMessage(type, payload);
        };
      }
      const parentPort2 = getParentPort();
      if (parentPort2) {
        console.error("not implemented");
      } else {
        globalThis.addEventListener("message", onMessageWrapper);
      }
    }
    static removeEventListener(onMessage) {
      const onMessageWrapper = onMessageWrapperMap.get(onMessage);
      onMessageWrapperMap.delete(onMessage);
      const parentPort2 = getParentPort();
      if (parentPort2) {
        console.error("not implemented");
      } else {
        globalThis.removeEventListener("message", onMessageWrapper);
      }
    }
    static postMessage(type, payload) {
      const data = { source: "loaders.gl", type, payload };
      const transferList = getTransferList(payload);
      const parentPort2 = getParentPort();
      if (parentPort2) {
        parentPort2.postMessage(data, transferList);
      } else {
        globalThis.postMessage(data, transferList);
      }
    }
  };
  function isKnownMessage(message) {
    const { type, data } = message;
    return type === "message" && data && typeof data.source === "string" && data.source.startsWith("loaders.gl");
  }

  // src/lib/worker-api/create-worker.ts
  var requestId = 0;
  var inputBatches;
  var options;
  function createWorker(process, processInBatches) {
    if (!WorkerBody.inWorkerThread()) {
      return;
    }
    const context = {
      process: processOnMainThread
    };
    WorkerBody.onmessage = async (type, payload) => {
      try {
        switch (type) {
          case "process":
            if (!process) {
              throw new Error("Worker does not support atomic processing");
            }
            const result = await process(payload.input, payload.options || {}, context);
            WorkerBody.postMessage("done", { result });
            break;
          case "process-in-batches":
            if (!processInBatches) {
              throw new Error("Worker does not support batched processing");
            }
            inputBatches = new AsyncQueue();
            options = payload.options || {};
            const resultIterator = processInBatches(inputBatches, options, context);
            for await (const batch of resultIterator) {
              WorkerBody.postMessage("output-batch", { result: batch });
            }
            WorkerBody.postMessage("done", {});
            break;
          case "input-batch":
            inputBatches.push(payload.input);
            break;
          case "input-done":
            inputBatches.close();
            break;
          default:
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        WorkerBody.postMessage("error", { error: message });
      }
    };
  }
  function processOnMainThread(arrayBuffer, options2 = {}) {
    return new Promise((resolve, reject) => {
      const id = requestId++;
      const onMessage = (type, payload2) => {
        if (payload2.id !== id) {
          return;
        }
        switch (type) {
          case "done":
            WorkerBody.removeEventListener(onMessage);
            resolve(payload2.result);
            break;
          case "error":
            WorkerBody.removeEventListener(onMessage);
            reject(payload2.error);
            break;
          default:
        }
      };
      WorkerBody.addEventListener(onMessage);
      const payload = { id, input: arrayBuffer, options: options2 };
      WorkerBody.postMessage("process", payload);
    });
  }

  // src/workers/null-worker.ts
  createWorker(async (data) => {
    return data;
  });
})();
//# sourceMappingURL=null-worker.js.map
