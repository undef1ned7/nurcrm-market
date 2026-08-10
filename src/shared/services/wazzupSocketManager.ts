/** Stub: shared Wazzup WS manager used by useWazzupChatSocket. */

export function acquireWazzupSocket(): () => void {
  return () => {};
}

export function subscribeWazzupStatus(cb: any): () => void {
  void cb;
  return () => {};
}

export function subscribeWazzupSocket(handlers: any = {}): () => void {
  void handlers;
  return () => {};
}

export function sendWazzupChatMessage(payload: any): void {
  void payload;
}
