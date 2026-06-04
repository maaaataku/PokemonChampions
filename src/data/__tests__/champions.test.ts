// champions.test.ts — Champions差分層の検証。
// 空パッチでは素通り、差分注入で「表示値」と「ダメージ」の両方が変わり、リセットで戻る。
import {
  BUILTIN_PATCH, EXAMPLE_PATCH, setActivePatch, getMoveOverride,
  applyMoveOverride, applySpeciesOverride,
} from '../champions';
import { MOVES, rebuildMoves } from '../moves';
import { POKEDEX, rebuildPokedex } from '../pokedex';
import { calcDamage } from '../../engine/service';
import type { MonInput } from '../';

// 各テスト後に本体同梱（空）パッチへ戻し、データを再構築する。
afterEach(() => {
  setActivePatch(BUILTIN_PATCH);
  rebuildMoves();
  rebuildPokedex();
});

describe('本体同梱パッチ（空）＝ベース層を変更しない', () => {
  it('差分が無いので技/種族はエンジン値のまま', () => {
    expect(BUILTIN_PATCH.moves).toEqual({});
    expect(MOVES['じしん'].power).toBe(100);
    expect(MOVES['じしん'].champAdjusted).toBeUndefined();
    expect(POKEDEX['カバルドン'].base.def).toBe(118);
    expect(getMoveOverride('じしん')).toBeUndefined();
  });
});

describe('apply 関数（純粋）', () => {
  it('技差分は表示値とエンジンoverrideの両方を更新', () => {
    const out = applyMoveOverride(MOVES['じしん'], { basePower: 120, verified: false });
    expect(out.power).toBe(120);
    expect(out.champAdjusted).toBe(true);
    expect(out.engineOverride).toEqual({ basePower: 120 });
  });
  it('種族差分は表示種族値とエンジンoverridesの両方を更新', () => {
    const out = applySpeciesOverride(POKEDEX['カバルドン'], { baseStats: { def: 100 } });
    expect(out.base.def).toBe(100);
    expect(out.champAdjusted).toBe(true);
    expect(out.overrides).toEqual({ baseStats: { def: 100 } });
  });
  it('差分が undefined ならそのまま返す', () => {
    expect(applyMoveOverride(MOVES['じしん'], undefined)).toBe(MOVES['じしん']);
  });
});

describe('配信差し替え＋再構築でデータと計算に反映', () => {
  const atk: MonInput = { speciesJP: 'ガブリアス', natureJP: 'いじっぱり', pts: { atk: 32 } };
  const def: MonInput = { speciesJP: 'カバルドン', natureJP: 'わんぱく', pts: { hp: 32, def: 32 } };

  it('EXAMPLE_PATCH（威力120・防御100）で表示が変わりダメージが増える', () => {
    const baseDmg = calcDamage({ attacker: atk, defender: def, moveJP: 'じしん' }).max;

    setActivePatch(EXAMPLE_PATCH);
    rebuildMoves();
    rebuildPokedex();

    // 表示値の更新
    expect(MOVES['じしん'].power).toBe(120);
    expect(MOVES['じしん'].champAdjusted).toBe(true);
    expect(POKEDEX['カバルドン'].base.def).toBe(100);
    expect(POKEDEX['カバルドン'].champAdjusted).toBe(true);

    // ダメージへの反映（威力増＋防御減で必ず増える）
    const patched = calcDamage({ attacker: atk, defender: def, moveJP: 'じしん' }).max;
    expect(patched).toBeGreaterThan(baseDmg);
  });

  it('リセット（afterEach）後は素通りに戻る', () => {
    expect(MOVES['じしん'].power).toBe(100);
    expect(POKEDEX['カバルドン'].base.def).toBe(118);
  });
});
