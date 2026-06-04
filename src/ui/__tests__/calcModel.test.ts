// calcModel.test.ts — 盤面の対象決定・範囲・味方巻き込み・合算KO ロジックの回帰テスト。
import {
  initialBoard, targetSlots, computeResults, computeCombo, speedRows, allMovesDamage, type BoardState,
} from '../calcModel';
import { POKEDEX } from '../../data';

function board(over: Partial<BoardState> = {}): BoardState {
  return { ...initialBoard(), ...over };
}

describe('targetSlots（対象決定）', () => {
  it('単体技は focus のみ', () => {
    const s = board({ moveKey: 'げきりん' }); // single
    expect(targetSlots(s)).toEqual(['foeL']);
  });
  it('相手全体技は foeL/foeR', () => {
    const s = board({ moveKey: 'いわなだれ' }); // foes
    expect(targetSlots(s)).toEqual(['foeL', 'foeR']);
  });
  it('自分以外全体技は相手2体＋味方巻き込み', () => {
    const s = board({ moveKey: 'じしん', activeAtk: 'allyA' }); // all
    expect(targetSlots(s)).toEqual(['foeL', 'foeR', 'allyB']);
  });
});

describe('computeResults（味方巻き込み）', () => {
  it('じしんは味方スロットに isAlly=true で被害を出す', () => {
    const s = board({ moveKey: 'じしん', activeAtk: 'allyA' });
    const r = computeResults(s);
    expect(r.allyB).toBeDefined();
    expect(r.allyB.isAlly).toBe(true);
    expect(r.allyB.max).toBeGreaterThan(0); // イーユイは地面等倍で被弾
  });
});

describe('computeCombo（合算KO）', () => {
  it('2体の技を focus 相手へ合算し min/max を合計', () => {
    const s = board(); // allyA じしん + allyB ねっぷう → focus カバルドン
    const c = computeCombo(s);
    expect(c.parts.length).toBe(2);
    expect(c.min).toBe(c.parts[0].model.min + c.parts[1].model.min);
    expect(c.max).toBe(c.parts[0].model.max + c.parts[1].model.max);
    expect(['guaranteed', 'roll', 'survive']).toContain(c.verdict);
  });
  it('「打たない」を選ぶと寄与から外れる', () => {
    const s = board({ comboMv: { allyA: 'none', allyB: 'none' } });
    const c = computeCombo(s);
    expect(c.parts.length).toBe(0);
    expect(c.verdict).toBe('none');
  });
});

describe('allMovesDamage（全技ダメ計・F-7）', () => {
  it('攻撃役の全技を返し、最大ダメージ降順で並ぶ', () => {
    const s = board(); // activeAtk=allyA(ガブリアス), focusFoe=foeL(カバルドン)
    const rows = allMovesDamage(s, 'allyA', 'foeL');
    expect(rows.length).toBe(POKEDEX['ガブリアス'].moves.length);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].model.max).toBeGreaterThanOrEqual(rows[i].model.max);
    }
  });
  it('各行に確定数モデルが付く', () => {
    const rows = allMovesDamage(board(), 'allyA', 'foeL');
    expect(rows[0].model.ko.label).toBeTruthy();
    expect(rows[0].model.maxHP).toBeGreaterThan(0);
  });
});

describe('speedRows（素早さ早見・F-13）', () => {
  it('無振りデフォルト盤面は種族値順（ガブ>イーユイ>カバルドン>モロバレル）', () => {
    const rows = speedRows(board());
    expect(rows.map((r) => r.slot)).toEqual(['allyA', 'allyB', 'foeL', 'foeR']);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });
  it('トリックルームで行動順が反転', () => {
    const rows = speedRows(board({ trickRoom: true }));
    expect(rows.map((r) => r.slot)).toEqual(['foeR', 'foeL', 'allyB', 'allyA']);
  });
  it('味方おいかぜで味方の素早さが2倍になり順位が上がる', () => {
    const base = speedRows(board()).find((r) => r.slot === 'allyB')!;
    const tw = speedRows(board({ allyTailwind: true })).find((r) => r.slot === 'allyB')!;
    expect(tw.speed).toBe(base.speed * 2);
  });
});
