// tuning.test.ts — 耐久逆算・素早さ実数値の検証。
import { findSurvival, championsSpeed, orderBySpeed } from '../tuning';
import { championsStat } from '../stats';
import type { CalcParams } from '../service';
import type { MonInput } from '../../data';

const garchomp: MonInput = { speciesJP: 'ガブリアス', natureJP: 'いじっぱり', pts: { atk: 32 } };

describe('findSurvival（確定耐え最小投資・F-12）', () => {
  it('HP/防御 無振りカバルドンへ ガブ じしん：最小投資案を返す', () => {
    const base: CalcParams = {
      attacker: garchomp,
      defender: { speciesJP: 'カバルドン', natureJP: 'わんぱく', pts: {} },
      moveJP: 'じしん',
    };
    const r = findSurvival(base);
    // じしんは中威力・耐久カバルドン。無振りでも1発では落ちない想定（確定耐え可）。
    expect(r.byHP).not.toBeNull();
    expect(r.byDef).not.toBeNull();
    // 提示された投資で実際に max < maxHP（確定耐え）になっていること。
    expect(r.byHP!.max).toBeLessThan(r.byHP!.maxHP);
    expect(r.byDef!.max).toBeLessThan(r.byDef!.maxHP);
    // pts は 0..32 の範囲。
    expect(r.byHP!.pts).toBeGreaterThanOrEqual(0);
    expect(r.byHP!.pts).toBeLessThanOrEqual(32);
  });

  it('最小性：1つ下の投資では耐えられない（byHP）', () => {
    const base: CalcParams = {
      attacker: { speciesJP: 'ハバタクカミ', natureJP: 'おくびょう', pts: { spa: 32 }, item: undefined },
      defender: { speciesJP: 'カバルドン', natureJP: 'なまいき', pts: {} }, // とくぼう寄り
      moveJP: 'ムーンフォース',
    };
    const r = findSurvival(base);
    if (r.byHP && r.byHP.pts > 0) {
      // 提示 pts-1 では確定耐えにならない（=最小である）ことを確認。
      const oneLess = findSurvivalAt(base, r.byHP.pts - 1, 'hp');
      expect(oneLess).toBe(false);
    }
    expect(true).toBe(true);
  });
});

// テスト補助：指定 hp/def 投資で確定耐えするか。
import { calcDamage } from '../service';
import { MOVES } from '../../data';
function findSurvivalAt(base: CalcParams, pts: number, which: 'hp' | 'def'): boolean {
  const isPhys = MOVES[base.moveJP].cat === 'phys';
  const defStat = isPhys ? 'def' : 'spd';
  const cur = base.defender.pts ?? {};
  const ptsObj = which === 'hp' ? { ...cur, hp: pts } : { ...cur, [defStat]: pts };
  const d = calcDamage({ ...base, defender: { ...base.defender, pts: ptsObj } });
  return d.max < d.maxHP;
}

describe('championsSpeed（素早さ実数値・F-13）', () => {
  it('ハバタクカミ spe135 無振り無補正 = championsStat と一致', () => {
    const expected = championsStat(135, 0, 1.0, false);
    expect(championsSpeed(135, 0, 1.0, 0)).toBe(expected);
  });
  it('スカーフ×1.5 / 追い風×2 / まひ×0.5 を順に floor 適用', () => {
    const s = championsStat(135, 0, 1.0, false); // 155
    expect(championsSpeed(135, 0, 1.0, 0, { scarf: true })).toBe(Math.floor(s * 1.5));
    expect(championsSpeed(135, 0, 1.0, 0, { tailwind: true })).toBe(Math.floor(s * 2));
    expect(championsSpeed(135, 0, 1.0, 0, { paralysis: true })).toBe(Math.floor(s * 0.5));
  });
  it('最速(P32・↑)は無振りより速い', () => {
    const fast = championsSpeed(135, 32, 1.1, 0);
    const slow = championsSpeed(135, 0, 1.0, 0);
    expect(fast).toBeGreaterThan(slow);
  });
});

describe('orderBySpeed（行動順・トリル）', () => {
  const entries = [
    { id: 'a', speed: 150 },
    { id: 'b', speed: 200 },
    { id: 'c', speed: 100 },
  ];
  it('通常は速い順', () => {
    expect(orderBySpeed(entries).map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });
  it('トリックルームは遅い順', () => {
    expect(orderBySpeed(entries, true).map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });
});
