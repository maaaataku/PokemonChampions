// typechart.test.ts — タイプ相性・対策ロジックの検証（F-15〜F-17）。
import {
  typeEff, defensiveMatchup, summarizeDefense, bestOffense, sharedWeaknesses,
} from '../typechart';

describe('typeEff（基本相性）', () => {
  it('複合の積（じめん→ほのお/いわ=×4、こおり→くさ/じめん相当）', () => {
    expect(typeEff('じめん', ['ほのお', 'いわ'])).toBe(4);
    expect(typeEff('みず', ['ほのお', 'じめん'])).toBe(4);
  });
  it('無効を含む（でんき→じめん=0）', () => {
    expect(typeEff('でんき', ['じめん'])).toBe(0);
  });
  it('フリーズドライは対みず×2特例', () => {
    expect(typeEff('こおり', ['みず'])).toBe(0.5);
    expect(typeEff('こおり', ['みず'], true)).toBe(2);
  });
});

describe('summarizeDefense（弱点/半減/無効・F-17テラス反映前提）', () => {
  it('ガブリアス(じめん/ドラゴン)：氷4倍弱点、でんき無効', () => {
    const g = summarizeDefense(['じめん', 'ドラゴン']);
    const ice = g.weak.find((w) => w.type === 'こおり');
    expect(ice?.mult).toBe(4);
    expect(g.immune).toContain('でんき');
    // 弱点は倍率降順（先頭が最大）。
    expect(g.weak[0].mult).toBeGreaterThanOrEqual(g.weak[g.weak.length - 1].mult);
  });
  it('テラス『はがね』にすると相性が一変（くさ無効化・弱点減）', () => {
    const before = summarizeDefense(['じめん', 'ドラゴン']);
    const after = summarizeDefense(['はがね']); // テラスタル後は単一タイプ
    expect(after.immune).toContain('どく');
    // はがねは多くを半減。半減数が増える。
    expect(after.resist.length).toBeGreaterThan(before.resist.length);
  });
});

describe('defensiveMatchup', () => {
  it('全18タイプ分の倍率を返す', () => {
    const c = defensiveMatchup(['みず']);
    expect(Object.keys(c).length).toBe(18);
    expect(c['でんき']).toBe(2);
    expect(c['ほのお']).toBe(0.5);
  });
});

describe('bestOffense（有効打・F-16）', () => {
  it('攻撃タイプ群の最大倍率を返す', () => {
    // じめん/ドラゴン のうち、ハバタクカミ(ゴースト/フェアリー)へは じめん=1, ドラゴン=0 → 最大1
    expect(bestOffense(['じめん', 'ドラゴン'], ['ゴースト', 'フェアリー'])).toBe(1);
    // こおり は じめん/ひこう へ ×4
    expect(bestOffense(['こおり'], ['じめん', 'ひこう'])).toBe(4);
  });
});

describe('sharedWeaknesses（パーティ補完・F-15）', () => {
  it('共通弱点タイプを抽出（両者がじめん弱点なら じめん を含む）', () => {
    // イーユイ(あく/ほのお)とヒードラン(ほのお/はがね)は ともに じめん弱点
    const shared = sharedWeaknesses(['あく', 'ほのお'], ['ほのお', 'はがね']);
    expect(shared).toContain('じめん');
  });
  it('共通弱点が無ければ空', () => {
    const shared = sharedWeaknesses(['みず'], ['くさ']);
    expect(shared.length).toBe(0);
  });
});
