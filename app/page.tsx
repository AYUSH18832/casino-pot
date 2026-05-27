'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [roomName, setRoomName] = useState('');
  const [hostName, setHostName] = useState('');
  const [gameType, setGameType] = useState<'poker' | 'teen-patti'>('poker');
  const [currency, setCurrency] = useState('₹');

  const [roomCode, setRoomCode] = useState('');
  const [joinName, setJoinName] = useState('');

  async function createRoom() {
    if (!roomName.trim() || !hostName.trim()) { setError('Fill all fields'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName.trim(), gameType, hostName: hostName.trim(), currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem('player_' + data.room.id, data.playerId);
      router.push('/room/' + data.room.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create room');
    } finally { setLoading(false); }
  }

  async function joinRoom() {
    const code = roomCode.trim().toUpperCase();
    if (!code || !joinName.trim()) { setError('Fill all fields'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/room/' + code, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', playerName: joinName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem('player_' + code, data.playerId);
      router.push('/room/' + code);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Room not found');
    } finally { setLoading(false); }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      <header style={{ padding: '2.5rem 0 1rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '0.5rem', fontSize: '1.8rem' }}>
          <span className="suit suit-red animate-float" style={{ animationDelay: '0s' }}>♦</span>
          <span className="suit suit-black animate-float" style={{ animationDelay: '0.4s' }}>♠</span>
          <span className="suit suit-red animate-float" style={{ animationDelay: '0.8s' }}>♥</span>
          <span className="suit suit-black animate-float" style={{ animationDelay: '1.2s' }}>♣</span>
        </div>
        <h1 className="gold-text animate-flicker" style={{ fontSize: 'clamp(2.2rem, 6vw, 3.8rem)', letterSpacing: '0.04em', lineHeight: 1.1 }}>
          Royal Pot
        </h1>
        <p style={{ fontFamily: 'Cinzel, serif', color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.3em', marginTop: '0.5rem', textTransform: 'uppercase' }}>
          Virtual Casino Pot Tracker
        </p>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', maxWidth: '500px', margin: '0 auto 2.5rem', padding: '0 2rem', width: '100%' }}>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--gold-dark))' }} />
        <span style={{ color: 'var(--gold)', fontSize: '1rem' }}>✦</span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--gold-dark))' }} />
      </div>

      <div className="container" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {mode === 'home' && (
          <div className="animate-deal-in" style={{ width: '100%', maxWidth: '460px' }}>
            <div className="panel" style={{ padding: '2.5rem', marginBottom: '1.2rem' }}>
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.8, fontSize: '1.05rem' }}>
                Create a room for your game, share the code with friends, and track the pot in real time.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button className="btn-gold" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }} onClick={() => { setMode('create'); setError(''); }}>
                  ✦ &nbsp;Create a Room
                </button>
                <button className="btn-ghost" style={{ width: '100%', padding: '0.9rem' }} onClick={() => { setMode('join'); setError(''); }}>
                  Join a Room
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[{ name: 'Poker', emoji: '🂡', desc: "Texas Hold'em & more" }, { name: 'Teen Patti', emoji: '🃏', desc: 'The Indian classic' }].map(g => (
                <div key={g.name} className="panel" style={{ flex: 1, padding: '1.2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>{g.emoji}</div>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.78rem', color: 'var(--gold)', marginBottom: '0.3rem' }}>{g.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{g.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === 'create' && (
          <div className="animate-deal-in" style={{ width: '100%', maxWidth: '460px' }}>
            <div className="panel" style={{ padding: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => { setMode('home'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1 }}>←</button>
                <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--gold)', letterSpacing: '0.05em' }}>Create a Room</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>Your Name</label>
                  <input type="text" placeholder="Enter your name" value={hostName} onChange={e => setHostName(e.target.value)} maxLength={20} onKeyDown={e => e.key === 'Enter' && createRoom()} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>Room Name</label>
                  <input type="text" placeholder="Friday Night Game" value={roomName} onChange={e => setRoomName(e.target.value)} maxLength={30} onKeyDown={e => e.key === 'Enter' && createRoom()} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>Game</label>
                  <select value={gameType} onChange={e => setGameType(e.target.value as 'poker' | 'teen-patti')}>
                    <option value="poker">Poker</option>
                    <option value="teen-patti">Teen Patti</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="₹">₹ Rupee</option>
                    <option value="$">$ Dollar</option>
                    <option value="€">€ Euro</option>
                    <option value="£">£ Pound</option>
                    <option value="">chips</option>
                  </select>
                </div>
                {error && <p style={{ color: '#e74c3c', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}
                <button className="btn-gold" style={{ width: '100%', padding: '1rem', marginTop: '0.3rem' }} onClick={createRoom} disabled={loading}>
                  {loading ? 'Creating...' : '✦ Create Room'}
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="animate-deal-in" style={{ width: '100%', maxWidth: '460px' }}>
            <div className="panel" style={{ padding: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => { setMode('home'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1 }}>←</button>
                <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--gold)', letterSpacing: '0.05em' }}>Join a Room</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>Your Name</label>
                  <input type="text" placeholder="Enter your name" value={joinName} onChange={e => setJoinName(e.target.value)} maxLength={20} onKeyDown={e => e.key === 'Enter' && joinRoom()} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>Room Code</label>
                  <input
                    type="text" placeholder="XXXXXX" value={roomCode}
                    onChange={e => setRoomCode(e.target.value.toUpperCase())} maxLength={6}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.3em', fontFamily: 'Cinzel, serif', fontSize: '1.3rem', textAlign: 'center' }}
                    onKeyDown={e => e.key === 'Enter' && joinRoom()}
                  />
                </div>
                {error && <p style={{ color: '#e74c3c', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}
                <button className="btn-gold" style={{ width: '100%', padding: '1rem', marginTop: '0.3rem' }} onClick={joinRoom} disabled={loading}>
                  {loading ? 'Joining...' : '✦ Join Room'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.12em' }}>
        <span className="suit suit-red">♦</span>&nbsp; ROYAL POT — PLAY RESPONSIBLY &nbsp;<span className="suit suit-black">♠</span>
      </footer>
    </main>
  );
}
