export type GameType = 'poker' | 'teen-patti';

export interface Player {
  id: string;
  name: string;
  contribution: number;
  joinedAt: number;
}

export interface PotEntry {
  id: string;
  playerId: string;
  playerName: string;
  amount: number;
  note: string;
  timestamp: number;
}

export interface Room {
  id: string;
  name: string;
  gameType: GameType;
  hostId: string;
  hostName: string;
  players: Player[];
  pot: number;
  entries: PotEntry[];
  winners: { playerId: string; playerName: string; amount: number; timestamp: number }[];
  createdAt: number;
  updatedAt: number;
  currency: string;
  status: 'active' | 'closed';
}

// Global in-memory store (persists across requests within same instance)
const rooms = new Map<string, Room>();

// Auto-cleanup rooms older than 24h
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, room] of rooms.entries()) {
    if (room.createdAt < cutoff) rooms.delete(id);
  }
}, 60 * 60 * 1000);

export const store = {
  get: (id: string): Room | undefined => rooms.get(id.toUpperCase()),
  set: (id: string, room: Room) => { rooms.set(id.toUpperCase(), room); },
  delete: (id: string) => rooms.delete(id.toUpperCase()),
};
