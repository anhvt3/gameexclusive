import { useState } from 'react';
import { CombatPreview } from './react/preview/CombatPreview';
import './App.css';

function isPreview(type: string): boolean {
  return new URLSearchParams(window.location.search).get('preview') === type;
}

function App() {
  const [count, setCount] = useState(0);

  // Dev-only preview tool (remove when Step 21 Router lands)
  if (isPreview('combat')) return <CombatPreview />;

  return (
    <div
      style={{
        padding: '2rem',
        fontFamily: 'sans-serif',
        color: '#eee',
        background: '#1a1a2e',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎮 Game_SS3_exclusive</h1>
      <p>Dev preview links:</p>
      <ul style={{ listStyle: 'disc', paddingLeft: '2rem', marginBottom: '1rem' }}>
        <li>
          <a style={{ color: '#FFD700' }} href="?preview=combat&monster=1">
            Combat vs Embershed (🔥 Fire)
          </a>
        </li>
        <li>
          <a style={{ color: '#FFD700' }} href="?preview=combat&monster=4">
            Combat vs Tidus (💧 Water)
          </a>
        </li>
        <li>
          <a style={{ color: '#FFD700' }} href="?preview=combat&monster=7">
            Combat vs Applepot (🌿 Plant)
          </a>
        </li>
        <li>
          <a style={{ color: '#FFD700' }} href="?preview=combat&monster=10">
            Combat vs Frostfang (❄️ Ice)
          </a>
        </li>
        <li>
          <a style={{ color: '#FFD700' }} href="?preview=combat&monster=13">
            Combat vs Voltee (⚡ Storm)
          </a>
        </li>
      </ul>
      <button
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          background: '#D4691E',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
        onClick={() => setCount((c) => c + 1)}
      >
        Render ticks: {count}
      </button>
    </div>
  );
}

export default App;
