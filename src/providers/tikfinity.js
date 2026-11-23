// TikFinity Desktop source: TikFinity signs in to the channel owner's TikTok and emits events on a local WebSocket.
// Events come from whichever live TikFinity is connected to; the channel name entered in the control panel is for display only.

import WebSocket from 'ws';
import { normalizeTikFinity } from '../core/normalize.js';

export function createTikFinity({ url, onEvent, onStatus }) {
  let ws = null;

  return {
    name: 'tikfinity',
    start() {
      return new Promise((resolve, reject) => {
        const sock = new WebSocket(url, { handshakeTimeout: 3000 });
        ws = sock;
        let opened = false;
        sock.on('open', () => { opened = true; resolve(); });
        sock.on('message', (raw) => { if (ws === sock) for (const ev of normalizeTikFinity(raw)) onEvent(ev); });
        sock.on('error', (err) => { if (!opened) reject(new Error(`Không thấy TikFinity ở ${url} (${err.code || err.message})`)); });
        sock.on('close', () => { if (ws === sock && opened) { ws = null; onStatus('lost', 'TikFinity đã đóng kết nối'); } });
      });
    },
    async stop() { const s = ws; ws = null; try { s?.terminate(); } catch {} },
  };
}
