// championsAdapter.test.ts
// handoff_to_claude_code.md §6 の代表値と、能力ポイント制の厳密一致を assert する。
// これが green な限り「エンジン採用＝Champions実数値が全域で一致」という土台が保たれる。

import { Pokemon } from '@smogon/calc';
import {
  gen,
  ptsToEV,
  champPokemon,
  champCalc,
  type ChampMon,
} from '../championsAdapter';
import { championsStat } from '../stats';

describe('ptsToEV（能力ポイント→EV変換）', () => {
  it('1pt = 8EV、0/中間/上限クランプ', () => {
    expect(ptsToEV(0)).toBe(0);
    expect(ptsToEV(16)).toBe(128);
    expect(ptsToEV(31)).toBe(248);
    expect(ptsToEV(32)).toBe(252); // 256→252にクランプ
  });
  it('負値は0にクランプ', () => {
    expect(ptsToEV(-5)).toBe(0);
  });
});

describe('能力ポイント制の厳密一致（エンジン rawStats == Champions式）', () => {
  // 種族値の異なる複数種で、全能力P(0..32)を総当たりして一致を確認する。
  const samples: Array<{ species: string; base: Record<string, number> }> = [
    { species: 'Garchomp', base: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 } },
    { species: 'Hippowdon', base: { hp: 108, atk: 112, def: 118, spa: 68, spd: 72, spe: 47 } },
    { species: 'Flutter Mane', base: { hp: 55, atk: 55, def: 55, spa: 135, spd: 135, spe: 135 } },
    { species: 'Ting-Lu', base: { hp: 155, atk: 110, def: 125, spa: 55, spd: 80, spe: 45 } },
  ];
  const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

  it('無補正で各能力 0..32pt を全域一致', () => {
    for (const s of samples) {
      for (const stat of STATS) {
        for (let pts = 0; pts <= 32; pts++) {
          const mon = champPokemon({
            species: s.species,
            nature: 'Hardy',
            pts: { [stat]: pts },
          } as ChampMon);
          const expected = championsStat(s.base[stat], pts, 1.0, stat === 'hp');
          expect(mon.rawStats[stat]).toBe(expected);
        }
      }
    }
  });

  it('性格補正(↑1.1/↓0.9)も一致（いじっぱり=atk↑spa↓）', () => {
    const mon = champPokemon({ species: 'Garchomp', nature: 'Adamant', pts: { atk: 32, spa: 0 } });
    expect(mon.rawStats.atk).toBe(championsStat(130, 32, 1.1, false));
    expect(mon.rawStats.spa).toBe(championsStat(80, 0, 0.9, false));
  });

  it('合計66能力P(=520EV相当)でも各能力は独立計算で510クランプされない', () => {
    // 32/32/2 = 66pt を hp/def/spd に割り振り、各値が Champions 式と一致すること。
    const mon = champPokemon({
      species: 'Ting-Lu',
      nature: 'Hardy',
      pts: { hp: 32, def: 32, spd: 2 },
    });
    expect(mon.rawStats.hp).toBe(championsStat(155, 32, 1.0, true));
    expect(mon.rawStats.def).toBe(championsStat(125, 32, 1.0, false));
    expect(mon.rawStats.spd).toBe(championsStat(80, 2, 1.0, false));
  });
});

describe('§6 代表値: ガブリアス じしん vs カバルドン', () => {
  const attacker: ChampMon = { species: 'Garchomp', nature: 'Adamant', pts: { atk: 32 } };
  const defender: ChampMon = { species: 'Hippowdon', nature: 'Impish', pts: { hp: 32, def: 32 } };

  it('シングルで 61–73 / 約28.3–33.9% / 確定3発相当', () => {
    const r = champCalc(attacker, defender, 'Earthquake');
    const dmg = r.damage as number[];
    expect(dmg[0]).toBe(61);
    expect(dmg[15]).toBe(73);
    const maxHP = champPokemon(defender).maxHP();
    expect(maxHP).toBe(215);
    // §6 は「約28.3–33.9%」。丸め前の実値（28.4 / 34.0 付近）を ±0.5 で許容。
    expect((dmg[0] / maxHP) * 100).toBeCloseTo(28.3, 0);
    expect((dmg[15] / maxHP) * 100).toBeCloseTo(33.9, 0);
  });

  it('ダブル範囲(×0.75)で 46–55 に低下', () => {
    const r = champCalc(attacker, defender, 'Earthquake', { doubles: true });
    const dmg = r.damage as number[];
    expect(dmg[0]).toBe(46);
    expect(dmg[15]).toBe(55);
  });

  it('テラスタル『じめん』指定で Tera STAB によりダメージ増加', () => {
    const base = champCalc(attacker, defender, 'Earthquake');
    const tera = champCalc(
      { ...attacker, teraType: 'Ground' },
      defender,
      'Earthquake',
    );
    const baseMax = (base.damage as number[])[15];
    const teraMax = (tera.damage as number[])[15];
    expect(teraMax).toBeGreaterThan(baseMax);
  });
});

describe('エンジン整合の基本', () => {
  it('gen は Gen9', () => {
    expect(gen.num).toBe(9);
  });
  it('champPokemon は Pokemon インスタンスを返し Lv50・IV31', () => {
    const p = champPokemon({ species: 'Garchomp' });
    expect(p).toBeInstanceOf(Pokemon);
    expect(p.level).toBe(50);
    expect(p.ivs.atk).toBe(31);
  });
});
