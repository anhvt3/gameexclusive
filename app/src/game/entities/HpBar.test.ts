import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { HpBar, HP_BAR_WIDTH, HP_COLOR_HIGH, HP_COLOR_MID, HP_COLOR_LOW } from './HpBar';

function makeMockRectangle() {
  return {
    setOrigin: vi.fn().mockReturnThis(),
    setStrokeStyle: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    width: HP_BAR_WIDTH,
    fillColor: 0,
  };
}

function makeMockText() {
  return {
    setOrigin: vi.fn().mockReturnThis(),
    setText: vi.fn(),
    destroy: vi.fn(),
  };
}

function makeMockScene() {
  const bg = makeMockRectangle();
  const fill = makeMockRectangle();
  const label = makeMockText();
  const rectangleFn = vi
    .fn()
    .mockImplementationOnce(() => bg)
    .mockImplementationOnce(() => fill);
  const textFn = vi.fn().mockReturnValue(label);
  return {
    add: { rectangle: rectangleFn, text: textFn },
    _bg: bg,
    _fill: fill,
    _label: label,
  };
}

describe('HpBar', () => {
  let scene: ReturnType<typeof makeMockScene>;

  beforeEach(() => {
    scene = makeMockScene();
  });

  it('constructor creates bg + fill rectangles + label text', () => {
    new HpBar(scene as any, 100, 200, 50, 100);
    expect(scene.add.rectangle).toHaveBeenCalledTimes(2);
    expect(scene.add.text).toHaveBeenCalledTimes(1);
  });

  it('initial fill width proportional to hp ratio', () => {
    new HpBar(scene as any, 0, 0, 50, 100);
    expect(scene._fill.width).toBe((HP_BAR_WIDTH - 4) * 0.5);
  });

  it('label shows "current / max"', () => {
    new HpBar(scene as any, 0, 0, 42, 100);
    expect(scene._label.setText).toHaveBeenLastCalledWith('42 / 100');
  });

  it('setHp updates fill width reactively', () => {
    const bar = new HpBar(scene as any, 0, 0, 100, 100);
    bar.setHp(25, 100);
    expect(scene._fill.width).toBe((HP_BAR_WIDTH - 4) * 0.25);
  });

  it('setHp clamps to [0, max]', () => {
    const bar = new HpBar(scene as any, 0, 0, 50, 100);
    bar.setHp(-10);
    expect(bar.getCurrent()).toBe(0);
    bar.setHp(9999);
    expect(bar.getCurrent()).toBe(100);
  });

  it('color green when ratio > 0.5', () => {
    new HpBar(scene as any, 0, 0, 80, 100);
    expect(scene._fill.fillColor).toBe(HP_COLOR_HIGH);
  });

  it('color yellow when 0.2 < ratio <= 0.5', () => {
    const bar = new HpBar(scene as any, 0, 0, 100, 100);
    bar.setHp(40, 100);
    expect(scene._fill.fillColor).toBe(HP_COLOR_MID);
  });

  it('color red when ratio <= 0.2', () => {
    const bar = new HpBar(scene as any, 0, 0, 100, 100);
    bar.setHp(10, 100);
    expect(scene._fill.fillColor).toBe(HP_COLOR_LOW);
  });

  it('destroy() destroys bg + fill + label', () => {
    const bar = new HpBar(scene as any, 0, 0, 50, 100);
    bar.destroy();
    expect(scene._bg.destroy).toHaveBeenCalled();
    expect(scene._fill.destroy).toHaveBeenCalled();
    expect(scene._label.destroy).toHaveBeenCalled();
  });
});
