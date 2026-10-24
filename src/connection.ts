import { io } from "socket.io-client";
import { newId } from "./session";

export const socket = io({ autoConnect: false });
export type Reply = {
  ok: boolean;
  error?: string;
  errorCode?: string;
  code?: string;
  token?: string;
};
export class RequestError extends Error {
  constructor(
    message: string,
    public code = "TRANSPORT",
  ) {
    super(message);
  }
}
export async function request(
  event: string,
  data: object = {},
): Promise<Reply> {
  const payload = { ...data, requestId: newId() };
  const socketId = socket.id;
  // Retry only on the same live connection, using an idempotency key. Never
  // buffer a stale game action and replay it after reconnection or a new game.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!socket.connected || socket.id !== socketId)
      throw new RequestError(
        "Connection lost. Your session is saved; wait for reconnection.",
      );
    try {
      const reply: Reply = await socket
        .timeout(5000)
        .emitWithAck(event, payload);
      if (!reply.ok)
        throw new RequestError(
          reply.error || "The request could not be completed.",
          reply.errorCode || "REJECTED",
        );
      return reply;
    } catch (error) {
      if (error instanceof RequestError) throw error;
      if (attempt === 1)
        throw new RequestError(
          "The server is taking too long. Please retry when connected.",
        );
    }
  }
  throw new RequestError("Connection unavailable.");
}
