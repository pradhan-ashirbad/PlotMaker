export type Panel = {
  text: string;
  author: string;
  playerId: string;
  number: number;
};
export type Player = {
  id: string;
  nickname: string;
  connected: boolean;
  left: boolean;
  skipped: boolean;
  skipAt: number | null;
};
export type Room = {
  code: string;
  gameId: string | null;
  serverTime: number;
  name: string;
  genre: string;
  maxPlayers: number;
  hostId: string;
  status: "lobby" | "writing" | "reveal";
  you: string;
  turn: number;
  currentPlayerId: string;
  completed: number;
  players: Player[];
  previous: Panel | null;
  panels: Panel[];
};
