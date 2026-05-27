'use client';
import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import type { Room, Player } from '@/lib/store';

type Tab = 'pot' | 'players' | 'history' | 'winners';
type TableAction = 'check' | 'call' | 'raise' | 'fold' | 'all-in';

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('pot');
  const [actionLoading, setActionLoading] = useState(false);

  // Contribution form
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [tableActionAmount, setTableActionAmount] = useState('');

  // Winner
  const [winnerId, setWinnerId] = useState('');
  const [winAmount, setWinAmount] = useState('');

  // Copied state
  const [copied, setCopied] = useState(false);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${id}`);
      if (!res.ok) { setError('Room not found'); setLoading(false); return; }
      const data = await res.json();
      setRoom(data.room);
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const pid = sessionStorage.getItem(`player_${id}`) || '';
    setPlayerId(pid);
    fetchRoom();
    const interval = setInterval(fetchRoom, 3000);
    return () => clearInterval(interval);
  }, [id, fetchRoom]);

  useEffect(() => {
    if (room) {
      setSelectedPlayer(playerId || room.players[0]?.id || '');
    }
  }, [room, playerId, selectedPlayer]);

  const isHost = room?.hostId === playerId;

  async function patch(body: Record<string, unknown>) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/room/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoom(data.room);
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function contribute() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !playerId) return;
    const ok = await patch({ action: 'contribute', playerId, amount: amt, note });
    if (ok) { setAmount(''); setNote(''); }
  }

  async function awardWinner() {
    if (!winnerId) return;
    const amt = winAmount ? parseFloat(winAmount) : undefined;
    const ok = await patch({ action: 'award-winner', winnerId, amount: amt });
    if (ok) { setWinnerId(''); setWinAmount(''); }
  }

  async function tableAction(action: TableAction) {
    if (!playerId) return;
    const payload: Record<string, unknown> = { action, playerId };
    if (action === 'raise') {
      const amt = parseFloat(tableActionAmount);
      if (!amt || amt <= 0) return;
      payload.amount = amt;
    }
    const ok = await patch(payload);
    if (ok && action === 'raise') setTableActionAmount('');
  }

  function copyCode() {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareRoom() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `Join ${room?.name}`, text: `Room code: ${id}`, url });
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 1 }}>
      <div style={{ fontSize: '2rem', animation: 'spin-chip 1.5s linear infinite' }}>♠</div>
      <p style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', letterSpacing: '0.2em', fontSize: '0.8rem' }}>LOADING ROOM...</p>
    </div>
  );

  if (error && !room) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
      <div style={{ fontSize: '3rem' }}>♠</div>
      <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)' }}>Room Not Found</h2>
      <p style={{ color: 'var(--text-muted)' }}>This room may have expired or the code is incorrect.</p>
      <button className="btn-gold" onClick={() => router.push('/')}>Back to Lobby</button>
    </div>
  );

  if (!room) return null;

  const cur = room.currency;
  const fmtAmt = (n: number) => `${cur}${n.toLocaleString('en-IN')}`;
  const currentBet = room.currentBet || 0;
  const me = room.players.find(p => p.id === playerId) || null;
  const canAct = Boolean(me && me.stack > 0 && !me.folded);
  const leaderboardPlayers = [...room.players].sort((a, b) => {
    if (b.contribution !== a.contribution) return b.contribution - a.contribution;
    if (b.stack !== a.stack) return b.stack - a.stack;
    return a.name.localeCompare(b.name);
  });
  const topContribution = leaderboardPlayers[0]?.contribution || 0;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pot', label: 'Pot' },
    { key: 'players', label: 'Players' },
    { key: 'history', label: 'History' },
    { key: 'winners', label: 'Winners' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      {/* Top bar */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(10px)' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
          ← LOBBY
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Cinzel Decorative, serif', fontSize: '0.9rem' }} className="gold-text">{room.name}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: '0.1rem' }}>
            {room.gameType === 'teen-patti' ? '♠ TEEN PATTI' : '♣ POKER'} &nbsp;·&nbsp; {room.players.length} players
          </div>
        </div>
        <button onClick={copyCode} className="btn-ghost" style={{ padding: '0.4rem 0.9rem', fontSize: '0.7rem' }}>
          {copied ? '✓ Copied' : id}
        </button>
      </header>

      <div className="container" style={{ flex: 1, paddingTop: '1.5rem', paddingBottom: '2rem' }}>
        <div className="room-layout">
          <div className="room-main">
            {/* Pot display */}
            <div className="felt-table animate-deal-in" style={{ borderRadius: '100px', padding: '2rem 3rem', textAlign: 'center', margin: '0 auto 1.5rem', maxWidth: '340px' }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', letterSpacing: '0.3em', color: 'rgba(212,175,55,0.7)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Total Pot</div>
              <div className="gold-text" style={{ fontSize: 'clamp(2.2rem, 8vw, 3.5rem)', fontFamily: 'Cinzel Decorative, serif', lineHeight: 1 }}>
                {fmtAmt(room.pot)}
              </div>
              {room.winners.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'rgba(212,175,55,0.6)' }}>
                  {fmtAmt(room.winners.reduce((s, w) => s + w.amount, 0))} awarded
                </div>
              )}
            </div>

            {/* Share bar */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={shareRoom} className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.5rem 1.2rem' }}>
                📤 Share Room
              </button>
              {isHost && (
                <>
                  <button onClick={() => patch({ action: 'reset-pot' })} className="btn-danger" style={{ fontSize: '0.72rem' }}>
                    ↺ Reset Pot
                  </button>
                  <button onClick={async () => { if (confirm('Close this room?')) await patch({ action: 'close' }); }} className="btn-danger" style={{ fontSize: '0.72rem' }}>
                    ✕ Close
                  </button>
                </>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, padding: '0.7rem 0.5rem', border: 'none', cursor: 'pointer', fontFamily: 'Cinzel, serif',
                  fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.2s',
                  background: tab === t.key ? 'var(--felt)' : 'transparent',
                  color: tab === t.key ? 'var(--gold)' : 'var(--text-muted)',
                  borderRight: '1px solid var(--border)',
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab: POT */}
            {tab === 'pot' && (
              <div className="animate-deal-in">
                <div className="panel" style={{ padding: '1.8rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: 'var(--gold)', marginBottom: '1.2rem', letterSpacing: '0.1em' }}>Add to Pot</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>Your Player</label>
                      <div style={{ padding: '0.7rem 1rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', fontFamily: 'Cinzel, serif' }}>
                        {me?.name || 'Waiting for player session'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                        You can only act for your own seat.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>Amount ({cur || 'chips'})</label>
                        <input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} min="1" onKeyDown={e => e.key === 'Enter' && contribute()} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>Note (opt)</label>
                        <input type="text" placeholder="Blind, raise..." value={note} onChange={e => setNote(e.target.value)} maxLength={30} onKeyDown={e => e.key === 'Enter' && contribute()} />
                      </div>
                    </div>

                    {/* Quick amounts */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[10, 20, 50, 100, 200, 500].map(q => (
                        <button key={q} onClick={() => setAmount(String(q))} style={{
                          background: amount === String(q) ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${amount === String(q) ? 'var(--gold-dark)' : 'var(--border)'}`,
                          color: amount === String(q) ? 'var(--gold)' : 'var(--text-muted)',
                          padding: '0.4rem 0.7rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem',
                          fontFamily: 'Cinzel, serif', transition: 'all 0.2s',
                        }}>
                          {cur}{q}
                        </button>
                      ))}
                    </div>

                    {error && <p style={{ color: '#e74c3c', fontSize: '0.82rem' }}>{error}</p>}
                    <button className="btn-gold" onClick={contribute} disabled={actionLoading || !amount || !canAct}>
                      {actionLoading ? '...' : `Add ${amount ? fmtAmt(parseFloat(amount) || 0) : ''} to Pot`}
                    </button>
                  </div>
                </div>

                <div className="panel" style={{ padding: '1.8rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: 'var(--gold)', marginBottom: '1.2rem', letterSpacing: '0.1em' }}>Poker Actions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>Your Player</label>
                      <div style={{ padding: '0.7rem 1rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', fontFamily: 'Cinzel, serif' }}>
                        {me?.name || 'Waiting for player session'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                        Only your own player can act.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button className="btn-ghost" style={{ flex: '1 1 120px' }} onClick={() => tableAction('check')} disabled={actionLoading || !canAct}>
                        Check
                      </button>
                      <button className="btn-ghost" style={{ flex: '1 1 120px' }} onClick={() => tableAction('call')} disabled={actionLoading || !canAct}>
                        Call
                      </button>
                      <button className="btn-danger" style={{ flex: '1 1 120px' }} onClick={() => tableAction('fold')} disabled={actionLoading || !canAct}>
                        Fold
                      </button>
                      <button className="btn-gold" style={{ flex: '1 1 120px' }} onClick={() => tableAction('all-in')} disabled={actionLoading || !canAct}>
                        All In
                      </button>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>Raise Amount</label>
                      <input type="number" placeholder="Amount to raise by" value={tableActionAmount} onChange={e => setTableActionAmount(e.target.value)} min="1" onKeyDown={e => e.key === 'Enter' && tableAction('raise')} />
                    </div>
                    <button className="btn-gold" onClick={() => tableAction('raise')} disabled={actionLoading || !canAct || !tableActionAmount}>
                      Raise
                    </button>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      Current bet: {fmtAmt(currentBet)}
                      {me && <><br />Your chips: {fmtAmt(me.stack)} {me.stack <= 0 ? '(out until reset)' : ''}</>}
                    </div>
                  </div>
                </div>

                {/* Award winner */}
                {(isHost || room.players.length > 0) && (
                  <div className="panel" style={{ padding: '1.8rem' }}>
                    <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: 'var(--gold)', marginBottom: '1.2rem', letterSpacing: '0.1em' }}>🏆 Award Winner</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <select value={winnerId} onChange={e => setWinnerId(e.target.value)}>
                        <option value="">Select winner...</option>
                        {room.players.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>
                          Amount (leave blank to award full pot: {fmtAmt(room.pot)})
                        </label>
                        <input type="number" placeholder={`Full pot: ${fmtAmt(room.pot)}`} value={winAmount} onChange={e => setWinAmount(e.target.value)} min="1" />
                      </div>
                      <button className="btn-gold" onClick={awardWinner} disabled={actionLoading || !winnerId} style={{ background: 'linear-gradient(135deg, #7B3F00, #C47D0A, #F5D06E, #C47D0A)' }}>
                        🏆 Award {winAmount ? fmtAmt(parseFloat(winAmount)) : 'Full Pot'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: PLAYERS */}
            {tab === 'players' && (
              <div className="animate-deal-in">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {room.players.map((p: Player, i: number) => {
                    const suits = ['♠', '♥', '♦', '♣'];
                    const colors = ['var(--text)', '#C0392B', '#C0392B', 'var(--text)'];
                    const si = i % 4;
                    const pct = room.pot > 0 ? Math.round((p.contribution / room.pot) * 100) : 0;
                    return (
                      <div key={p.id} className="panel" style={{ padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', color: colors[si], minWidth: '2rem', textAlign: 'center' }}>{suits[si]}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.95rem' }}>{p.name}</span>
                            {p.id === room.hostId && <span style={{ fontSize: '0.65rem', color: 'var(--gold)', fontFamily: 'Cinzel, serif', letterSpacing: '0.08em' }}>HOST</span>}
                            {p.id === playerId && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>(you)</span>}
                            {p.folded && <span style={{ fontSize: '0.65rem', color: '#e74c3c', fontFamily: 'Cinzel, serif', letterSpacing: '0.08em' }}>FOLDED</span>}
                            {p.stack <= 0 && <span style={{ fontSize: '0.65rem', color: '#e74c3c', fontFamily: 'Cinzel, serif', letterSpacing: '0.08em' }}>OUT</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '120px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gold)', borderRadius: '2px', transition: 'width 0.5s' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '7rem', textAlign: 'right' }}>{fmtAmt(p.contribution)} / {fmtAmt(p.stack)} / {fmtAmt(p.stack + p.winnings)}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{pct}%</div>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{p.stack <= 0 ? 'locked' : 'active'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab: HISTORY */}
            {tab === 'history' && (
              <div className="animate-deal-in">
                {room.entries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
                    <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem' }}>No entries yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[...room.entries].reverse().map(e => (
                      <div key={e.id} className="panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem' }}>{e.playerName}</span>
                          {e.note && <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: '0.5rem' }}>· {e.note}</span>}
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {new Date(e.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', fontSize: '0.95rem' }}>+{fmtAmt(e.amount)}</span>
                          {isHost && (
                            <button onClick={() => patch({ action: 'remove-contribution', entryId: e.id })} className="btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem' }}>✕</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: WINNERS */}
            {tab === 'winners' && (
              <div className="animate-deal-in">
                {room.winners.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🏆</div>
                    <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem' }}>No winners awarded yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[...room.winners].reverse().map((w, i) => (
                      <div key={i} className="panel felt-table" style={{ padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontFamily: 'Cinzel Decorative, serif', fontSize: '0.95rem' }} className="gold-text">🏆 {w.playerName}</div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(212,175,55,0.5)', marginTop: '0.2rem' }}>
                            {new Date(w.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="gold-text" style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem' }}>
                          {fmtAmt(w.amount)}
                        </div>
                      </div>
                    ))}
                    <div className="panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Awarded</span>
                      <span style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)' }}>{fmtAmt(room.winners.reduce((s, w) => s + w.amount, 0))}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="room-sidebar">
            <div className="panel animate-deal-in" style={{ padding: '1.3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>Side Leaderboard</h3>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Contribution and balance</div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Current bet<br />{fmtAmt(currentBet)}
                </div>
              </div>

              <div className="leaderboard-list">
                {leaderboardPlayers.map((player, index) => {
                  const share = topContribution > 0 ? Math.round((player.contribution / topContribution) * 100) : 0;
                  return (
                    <div key={player.id} className="leaderboard-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'baseline' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem' }}>{index + 1}. {player.name}</span>
                            {player.id === playerId && <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>(you)</span>}
                            {player.folded && <span style={{ fontSize: '0.62rem', color: '#e74c3c', fontFamily: 'Cinzel, serif' }}>FOLDED</span>}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Contributed {fmtAmt(player.contribution)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '4.8rem' }}>
                          <div style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', fontSize: '0.88rem' }}>{fmtAmt(player.stack + player.winnings)}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>final score</div>
                        </div>
                      </div>
                      <div style={{ marginTop: '0.75rem' }}>
                        <div className="leaderboard-bar">
                          <div className="leaderboard-fill" style={{ width: `${share}%` }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.45rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          <span>{share}% of top contribution</span>
                          <span>{fmtAmt(player.contribution + player.stack)} total stack</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Closed banner */}
      {room.status === 'closed' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(139,26,26,0.95)', padding: '1rem', textAlign: 'center', fontFamily: 'Cinzel, serif', fontSize: '0.85rem', letterSpacing: '0.1em', backdropFilter: 'blur(10px)', zIndex: 100 }}>
          🃏 This room has been closed by the host
        </div>
      )}
    </div>
  );
}
