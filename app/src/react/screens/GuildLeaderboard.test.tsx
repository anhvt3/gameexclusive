import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { GuildLeaderboard } from './GuildLeaderboard';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div data-testid="menu">MENU</div>} />
        <Route path="/guild" element={<GuildLeaderboard />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('GuildLeaderboard — WF static single-player', () => {
  it('renders 30 roster rows', () => {
    renderAt('/guild');
    const list = screen.getByTestId('leaderboard-rows');
    expect(within(list).getAllByRole('listitem')).toHaveLength(30);
  });

  it('rows are sorted by weekly_exp descending', () => {
    renderAt('/guild');
    const rows = within(screen.getByTestId('leaderboard-rows')).getAllByRole('listitem');
    const expValues = rows.map((row) => {
      const match = row.textContent!.match(/([\d.,]+)\s*EXP/);
      return parseInt(match![1]!.replace(/[.,]/g, ''), 10);
    });
    for (let i = 1; i < expValues.length; i++) {
      expect(expValues[i - 1]).toBeGreaterThanOrEqual(expValues[i]!);
    }
  });

  it('current student row is highlighted via aria-current="true"', () => {
    renderAt('/guild');
    const me = document.querySelector('[aria-current="true"]') as HTMLElement | null;
    expect(me).not.toBeNull();
    expect(me!.textContent).toContain('(bạn)');
  });

  it('exactly one row is marked as current student', () => {
    renderAt('/guild');
    expect(document.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
  });

  it('renders class name + week header', () => {
    renderAt('/guild');
    expect(screen.getByRole('heading', { name: /Bảng xếp hạng lớp/i })).toBeInTheDocument();
    expect(screen.getByText(/5A1 - Nguyễn Du/)).toBeInTheDocument();
  });

  it('"Về menu" button navigates to /', () => {
    renderAt('/guild');
    fireEvent.click(screen.getByRole('button', { name: /Về menu/i }));
    expect(screen.getByTestId('menu')).toBeInTheDocument();
  });

  it('top 3 rank badges use distinctive styling class', () => {
    renderAt('/guild');
    const rows = within(screen.getByTestId('leaderboard-rows')).getAllByRole('listitem');
    // First 3 badges should have the highlighted bg class; 4+ should not.
    const badge = (row: HTMLElement) => row.querySelector('span')!;
    expect(badge(rows[0]!).className).toContain('bg-amber-400');
    expect(badge(rows[1]!).className).toContain('bg-amber-400');
    expect(badge(rows[2]!).className).toContain('bg-amber-400');
    expect(badge(rows[3]!).className).toContain('bg-amber-100');
  });
});
