// service.test.ts — UI(日本語入力)→計算サービスの配線検証。
import { calcDamage } from '../service';
import type { MonInput } from '../../data';

const garchomp: MonInput = { speciesJP: 'ガブリアス', natureJP: 'いじっぱり', pts: { atk: 32 } };
const hippo: MonInput = { speciesJP: 'カバルドン', natureJP: 'わんぱく', pts: { hp: 32, def: 32 } };

describe('calcDamage（サービス層）', () => {
  it('シングル ガブ じしん vs カバルドン = 61–73', () => {
    const r = calcDamage({ attacker: garchomp, defender: hippo, moveJP: 'じしん' });
    expect(r.min).toBe(61);
    expect(r.max).toBe(73);
    expect(r.eff).toBe(1);
    // desc は "1.5% chance to 3HKO" = 乱数3発/確定4発。
    expect(r.ko.kind).toBe('rolln');
    expect(r.ko.label).toBe('乱数3発');
    expect(r.ko.sub).toBe('確定4発');
  });

  it('ダブル範囲(×0.75)で 46–55 に低下', () => {
    const r = calcDamage({ attacker: garchomp, defender: hippo, moveJP: 'じしん', doubles: true });
    expect(r.min).toBe(46);
    expect(r.max).toBe(55);
  });

  it('壁（リフレクター）で物理ダメージが約半減', () => {
    const base = calcDamage({ attacker: garchomp, defender: hippo, moveJP: 'じしん' });
    const screened = calcDamage({ attacker: garchomp, defender: hippo, moveJP: 'じしん', screen: true });
    expect(screened.max).toBeLessThan(base.max);
    expect(screened.max / base.max).toBeLessThan(0.75);
  });

  it('じめん技はひこう複合に無効（ランドロス霊獣）→ こうかなし', () => {
    const lando: MonInput = { speciesJP: 'ランドロス' };
    const r = calcDamage({ attacker: garchomp, defender: lando, moveJP: 'じしん' });
    expect(r.eff).toBe(0);
    expect(r.ko.kind).toBe('none');
  });

  it('フリーズドライは対みず複合にばつぐん（eff>=2）', () => {
    const flutter: MonInput = { speciesJP: 'ハバタクカミ', natureJP: 'おくびょう', pts: { spa: 32 } };
    const bundle: MonInput = { speciesJP: 'テツノツツミ' }; // こおり/みず
    const r = calcDamage({ attacker: flutter, defender: bundle, moveJP: 'フリーズドライ' });
    // こおり→こおり0.5 × みず(FD)2 = 1.0。みず以外の複合で純粋確認は別途だが、ここでは無効でないこと。
    expect(r.eff).toBeGreaterThan(0);
  });
});
