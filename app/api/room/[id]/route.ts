import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = store.get(id);
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  return NextResponse.json({ room });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = store.get(id);
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  const body = await req.json();
  const { action, playerId, playerName, amount, note, winnerId } = body;

  const now = Date.now();

  if (action === 'join') {
    if (!playerName) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const exists = room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
    if (exists) {
      // Return existing player
      return NextResponse.json({ room, playerId: exists.id });
    }
    const newPlayerId = crypto.randomUUID();
    room.players.push({ id: newPlayerId, name: playerName, contribution: 0, joinedAt: now });
    room.updatedAt = now;
    store.set(id, room);
    return NextResponse.json({ room, playerId: newPlayerId });
  }

  if (action === 'contribute') {
    if (!playerId || !amount || amount <= 0) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
    const player = room.players.find(p => p.id === playerId);
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    player.contribution += amount;
    room.pot += amount;
    room.entries.push({
      id: crypto.randomUUID(),
      playerId,
      playerName: player.name,
      amount,
      note: note || '',
      timestamp: now,
    });
    room.updatedAt = now;
    store.set(id, room);
    return NextResponse.json({ room });
  }

  if (action === 'remove-contribution') {
    const { entryId } = body;
    const entry = room.entries.find(e => e.id === entryId);
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    const player = room.players.find(p => p.id === entry.playerId);
    if (player) player.contribution -= entry.amount;
    room.pot -= entry.amount;
    room.entries = room.entries.filter(e => e.id !== entryId);
    room.updatedAt = now;
    store.set(id, room);
    return NextResponse.json({ room });
  }

  if (action === 'award-winner') {
    if (!winnerId) return NextResponse.json({ error: 'Winner required' }, { status: 400 });
    const winner = room.players.find(p => p.id === winnerId);
    if (!winner) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    const awardAmount = amount || room.pot;
    room.winners.push({ playerId: winnerId, playerName: winner.name, amount: awardAmount, timestamp: now });
    room.pot = Math.max(0, room.pot - awardAmount);
    room.updatedAt = now;
    store.set(id, room);
    return NextResponse.json({ room });
  }

  if (action === 'reset-pot') {
    room.pot = 0;
    room.entries = [];
    room.players.forEach(p => p.contribution = 0);
    room.updatedAt = now;
    store.set(id, room);
    return NextResponse.json({ room });
  }

  if (action === 'close') {
    room.status = 'closed';
    room.updatedAt = now;
    store.set(id, room);
    return NextResponse.json({ room });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
