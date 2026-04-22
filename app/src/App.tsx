import { CombatPreview } from './react/preview/CombatPreview';
import { AppRouter } from './react/shell/AppRouter';
import './App.css';

function isPreview(type: string): boolean {
  return new URLSearchParams(window.location.search).get('preview') === type;
}

function App() {
  // Dev-only preview fallback: ?preview=combat&monster=1 bypasses the router.
  // Kept for quick iteration on combat assets without going through menu.
  if (isPreview('combat')) return <CombatPreview />;

  return <AppRouter />;
}

export default App;
