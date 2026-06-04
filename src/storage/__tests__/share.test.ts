// share.test.ts — 共有コードの encode/decode と検証を確認。
import { encodeBoard, decodeBoard } from '../share';
import { initialBoard, type BoardState } from '../../ui/calcModel';

const withFoe = (foeL: string): BoardState => ({ ...initialBoard(), slots: { ...initialBoard().slots, foeL } });

describe('encode/decode（往復）', () => {
  it('盤面を往復しても一致する', () => {
    const board = withFoe('バンギラス');
    const code = encodeBoard(board);
    expect(code.startsWith('PC1.')).toBe(true);
    const back = decodeBoard(code);
    expect(back).not.toBeNull();
    expect(back).toEqual(board);
  });

  it('日本語(多バイト)の種族名・技名も壊れない', () => {
    const board = initialBoard();
    const back = decodeBoard(encodeBoard(board))!;
    expect(back.slots.allyA).toBe(board.slots.allyA); // ガブリアス
    expect(back.comboMv.allyB).toBe(board.comboMv.allyB); // ねっぷう
  });

  it('プロフィールや各種設定も保持される', () => {
    const board = initialBoard();
    board.weather = 'sun';
    board.trickRoom = true;
    board.atkProfs.allyA.sp = 12;
    board.tera.foeL = { on: true, type: 'はがね' };
    const back = decodeBoard(encodeBoard(board))!;
    expect(back.weather).toBe('sun');
    expect(back.trickRoom).toBe(true);
    expect(back.atkProfs.allyA.sp).toBe(12);
    expect(back.tera.foeL).toEqual({ on: true, type: 'はがね' });
  });
});

describe('decode の堅牢性', () => {
  it('プレフィックス無しは null', () => {
    expect(decodeBoard('hello')).toBeNull();
    expect(decodeBoard('')).toBeNull();
  });
  it('壊れた本体は null', () => {
    expect(decodeBoard('PC1.@@@not-base64@@@')).toBeNull();
  });
  it('前後の空白・改行を許容', () => {
    const code = encodeBoard(withFoe('ヒードラン'));
    expect(decodeBoard(`  ${code}\n`)?.slots.foeL).toBe('ヒードラン');
  });
  it('未知ポケモンを含むコードは非互換として null', () => {
    const board = initialBoard();
    (board.slots as Record<string, string>).foeL = 'ぞんざいなモンスター';
    expect(decodeBoard(encodeBoard(board))).toBeNull();
  });
  it('バージョン不一致は null', () => {
    // v:2 のエンベロープを手で作って base64url 化（将来バージョンの非互換を模擬）。
    const json = JSON.stringify({ v: 2, b: initialBoard() });
    const b64 = Buffer.from(json, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeBoard('PC1.' + b64)).toBeNull();
  });
});
