import { NextRequest, NextResponse } from 'next/server';
import { store, STARTING_STACK } from '@/lib/store';

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

  const recordEntry = (entry: { playerId: string; playerName: string; action: 'contribute' | 'check' | 'call' | 'raise' | 'fold' | 'all-in'; amount?: number; note?: string }) => {
    room.entries.push({
      id: crypto.randomUUID(),
      playerId: entry.playerId,
      playerName: entry.playerName,
      action: entry.action,
      amount: entry.amount || 0,
      note: entry.note || '',
      timestamp: now,
    });
  };

  const persist = () => {
    room.updatedAt = now;
    store.set(id, room);
    return NextResponse.json({ room });
  };

  const requireActivePlayer = (playerIdToCheck?: string) => {
    if (!playerIdToCheck) return { error: 'Player required', status: 400 };
    const player = room.players.find(p => p.id === playerIdToCheck);
    if (!player) return { error: 'Player not found', status: 404 };
    if (player.stack <= 0) return { error: 'Out of chips. Wait until the pot is reset.', status: 400 };
    if (player.folded) return { error: 'Player has folded', status: 400 };
    return { player };
  };

  if (action === 'join') {
    if (!playerName) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const exists = room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
    if (exists) {
      // Return existing player
      return NextResponse.json({ room, playerId: exists.id });
    }
    const newPlayerId = crypto.randomUUID();
    room.players.push({ id: newPlayerId, name: playerName, contribution: 0, stack: STARTING_STACK, winnings: 0, folded: false, joinedAt: now });
    return persist();
  }

  if (action === 'contribute') {
    if (!playerId || !amount || amount <= 0) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
    const active = requireActivePlayer(playerId);
    if ('error' in active) return NextResponse.json({ error: active.error }, { status: active.status });
    const player = active.player;
    if (player.stack < amount) return NextResponse.json({ error: 'Not enough chips' }, { status: 400 });

    player.contribution += amount;
    player.stack -= amount;
    room.pot += amount;
    room.currentBet = Math.max(room.currentBet, player.contribution);
    recordEntry({ playerId, playerName: player.name, action: 'contribute', amount, note: note || '' });
    return persist();
  }

  if (action === 'check') {
    const active = requireActivePlayer(playerId);
    if ('error' in active) return NextResponse.json({ error: active.error }, { status: active.status });
    const player = active.player;
    if (player.contribution !== room.currentBet) return NextResponse.json({ error: 'Cannot check. Call or raise first.' }, { status: 400 });
    recordEntry({ playerId, playerName: player.name, action: 'check' });
    return persist();
  }

  if (action === 'call') {
    const active = requireActivePlayer(playerId);
    if ('error' in active) return NextResponse.json({ error: active.error }, { status: active.status });
    const player = active.player;

    const required = Math.max(0, room.currentBet - player.contribution);
    const callAmount = Math.min(required, player.stack);
    if (callAmount > 0) {
      player.contribution += callAmount;
      player.stack -= callAmount;
      room.pot += callAmount;
      recordEntry({ playerId, playerName: player.name, action: callAmount === required ? 'call' : 'all-in', amount: callAmount });
    } else {
      recordEntry({ playerId, playerName: player.name, action: 'call', amount: 0 });
    }
    return persist();
  }

  if (action === 'raise') {
    if (!playerId || !amount || amount <= 0) return NextResponse.json({ error: 'Raise amount required' }, { status: 400 });
    const active = requireActivePlayer(playerId);
    if ('error' in active) return NextResponse.json({ error: active.error }, { status: active.status });
    const player = active.player;

    const requiredToCall = Math.max(0, room.currentBet - player.contribution);
    const totalToCommit = requiredToCall + amount;
    const raiseAmount = Math.min(totalToCommit, player.stack);
    if (raiseAmount <= 0) return NextResponse.json({ error: 'Not enough chips' }, { status: 400 });

    player.contribution += raiseAmount;
    player.stack -= raiseAmount;
    room.pot += raiseAmount;
    room.currentBet = Math.max(room.currentBet, player.contribution);
    recordEntry({ playerId, playerName: player.name, action: player.stack === 0 ? 'all-in' : 'raise', amount: raiseAmount, note: note || '' });
    return persist();
  }

  if (action === 'fold') {
    const active = requireActivePlayer(playerId);
    if ('error' in active) return NextResponse.json({ error: active.error }, { status: active.status });
    const player = active.player;
    player.folded = true;
    recordEntry({ playerId, playerName: player.name, action: 'fold' });
    return persist();
  }

  if (action === 'all-in') {
    const active = requireActivePlayer(playerId);
    if ('error' in active) return NextResponse.json({ error: active.error }, { status: active.status });
    const player = active.player;

    const allInAmount = player.stack;
    if (allInAmount <= 0) return NextResponse.json({ error: 'No chips left' }, { status: 400 });

    player.contribution += allInAmount;
    player.stack = 0;
    room.pot += allInAmount;
    room.currentBet = Math.max(room.currentBet, player.contribution);
    recordEntry({ playerId, playerName: player.name, action: 'all-in', amount: allInAmount });
    return persist();
  }

  if (action === 'remove-contribution') {
    const { entryId } = body;
    const entry = room.entries.find(e => e.id === entryId);
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    const player = room.players.find(p => p.id === entry.playerId);
    if (player) {
      player.contribution -= entry.amount;
      player.stack += entry.amount;
    }
    room.pot -= entry.amount;
    room.entries = room.entries.filter(e => e.id !== entryId);
    room.currentBet = room.players.reduce((max, current) => current.folded ? max : Math.max(max, current.contribution), 0);
    return persist();
  }

  if (action === 'award-winner') {
    if (!winnerId) return NextResponse.json({ error: 'Winner required' }, { status: 400 });
    const winner = room.players.find(p => p.id === winnerId);
    if (!winner) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    const awardAmount = amount || room.pot;
    winner.winnings += awardAmount;
    room.winners.push({ playerId: winnerId, playerName: winner.name, amount: awardAmount, timestamp: now });
    room.pot = Math.max(0, room.pot - awardAmount);
    room.updatedAt = now;
    store.set(id, room);
    return NextResponse.json({ room });
  }

  if (action === 'reset-pot') {
    room.pot = 0;
    room.entries = [];
    room.currentBet = 0;
    room.players.forEach(p => {
      p.contribution = 0;
      p.stack = STARTING_STACK;
      p.winnings = 0;
      p.folded = false;
    });
    return persist();
  }

  if (action === 'close') {
    room.status = 'closed';
    return persist();
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
