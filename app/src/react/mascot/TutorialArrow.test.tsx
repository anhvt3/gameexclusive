import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { TutorialArrow } from './TutorialArrow';
import { registerSceneAnchor, clearSceneAnchors } from './sceneAnchorRegistry';

describe('TutorialArrow', () => {
  beforeEach(() => {
    clearSceneAnchors();
    document.body.innerHTML = '';
  });

  it('renders nothing when DOM target not found', () => {
    render(<TutorialArrow target={{ type: 'dom', selector: 'no-such-element' }} />);
    expect(screen.queryByTestId('tutorial-arrow')).toBeNull();
  });

  it('positions over DOM target via getBoundingClientRect', () => {
    const target = document.createElement('button');
    target.setAttribute('data-testid', 'main-menu-quests');
    Object.defineProperty(target, 'getBoundingClientRect', {
      value: () => ({
        left: 100,
        top: 200,
        width: 80,
        height: 40,
        right: 180,
        bottom: 240,
        x: 100,
        y: 200,
        toJSON: () => ({}),
      }),
    });
    document.body.appendChild(target);

    render(<TutorialArrow target={{ type: 'dom', selector: 'main-menu-quests' }} />);
    const arrow = screen.getByTestId('tutorial-arrow');
    expect(arrow).toBeInTheDocument();
    // x = 100 + 80/2 - 16 = 124, y = 200 - 48 = 152
    expect(arrow.style.left).toBe('124px');
    expect(arrow.style.top).toBe('152px');
  });

  it('canvas target reads scene anchor + canvas rect offset', () => {
    registerSceneAnchor('WorldScene:enemy', { x: 50, y: 60 });
    const canvas = document.createElement('canvas');
    const container = document.createElement('div');
    container.setAttribute('data-testid', 'phaser-container');
    container.appendChild(canvas);
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({
        left: 200,
        top: 300,
        width: 1280,
        height: 720,
        right: 1480,
        bottom: 1020,
        x: 200,
        y: 300,
        toJSON: () => ({}),
      }),
    });
    document.body.appendChild(container);

    render(<TutorialArrow target={{ type: 'canvas', selector: 'WorldScene:enemy' }} />);
    const arrow = screen.getByTestId('tutorial-arrow');
    // x = 200 + 50 - 16 = 234, y = 300 + 60 - 48 = 312
    expect(arrow.style.left).toBe('234px');
    expect(arrow.style.top).toBe('312px');
  });

  it('renders nothing when canvas target unregistered', () => {
    render(<TutorialArrow target={{ type: 'canvas', selector: 'NoScene:none' }} />);
    expect(screen.queryByTestId('tutorial-arrow')).toBeNull();
  });
});
