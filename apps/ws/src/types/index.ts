import { WebSocket } from "ws";

export interface User {
  id: number;
  ws: WebSocket;
}
