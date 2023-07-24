import ChildProcess from 'child_process';
export function getAvailablePort() {
  let defaultPort = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 3000;
  return new Promise(resolve => {
    ChildProcess.exec('lsof -i -P -n | grep LISTEN', (error, stdout) => {
      if (error) {
        resolve(defaultPort);
        return;
      }
      const portsInUse = [];
      const regex = /:(\d+) \(LISTEN\)/;
      stdout.split('\n').forEach(line => {
        const match = regex.exec(line);
        if (match) {
          portsInUse.push(Number(match[1]));
        }
      });
      let port = defaultPort;
      while (portsInUse.includes(port)) {
        port++;
      }
      resolve(port);
    });
  });
}
//# sourceMappingURL=process-utils.js.map