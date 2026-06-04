// showdown.test.ts — Showdown/PokePaste の取込・書き出しを検証。
import {
  parseShowdown, evToPts, speciesJPFromEN, moveJPFromEN,
  resolveSlot, importTeamToBoard, boardAlliesToShowdown,
} from '../showdown';
import { initialBoard } from '../../ui/calcModel';

const TEAM = `Garchomp @ Choice Scarf
Ability: Rough Skin
Level: 50
Tera Type: Steel
EVs: 252 Atk / 4 Def / 252 Spe
Adamant Nature
- Earthquake
- Stone Edge
- Outrage
- Scale Shot

Chi-Yu @ Choice Specs
Ability: Beads of Ruin
Level: 50
Tera Type: Fire
EVs: 4 Def / 252 SpA / 252 Spe
Timid Nature
- Heat Wave
- Flamethrower
- Dark Pulse
- Earth Power`;

describe('evToPts', () => {
  it('EV→能力P（ptsToEVの逆）', () => {
    expect(evToPts(0)).toBe(0);
    expect(evToPts(4)).toBe(1);
    expect(evToPts(8)).toBe(1);
    expect(evToPts(248)).toBe(31);
    expect(evToPts(252)).toBe(32);
  });
});

describe('EN→JP 逆引き', () => {
  it('種族/技を解決（表記ゆれに強い）', () => {
    expect(speciesJPFromEN('Garchomp')).toBe('ガブリアス');
    expect(speciesJPFromEN('urshifu-rapid-strike')).toBe('ウーラオス');
    expect(moveJPFromEN('Earthquake')).toBe('じしん');
    expect(speciesJPFromEN('Pikachu')).toBeUndefined();
  });
});

describe('parseShowdown', () => {
  it('6行セットを構造化（item/nature/EV/tera/moves/level）', () => {
    const sets = parseShowdown(TEAM);
    expect(sets.length).toBe(2);
    const g = sets[0];
    expect(g.speciesEN).toBe('Garchomp');
    expect(g.itemEN).toBe('Choice Scarf');
    expect(g.natureEN).toBe('Adamant');
    expect(g.level).toBe(50);
    expect(g.teraEN).toBe('Steel');
    expect(g.evs).toEqual({ atk: 252, def: 4, spe: 252 });
    expect(g.moves).toEqual(['Earthquake', 'Stone Edge', 'Outrage', 'Scale Shot']);
  });
  it('ニックネーム付き先頭行', () => {
    const sets = parseShowdown('サメ (Garchomp) @ Life Orb\nAdamant Nature\n- Earthquake');
    expect(sets[0].nickname).toBe('サメ');
    expect(sets[0].speciesEN).toBe('Garchomp');
    expect(sets[0].itemEN).toBe('Life Orb');
  });
  it('性別マーカー(M)/(F)は種族として誤認しない', () => {
    const sets = parseShowdown('Garchomp (M) @ Life Orb\n- Earthquake');
    expect(sets[0].speciesEN).toBe('Garchomp');
    expect(sets[0].nickname).toBeUndefined();
  });
});

describe('resolveSlot', () => {
  it('EVが大きい攻撃statを採用し、能力P/性格/スカーフ/テラを解決', () => {
    const set = parseShowdown(TEAM)[0]; // Garchomp 物理
    const r = resolveSlot(set)!;
    expect(r.speciesJP).toBe('ガブリアス');
    expect(r.atk.sp).toBe(32); // atk252
    expect(r.atk.nature).toBe(1.1); // Adamant: atk↑
    expect(r.spe.scarf).toBe(true);
    expect(r.spe.pts).toBe(32);
    expect(r.tera).toEqual({ on: true, type: 'はがね' });
  });
  it('特殊アタッカーは spa を攻撃statに', () => {
    const set = parseShowdown(TEAM)[1]; // Chi-Yu 特殊
    const r = resolveSlot(set)!;
    expect(r.speciesJP).toBe('イーユイ');
    expect(r.atk.sp).toBe(32); // spa252
    expect(r.atk.nature).toBe(1.0); // Timid は spe↑/atk↓ → spa は無補正
    expect(r.spe.pts).toBe(32);
  });
  it('ロスター外は null', () => {
    const set = parseShowdown('Pikachu @ Light Ball\n- Thunderbolt')[0];
    expect(resolveSlot(set)).toBeNull();
  });
});

describe('importTeamToBoard', () => {
  it('先頭4体を 味方A/B・相手L/R に反映', () => {
    const res = importTeamToBoard(initialBoard(), parseShowdown(TEAM));
    expect(res.applied.map((a) => a.slot)).toEqual(['allyA', 'allyB']);
    expect(res.board.slots.allyA).toBe('ガブリアス');
    expect(res.board.slots.allyB).toBe('イーユイ');
    expect(res.board.atkProfs.allyA.sp).toBe(32);
    expect(res.board.speProfs.allyA.scarf).toBe(true);
    expect(res.board.tera.allyA).toEqual({ on: true, type: 'はがね' });
    expect(res.board.activeAtk).toBe('allyA');
  });
  it('ロスター外は警告に出る', () => {
    const res = importTeamToBoard(initialBoard(), parseShowdown('Pikachu\n- Thunderbolt'));
    expect(res.applied.length).toBe(0);
    expect(res.warnings.join(' ')).toMatch(/ロスター外/);
  });
});

describe('boardAlliesToShowdown（書き出し）', () => {
  it('味方2体を Showdown 形式で出力し、再パースで種族が一致', () => {
    const text = boardAlliesToShowdown(initialBoard());
    const back = parseShowdown(text);
    expect(back.length).toBe(2);
    expect(speciesJPFromEN(back[0].speciesEN)).toBe('ガブリアス');
    expect(text).toMatch(/Level: 50/);
    expect(text).toMatch(/Nature/);
  });
  it('取込→書き出し→取込で主要値が保たれる', () => {
    const imported = importTeamToBoard(initialBoard(), parseShowdown(TEAM)).board;
    const text = boardAlliesToShowdown(imported);
    const back = parseShowdown(text);
    expect(back[0].speciesEN).toBe('Garchomp');
    expect(back[0].itemEN).toBe('Choice Scarf');
    expect(back[0].teraEN).toBe('Steel');
    expect(back[0].evs.spe).toBe(252);
  });
});
