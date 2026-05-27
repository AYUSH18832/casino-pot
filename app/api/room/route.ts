import { NextRequest, NextResponse } from 'next/server';
import { store, Room } from '@/lib/store';

function generateId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function POST(req: NextRequest) {
  try {
    const { name, gameType, hostName, currency } = await req.json();

    if (!name || !gameType || !hostName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let id = generateId();
    let attempts = 0;
    while (store.get(id) && attempts < 10) { id = generateId(); attempts++; }

    const hostId = crypto.randomUUID();
    const now = Date.now();

    const room: Room = {
      id,
      name,
      gameType,
      hostId,
      hostName,
      players: [{ id: hostId, name: hostName, contribution: 0, joinedAt: now }],
      pot: 0,
      entries: [],
      winners: [],
      createdAt: now,
      updatedAt: now,
      currency: currency || '₹',
      status: 'active',
    };

    store.set(id, room);

    return NextResponse.json({ room, playerId: hostId });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
