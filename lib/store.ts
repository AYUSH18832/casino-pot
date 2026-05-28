export type GameType = 'poker' | 'teen-patti';

export const STARTING_STACK = 10000;

export interface Player {
  id: string;
  name: string;
  contribution: number;
  stack: number;
  winnings: number;
  folded: boolean;
  joinedAt: number;
}

export interface PotEntry {
  id: string;
  playerId: string;
  playerName: string;
  action: 'contribute' | 'check' | 'call' | 'raise' | 'fold' | 'all-in';
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
  currentBet: number;
  entries: PotEntry[];
  winners: { playerId: string; playerName: string; amount: number; timestamp: number }[];
  createdAt: number;
  updatedAt: number;
  currency: string;
  status: 'active' | 'closed';
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DATA_DIR = join(process.cwd(), '.data');
const DATA_FILE = join(DATA_DIR, 'rooms.json');

// In-memory cache backed by a small JSON file so room state survives restarts.
const rooms = new Map<string, Room>();

function normalizeId(id: string) {
  return id.toUpperCase();
}

function loadRoomsFromDisk() {
  rooms.clear();

  if (!existsSync(DATA_FILE)) return;

  try {
    const raw = readFileSync(DATA_FILE, 'utf8');
    if (!raw.trim()) return;
    const parsed = JSON.parse(raw) as Room[];
    parsed.forEach(room => {
      rooms.set(normalizeId(room.id), room);
    });
  } catch {
    rooms.clear();
  }
}

function saveRoomsToDisk() {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify([...rooms.values()], null, 2), 'utf8');
}

// Auto-cleanup rooms older than 24h
setInterval(() => {
  loadRoomsFromDisk();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, room] of rooms.entries()) {
    if (room.createdAt < cutoff) rooms.delete(id);
  }
  saveRoomsToDisk();
}, 60 * 60 * 1000);

export const store = {
  get: (id: string): Room | undefined => {
    loadRoomsFromDisk();
    return rooms.get(normalizeId(id));
  },
  set: (id: string, room: Room) => {
    loadRoomsFromDisk();
    rooms.set(normalizeId(id), room);
    saveRoomsToDisk();
  },
  delete: (id: string) => {
    loadRoomsFromDisk();
    const deleted = rooms.delete(normalizeId(id));
    if (deleted) saveRoomsToDisk();
    return deleted;
  },
};
