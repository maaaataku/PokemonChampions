// types.ts — タイプの日本語↔英語マッピングと表示色。
// エンジンは英語タイプ名（'Ground' 等）を使うため、UIの日本語表示はここで解決する。

import type { TypeName } from '@smogon/calc/dist/data/interface';

/** 日本語タイプ名（UI表示・配色キー）。 */
export type TypeJP =
  | 'ノーマル' | 'ほのお' | 'みず' | 'でんき' | 'くさ' | 'こおり'
  | 'かくとう' | 'どく' | 'じめん' | 'ひこう' | 'エスパー' | 'むし'
  | 'いわ' | 'ゴースト' | 'ドラゴン' | 'あく' | 'はがね' | 'フェアリー';

/** 日本語タイプ → 英語タイプ（@smogon/calc の TypeName）。 */
export const TYPE_JP_TO_EN: Record<TypeJP, TypeName> = {
  ノーマル: 'Normal',
  ほのお: 'Fire',
  みず: 'Water',
  でんき: 'Electric',
  くさ: 'Grass',
  こおり: 'Ice',
  かくとう: 'Fighting',
  どく: 'Poison',
  じめん: 'Ground',
  ひこう: 'Flying',
  エスパー: 'Psychic',
  むし: 'Bug',
  いわ: 'Rock',
  ゴースト: 'Ghost',
  ドラゴン: 'Dragon',
  あく: 'Dark',
  はがね: 'Steel',
  フェアリー: 'Fairy',
};

/** 英語タイプ → 日本語タイプ。 */
export const TYPE_EN_TO_JP = Object.fromEntries(
  Object.entries(TYPE_JP_TO_EN).map(([jp, en]) => [en, jp]),
) as Record<TypeName, TypeJP>;

/** 全18タイプ（相性表の列順）。 */
export const ALL_TYPES: TypeJP[] = Object.keys(TYPE_JP_TO_EN) as TypeJP[];

/** UI 配色（試作 DoublesCalcWireframe.jsx と一致）。 */
export const TYPE_COLORS: Record<TypeJP, string> = {
  ノーマル: '#9099a1', ほのお: '#ff6b3d', みず: '#3d9bff', でんき: '#f7cf3a',
  くさ: '#54c45e', こおり: '#5fd0d6', かくとう: '#e0432f', どく: '#a35ec0',
  じめん: '#d8a23a', ひこう: '#8fa9ff', エスパー: '#ff5d8a', むし: '#9fbb2a',
  いわ: '#c2a35e', ゴースト: '#6a5acd', ドラゴン: '#4f5bd6',
  あく: '#5a5566', はがね: '#6aa8b8', フェアリー: '#ff8fd0',
};
