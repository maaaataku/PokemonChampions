// roster.test.ts — 拡充ロスター/技プールがエンジンで全件解決し、整合していることを検証。
import { POKEDEX } from '../pokedex';
import { MOVES } from '../moves';
import { SPECIES_ROWS, MOVE_ROWS } from '../roster';
import { champCalc } from '../../engine/championsAdapter';

describe('技プール（エンジン解決）', () => {
  it('全技が解決し、タイプ・分類・対象が埋まる（無効名は構築時に例外）', () => {
    expect(Object.keys(MOVES).length).toBe(MOVE_ROWS.length);
    for (const m of Object.values(MOVES)) {
      // 重量依存技(ヘビーボンバー等)は単体構築時 bp=0。実計算ではエンジンが算出する。
      expect(m.power).toBeGreaterThanOrEqual(0);
      expect(m.type).toBeTruthy();
      expect(['phys', 'spec']).toContain(m.cat);
      expect(['single', 'foes', 'all']).toContain(m.target);
    }
  });
  it('範囲技の対象種別が正しい（じしん=all / いわなだれ=foes / げきりん=single）', () => {
    expect(MOVES['じしん'].target).toBe('all');
    expect(MOVES['いわなだれ'].target).toBe('foes');
    expect(MOVES['げきりん'].target).toBe('single');
  });
  it('連続技のヒット数が解決（すいりゅうれんだ=3）', () => {
    expect(MOVES['すいりゅうれんだ'].hits).toBe(3);
  });
});

describe('ロスター（エンジン解決）', () => {
  it('全種族が解決し、種族値合計が妥当', () => {
    expect(Object.keys(POKEDEX).length).toBe(SPECIES_ROWS.length);
    for (const p of Object.values(POKEDEX)) {
      const total = p.base.hp + p.base.atk + p.base.def + p.base.spa + p.base.spd + p.base.spe;
      expect(total).toBeGreaterThan(150);
      expect(p.types.length).toBeGreaterThanOrEqual(1);
    }
  });
  it('各種族の技構成は技プールに存在する', () => {
    for (const s of SPECIES_ROWS) {
      for (const mv of s.moves) {
        expect(MOVES[mv]).toBeDefined();
      }
    }
  });
  it('拡充された全種族で実際に計算が走る（攻撃=各先頭技 vs カバルドン）', () => {
    for (const s of SPECIES_ROWS) {
      const r = champCalc(
        { species: s.en, nature: 'Hardy' },
        { species: 'Hippowdon', nature: 'Hardy', pts: { hp: 4 } },
        MOVES[s.moves[0]].en,
      );
      expect(Array.isArray(r.damage) || typeof r.damage === 'number').toBe(true);
    }
  });
});
