// Loopback-only synthetic fixture probe. A partial response is never success.
const http = require('node:http');

function probe(port, { timeoutMs = 1000 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let timer;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const request = http.get({ host: '127.0.0.1', port, path: '/' }, (response) => {
      response.once('end', () => finish(response.statusCode));
      response.once('aborted', () => finish(null));
      response.on('error', () => finish(null));
      response.once('close', () => { if (!response.complete) finish(null); });
      response.resume();
    });
    request.on('error', () => finish(null));
    timer = setTimeout(() => { request.destroy(); finish(null); }, timeoutMs);
  });
}

module.exports = { probe };
