import { describe, expect, it, beforeEach } from 'vitest';
import { registerSceneAnchor, readSceneAnchor, clearSceneAnchors } from './sceneAnchorRegistry';

describe('sceneAnchorRegistry', () => {
  beforeEach(() => clearSceneAnchors());

  it('returns null for unregistered selector', () => {
    expect(readSceneAnchor('WorldScene:player')).toBeNull();
  });

  it('returns coordinate for registered selector', () => {
    registerSceneAnchor('WorldScene:player', { x: 100, y: 200 });
    expect(readSceneAnchor('WorldScene:player')).toEqual({ x: 100, y: 200 });
  });

  it('updates when re-registered', () => {
    registerSceneAnchor('WorldScene:player', { x: 100, y: 200 });
    registerSceneAnchor('WorldScene:player', { x: 300, y: 400 });
    expect(readSceneAnchor('WorldScene:player')).toEqual({ x: 300, y: 400 });
  });

  it('clearSceneAnchors removes all', () => {
    registerSceneAnchor('A:1', { x: 1, y: 1 });
    registerSceneAnchor('B:2', { x: 2, y: 2 });
    clearSceneAnchors();
    expect(readSceneAnchor('A:1')).toBeNull();
    expect(readSceneAnchor('B:2')).toBeNull();
  });
});
