import React, { useState, useMemo, useEffect } from "react";
import { Search, ArrowLeftRight, Sun, Moon, X, Plus, Minus, ChevronDown, Zap } from "lucide-react";

/* =========================================================================
   Pokémon Champions ダメージ計算 — UXワイヤーフレーム（実計算式つき）
   コンセプト: 対戦の現場で使う精密計器 / 確定数を主役に / 3タップで結果
   ========================================================================= */

const TYPES = {
  ノーマル:"#9099a1", ほのお:"#ff6b3d", みず:"#3d9bff", でんき:"#f7cf3a",
  くさ:"#54c45e", こおり:"#5fd0d6", かくとう:"#e0432f", どく:"#a35ec0",
  じめん:"#d8a23a", ひこう:"#8fa9ff", エスパー:"#ff5d8a", むし:"#9fbb2a",
  いわ:"#c2a35e", ゴースト:"#6a5acd", ドラゴン:"#4f5bd6",
  あく:"#5a5566", はがね:"#6aa8b8", フェアリー:"#ff8fd0",
};

// 攻撃タイプ → {効果ばつぐん, いまひとつ, こうかなし}
const CHART = {
  ノーマル:{x2:[],h:["いわ","はがね"],z:["ゴースト"]},
  ほのお:{x2:["くさ","こおり","むし","はがね"],h:["ほのお","みず","いわ","ドラゴン"],z:[]},
  みず:{x2:["ほのお","じめん","いわ"],h:["みず","くさ","ドラゴン"],z:[]},
  でんき:{x2:["みず","ひこう"],h:["でんき","くさ","ドラゴン"],z:["じめん"]},
  くさ:{x2:["みず","じめん","いわ"],h:["ほのお","くさ","どく","ひこう","むし","ドラゴン","はがね"],z:[]},
  こおり:{x2:["くさ","じめん","ひこう","ドラゴン"],h:["ほのお","みず","こおり","はがね"],z:[]},
  かくとう:{x2:["ノーマル","こおり","いわ","あく","はがね"],h:["どく","ひこう","エスパー","むし","フェアリー"],z:["ゴースト"]},
  どく:{x2:["くさ","フェアリー"],h:["どく","じめん","いわ","ゴースト"],z:["はがね"]},
  じめん:{x2:["ほのお","でんき","どく","いわ","はがね"],h:["くさ","むし"],z:["ひこう"]},
  ひこう:{x2:["くさ","かくとう","むし"],h:["でんき","いわ","はがね"],z:[]},
  エスパー:{x2:["かくとう","どく"],h:["エスパー","はがね"],z:["あく"]},
  むし:{x2:["くさ","エスパー","あく"],h:["ほのお","かくとう","どく","ひこう","ゴースト","はがね","フェアリー"],z:[]},
  いわ:{x2:["ほのお","こおり","ひこう","むし"],h:["かくとう","じめん","はがね"],z:[]},
  ゴースト:{x2:["エスパー","ゴースト"],h:["あく"],z:["ノーマル"]},
  ドラゴン:{x2:["ドラゴン"],h:["はがね"],z:["フェアリー"]},
  あく:{x2:["エスパー","ゴースト"],h:["かくとう","あく","フェアリー"],z:[]},
  はがね:{x2:["こおり","いわ","フェアリー"],h:["ほのお","みず","でんき","はがね"],z:[]},
  フェアリー:{x2:["かくとう","ドラゴン","あく"],h:["ほのお","どく","はがね"],z:[]},
};

const M = {
  じしん:{name:"じしん",type:"じめん",cat:"phys",power:100,spread:true},
  げきりん:{name:"げきりん",type:"ドラゴン",cat:"phys",power:120},
  ストーンエッジ:{name:"ストーンエッジ",type:"いわ",cat:"phys",power:100},
  アイアンヘッド:{name:"アイアンヘッド",type:"はがね",cat:"phys",power:80},
  インファイト:{name:"インファイト",type:"かくとう",cat:"phys",power:120},
  とんぼがえり:{name:"とんぼがえり",type:"むし",cat:"phys",power:70},
  あんこくきょうだ:{name:"あんこくきょうだ",type:"あく",cat:"phys",power:75,crit:true},
  すいりゅうれんだ:{name:"すいりゅうれんだ",type:"みず",cat:"phys",power:25,hits:3,crit:true},
  ムーンフォース:{name:"ムーンフォース",type:"フェアリー",cat:"spec",power:95},
  シャドーボール:{name:"シャドーボール",type:"ゴースト",cat:"spec",power:80},
  ぼうふう:{name:"ぼうふう",type:"ひこう",cat:"spec",power:110},
  かえんほうしゃ:{name:"かえんほうしゃ",type:"ほのお",cat:"spec",power:90},
  だいちのちから:{name:"だいちのちから",type:"じめん",cat:"spec",power:90},
  ハイドロポンプ:{name:"ハイドロポンプ",type:"みず",cat:"spec",power:110},
  フリーズドライ:{name:"フリーズドライ",type:"こおり",cat:"spec",power:70,freezeDry:true},
};

const P = {
  ガブリアス:{name:"ガブリアス",types:["じめん","ドラゴン"],base:{hp:108,atk:130,def:95,spa:80,spd:85,spe:102},moves:["じしん","げきりん","ストーンエッジ","アイアンヘッド"]},
  カイリュー:{name:"カイリュー",types:["ドラゴン","ひこう"],base:{hp:91,atk:134,def:95,spa:100,spd:100,spe:80},moves:["げきりん","じしん","ぼうふう","インファイト"]},
  ハバタクカミ:{name:"ハバタクカミ",types:["ゴースト","フェアリー"],base:{hp:55,atk:55,def:55,spa:135,spd:135,spe:135},moves:["ムーンフォース","シャドーボール","かえんほうしゃ","フリーズドライ"]},
  ウーラオス:{name:"ウーラオス",types:["かくとう","みず"],base:{hp:100,atk:130,def:100,spa:63,spd:60,spe:97},moves:["すいりゅうれんだ","インファイト","とんぼがえり","アイアンヘッド"]},
  イーユイ:{name:"イーユイ",types:["あく","ほのお"],base:{hp:55,atk:80,def:80,spa:135,spd:120,spe:100},moves:["かえんほうしゃ","シャドーボール","だいちのちから","フリーズドライ"]},
  ディンルー:{name:"ディンルー",types:["あく","じめん"],base:{hp:155,atk:110,def:125,spa:55,spd:80,spe:45},moves:["じしん","ストーンエッジ","あんこくきょうだ","とんぼがえり"]},
  ランドロス:{name:"ランドロス",types:["じめん","ひこう"],base:{hp:89,atk:145,def:90,spa:105,spd:80,spe:91},moves:["じしん","ストーンエッジ","とんぼがえり","インファイト"]},
  カバルドン:{name:"カバルドン",types:["じめん"],base:{hp:108,atk:112,def:118,spa:68,spd:72,spe:47},moves:["じしん","ストーンエッジ","アイアンヘッド"]},
  テツノツツミ:{name:"テツノツツミ",types:["こおり","みず"],base:{hp:56,atk:80,def:114,spa:124,spd:60,spe:136},moves:["フリーズドライ","ハイドロポンプ","だいちのちから","シャドーボール"]},
  モロバレル:{name:"モロバレル",types:["くさ","どく"],base:{hp:114,atk:85,def:70,spa:85,spd:80,spe:30},moves:["だいちのちから","シャドーボール"]},
};
const TERA_TYPES = ["じめん","ドラゴン","ほのお","みず","くさ","フェアリー","はがね","ひこう","ゴースト"];

/* ----------------------------- 計算ロジック ----------------------------- */
const floor = Math.floor;
const pokeRound = (x) => (x - floor(x) > 0.5 ? Math.ceil(x) : floor(x)); // 五捨五超入
const stageMult = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));

// Lv50固定・IV31固定の実数値
function statVal(base, sp, nature, isHP) {
  const inner = floor((base * 2 + 31 + sp * 2) * 50 / 100);
  if (isHP) return inner + 50 + 10;
  return floor((inner + 5) * nature);
}
function typeEff(moveType, defTypes, freezeDry) {
  let m = 1;
  for (const dt of defTypes) {
    if (freezeDry && dt === "みず") { m *= 2; continue; }
    const c = CHART[moveType];
    if (c.z.includes(dt)) m *= 0;
    else if (c.x2.includes(dt)) m *= 2;
    else if (c.h.includes(dt)) m *= 0.5;
  }
  return m;
}

function calc(s) {
  const atk = P[s.atkKey], def = P[s.defKey], move = M[s.moveKey];
  const isPhys = move.cat === "phys";

  // 攻撃側 実数値
  const aBase = isPhys ? atk.base.atk : atk.base.spa;
  let A = statVal(aBase, s.atkSP, s.atkNature, false);
  A = floor(A * stageMult(s.atkStage));

  // 防御側 実数値
  const dBase = isPhys ? def.base.def : def.base.spd;
  let D = statVal(dBase, s.defSP, s.defNature, false);
  D = floor(D * stageMult(s.defStage));
  if (s.defItem === "vest" && !isPhys) D = floor(D * 1.5); // とつげきチョッキ
  const maxHP = statVal(def.base.hp, s.defHpSP, 1.0, true);

  // タイプ
  const atkTypes = atk.types;
  const defTypes = s.defTera.on ? [s.defTera.type] : def.types;

  // STAB（テラスタル考慮）
  let stab = 1;
  const mt = move.type;
  if (s.atkTera.on) {
    const isOrig = atkTypes.includes(mt);
    if (mt === s.atkTera.type && isOrig) stab = 2.0;
    else if (mt === s.atkTera.type || isOrig) stab = 1.5;
  } else stab = atkTypes.includes(mt) ? 1.5 : 1;

  const eff = typeEff(mt, defTypes, move.freezeDry);

  // その他補正
  const grounded = !atkTypes.includes("ひこう");
  let other = 1;
  if (s.atkItem === "band") other *= 1.5;       // こだわり系
  if (s.atkItem === "tama") other *= 1.3;        // いのちのたま
  if (s.weather === "sun") other *= mt === "ほのお" ? 1.5 : mt === "みず" ? 0.5 : 1;
  if (s.weather === "rain") other *= mt === "みず" ? 1.5 : mt === "ほのお" ? 0.5 : 1;
  if (grounded) {
    if (s.terrain === "electric" && mt === "でんき") other *= 1.3;
    if (s.terrain === "grassy" && mt === "くさ") other *= 1.3;
    if (s.terrain === "psychic" && mt === "エスパー") other *= 1.3;
  }
  if (s.terrain === "misty" && mt === "ドラゴン") other *= 0.5;
  if (s.double && move.spread) other *= 0.75;
  if (move.crit) other *= 1.5;
  if (s.screen) other *= 0.5;

  const lv = floor((2 * 50) / 5 + 2); // 22
  const hits = move.hits || 1;
  const rolls = [];
  for (let r = 85; r <= 100; r++) {
    let perHit = floor(floor(lv * move.power * A / D) / 50) + 2;
    perHit = floor(perHit * r / 100);
    perHit = pokeRound(perHit * stab);
    perHit = floor(perHit * eff);
    perHit = floor(perHit * other);
    if (eff > 0) perHit = Math.max(1, perHit);
    rolls.push(perHit * hits);
  }
  rolls.sort((a, b) => a - b);
  const min = rolls[0], max = rolls[15];

  // 確定数
  let ko;
  if (eff === 0) ko = { label: "こうかなし", sub: "", kind: "none" };
  else if (min >= maxHP) ko = { label: "確定1発", sub: "乱数なし", kind: "ohko" };
  else if (max >= maxHP) {
    const cnt = rolls.filter((d) => d >= maxHP).length;
    ko = { label: "乱数1発", sub: `${Math.round((cnt / 16) * 100)}%`, kind: "roll1" };
  } else {
    const g = Math.ceil(maxHP / min), b = Math.ceil(maxHP / max);
    ko = g === b ? { label: `確定${g}発`, sub: "乱数なし", kind: "nhko" }
                 : { label: `乱数${b}発`, sub: `確定${g}発`, kind: "rolln" };
  }
  return { min, max, maxHP, eff, stab, ko,
    minPct: (min / maxHP) * 100, maxPct: (max / maxHP) * 100 };
}

/* ------------------------------- テーマ ------------------------------- */
const themes = {
  dark: { bg:"#0a0e16", grad:"radial-gradient(120% 90% at 50% -10%, #14203a 0%, #0a0e16 55%)",
    panel:"#121826", panel2:"#192131", border:"#28303f", hi:"#eef2f8", mid:"#93a0b4", lo:"#5a6678",
    chip:"#1c2533", accent:"#9af23a" },
  light: { bg:"#efe9dc", grad:"radial-gradient(120% 90% at 50% -10%, #fff 0%, #efe9dc 60%)",
    panel:"#ffffff", panel2:"#f5f1e8", border:"#ddd5c4", hi:"#1a1d24", mid:"#5d6678", lo:"#9099a1",
    chip:"#f1ece0", accent:"#3a8a12" },
};
const koColor = { ohko:"#ff5a45", roll1:"#ff8a3d", nhko:"#ffc24a", rolln:"#ffd66b",
  none:"#5a6678", default:"#5ad1e6" };

export default function App() {
  const [theme, setTheme] = useState("dark");
  const t = themes[theme];

  const [s, setS] = useState({
    atkKey:"ガブリアス", defKey:"カバルドン", moveKey:"じしん",
    atkSP:32, atkNature:1.1, atkStage:0, atkItem:"none", atkTera:{on:false,type:"じめん"},
    defHpSP:32, defSP:32, defNature:1.0, defStage:0, defItem:"none", defTera:{on:false,type:"はがね"},
    weather:"none", terrain:"none", double:false, screen:false,
  });
  const set = (patch) => setS((p) => ({ ...p, ...patch }));

  const [sheet, setSheet] = useState(null); // 'atk' | 'def'
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null); // 'atk' | 'def'
  const [pulse, setPulse] = useState(0);

  const r = useMemo(() => calc(s), [s]);
  useEffect(() => { setPulse((p) => p + 1); }, [r.min, r.max, r.ko.label]);

  const atk = P[s.atkKey], def = P[s.defKey], move = M[s.moveKey];
  const kc = koColor[r.ko.kind] || koColor.default;

  const pickMon = (key) => {
    if (sheet === "atk") set({ atkKey:key, moveKey:P[key].moves[0] });
    else set({ defKey:key });
    setSheet(null); setQ("");
  };
  const swap = () => set({
    atkKey:s.defKey, defKey:s.atkKey, moveKey:P[s.defKey].moves[0],
    atkTera:s.defTera, defTera:s.atkTera,
  });

  const monList = Object.values(P).filter((p) =>
    !q || p.name.includes(q) || p.types.some((ty) => ty.includes(q)));

  return (
    <div style={{ minHeight:"100vh", background:t.bg, display:"flex", justifyContent:"center",
      fontFamily:"'Zen Kaku Gothic New', ui-sans-serif, sans-serif", color:t.hi }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Saira:wght@500;600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes fade { from{opacity:0} to{opacity:1} }
        @keyframes pop { 0%{transform:scale(.96);opacity:.4} 100%{transform:scale(1);opacity:1} }
        @keyframes rise { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .num { font-family:'Saira', ui-sans-serif, sans-serif; font-variant-numeric: tabular-nums; }
      `}</style>

      <div style={{ width:"100%", maxWidth:430, minHeight:"100vh", background:t.grad,
        position:"relative", paddingBottom:40, overflow:"hidden" }}>

        {/* ヘッダー */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"16px 18px 8px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:t.accent,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Zap size={16} color={t.bg} strokeWidth={2.6} />
            </div>
            <div style={{ fontWeight:900, letterSpacing:.5, fontSize:15 }}>ダメ計
              <span style={{ color:t.lo, fontWeight:700, fontSize:11, marginLeft:6 }}>Champions</span>
            </div>
          </div>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            style={btn(t)}>{theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}</button>
        </div>

        {/* ===== HERO: 確定数 ===== */}
        <div key={pulse} style={{ margin:"6px 16px 0", padding:"20px 20px 18px", borderRadius:20,
          background:t.panel, border:`1px solid ${t.border}`, position:"relative", overflow:"hidden",
          animation:"pop .28s ease" }}>
          <div style={{ position:"absolute", inset:0, background:`radial-gradient(80% 120% at 0% 0%, ${kc}22, transparent 60%)` }}/>
          <div style={{ position:"relative" }}>
            <div style={{ fontSize:11, color:t.mid, letterSpacing:1, fontWeight:700 }}>
              {atk.name} の {move.name} → {def.name}
            </div>
            <div className="num" style={{ fontSize:54, fontWeight:800, lineHeight:1, marginTop:6,
              color:kc, textShadow:`0 0 24px ${kc}55` }}>{r.ko.label}</div>
            {r.ko.sub && <div style={{ fontSize:13, color:t.mid, fontWeight:600, marginTop:4 }}>{r.ko.sub}</div>}

            <div style={{ display:"flex", alignItems:"baseline", gap:10, marginTop:16 }}>
              <div className="num" style={{ fontSize:26, fontWeight:700 }}>{r.min}–{r.max}</div>
              <div className="num" style={{ fontSize:14, color:t.mid, fontWeight:600 }}>
                {r.minPct.toFixed(1)}–{r.maxPct.toFixed(1)}%</div>
              <div style={{ marginLeft:"auto", ...mult(r.eff) }}>×{r.eff}</div>
            </div>

            {/* HPバー */}
            <div style={{ marginTop:10, height:12, borderRadius:6, background:t.panel2,
              border:`1px solid ${t.border}`, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", left:0, top:0, bottom:0, borderRadius:6,
                width:`${Math.min(100, r.maxPct)}%`, background:`${kc}55`, transition:"width .25s" }}/>
              <div style={{ position:"absolute", left:0, top:0, bottom:0, borderRadius:6,
                width:`${Math.min(100, r.minPct)}%`, background:kc, transition:"width .25s" }}/>
            </div>
            <div style={{ fontSize:10.5, color:t.lo, marginTop:6 }}>
              相手のこうげき側 HP {r.maxHP} を基準</div>
          </div>
        </div>

        {/* ===== 攻撃側 ===== */}
        <Card t={t} label="こうげき" accent={t.accent} mon={atk} onMon={() => setSheet("atk")}
          tera={s.atkTera} onTera={() => set({ atkTera:{ ...s.atkTera, on:!s.atkTera.on } })}
          onTeraType={(ty) => set({ atkTera:{ on:true, type:ty } })}>
          {/* 技チップ */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginTop:10 }}>
            {atk.moves.map((mk) => {
              const on = mk === s.moveKey;
              return <button key={mk} onClick={() => set({ moveKey:mk })}
                style={moveChip(t, M[mk], on)}>{M[mk].name}</button>;
            })}
          </div>
          <Expander t={t} open={detail === "atk"} onClick={() => setDetail(detail === "atk" ? null : "atk")}>
            <Stepper t={t} label={(move.cat === "phys" ? "こうげき" : "とくこう") + " 能力P"}
              value={s.atkSP} min={0} max={32} step={4} onChange={(v) => set({ atkSP:v })}/>
            <NatureRow t={t} value={s.atkNature} onChange={(v) => set({ atkNature:v })}/>
            <Stepper t={t} label="ランク補正" value={s.atkStage} min={-6} max={6} step={1}
              onChange={(v) => set({ atkStage:v })} signed/>
            <ChoiceRow t={t} label="もちもの" value={s.atkItem}
              opts={[["none","なし"],["band","こだわり ×1.5"],["tama","いのちのたま ×1.3"]]}
              onChange={(v) => set({ atkItem:v })}/>
          </Expander>
        </Card>

        {/* 入れ替え */}
        <div style={{ display:"flex", justifyContent:"center", margin:"-4px 0" }}>
          <button onClick={swap} style={{ ...btn(t), borderRadius:999, padding:"7px 14px",
            display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:700 }}>
            <ArrowLeftRight size={14}/> 攻守 入れ替え</button>
        </div>

        {/* ===== 防御側 ===== */}
        <Card t={t} label="ぼうぎょ" accent="#ff6b3d" mon={def} onMon={() => setSheet("def")}
          tera={s.defTera} onTera={() => set({ defTera:{ ...s.defTera, on:!s.defTera.on } })}
          onTeraType={(ty) => set({ defTera:{ on:true, type:ty } })}>
          <Expander t={t} open={detail === "def"} onClick={() => setDetail(detail === "def" ? null : "def")}>
            <Stepper t={t} label="HP 能力P" value={s.defHpSP} min={0} max={32} step={4}
              onChange={(v) => set({ defHpSP:v })}/>
            <Stepper t={t} label={(move.cat === "phys" ? "ぼうぎょ" : "とくぼう") + " 能力P"}
              value={s.defSP} min={0} max={32} step={4} onChange={(v) => set({ defSP:v })}/>
            <NatureRow t={t} value={s.defNature} onChange={(v) => set({ defNature:v })}/>
            <Stepper t={t} label="ランク補正" value={s.defStage} min={-6} max={6} step={1}
              onChange={(v) => set({ defStage:v })} signed/>
            <ChoiceRow t={t} label="もちもの" value={s.defItem}
              opts={[["none","なし"],["vest","とつげきチョッキ"]]} onChange={(v) => set({ defItem:v })}/>
            <ToggleRow t={t} label="壁（リフレ/ひかりのかべ）" value={s.screen}
              onChange={(v) => set({ screen:v })}/>
          </Expander>
        </Card>

        {/* ===== フィールド ===== */}
        <div style={{ margin:"12px 16px 0", padding:"12px 14px", borderRadius:16,
          background:t.panel, border:`1px solid ${t.border}` }}>
          <div style={{ fontSize:11, color:t.lo, fontWeight:700, marginBottom:8 }}>フィールド状態</div>
          <ChoiceRow t={t} label="てんき" value={s.weather}
            opts={[["none","なし"],["sun","ひざしつよい"],["rain","あめ"]]} onChange={(v) => set({ weather:v })}/>
          <ChoiceRow t={t} label="フィールド" value={s.terrain}
            opts={[["none","なし"],["electric","エレキ"],["grassy","グラス"],["psychic","サイコ"],["misty","ミスト"]]}
            onChange={(v) => set({ terrain:v })}/>
          <ToggleRow t={t} label="ダブル（範囲技 ×0.75）" value={s.double} onChange={(v) => set({ double:v })}/>
        </div>

        <div style={{ textAlign:"center", color:t.lo, fontSize:10.5, marginTop:18, padding:"0 24px" }}>
          ワイヤーフレーム · Lv50固定 / IV31固定 / 能力ポイント制で実計算
        </div>

        {/* ===== ポケモン検索シート ===== */}
        {sheet && (
          <div style={{ position:"absolute", inset:0, zIndex:30, display:"flex", flexDirection:"column",
            justifyContent:"flex-end" }}>
            <div onClick={() => { setSheet(null); setQ(""); }}
              style={{ position:"absolute", inset:0, background:"#000a", animation:"fade .2s" }}/>
            <div style={{ position:"relative", background:t.panel, borderTopLeftRadius:22,
              borderTopRightRadius:22, border:`1px solid ${t.border}`, maxHeight:"82%",
              display:"flex", flexDirection:"column", animation:"sheetUp .28s cubic-bezier(.2,.8,.2,1)" }}>
              <div style={{ padding:"14px 16px 8px", display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ fontWeight:800, fontSize:14 }}>
                  {sheet === "atk" ? "こうげき" : "ぼうぎょ"} ポケモン</div>
                <button onClick={() => { setSheet(null); setQ(""); }}
                  style={{ ...btn(t), marginLeft:"auto" }}><X size={17}/></button>
              </div>
              <div style={{ padding:"0 16px 10px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, background:t.panel2,
                  border:`1px solid ${t.border}`, borderRadius:12, padding:"10px 12px" }}>
                  <Search size={16} color={t.mid}/>
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                    placeholder="名前・タイプで検索（例: ガブ / ドラゴン）"
                    style={{ border:"none", outline:"none", background:"transparent", color:t.hi,
                      fontSize:14, width:"100%", fontFamily:"inherit" }}/>
                </div>
              </div>
              <div style={{ overflowY:"auto", padding:"0 10px 20px" }}>
                {monList.map((p, i) => (
                  <button key={p.name} onClick={() => pickMon(p.name)}
                    style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 12px",
                      background:"transparent", border:"none", borderRadius:12, cursor:"pointer",
                      color:t.hi, animation:`rise .25s ease ${i * 0.02}s both` }}>
                    <span style={{ fontWeight:700, fontSize:14 }}>{p.name}</span>
                    <span style={{ display:"flex", gap:5, marginLeft:"auto" }}>
                      {p.types.map((ty) => <TypePill key={ty} ty={ty}/>)}
                    </span>
                  </button>
                ))}
                {monList.length === 0 &&
                  <div style={{ color:t.lo, textAlign:"center", padding:24, fontSize:13 }}>該当なし</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- 小コンポーネント ----------------------------- */
function Card({ t, label, accent, mon, onMon, tera, onTera, onTeraType, children }) {
  return (
    <div style={{ margin:"12px 16px 0", padding:"14px", borderRadius:18,
      background:t.panel, border:`1px solid ${t.border}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:4, height:34, borderRadius:3, background:accent }}/>
        <button onClick={onMon} style={{ flex:1, display:"flex", alignItems:"center", gap:10,
          background:t.panel2, border:`1px solid ${t.border}`, borderRadius:13, padding:"10px 12px",
          cursor:"pointer", color:t.hi }}>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontSize:9.5, color:t.lo, fontWeight:700, letterSpacing:1 }}>{label}</div>
            <div style={{ fontSize:16, fontWeight:800, marginTop:1 }}>{mon.name}</div>
          </div>
          <div style={{ display:"flex", gap:5, marginLeft:"auto" }}>
            {(tera.on ? [tera.type] : mon.types).map((ty) => <TypePill key={ty} ty={ty}/>)}
          </div>
          <ChevronDown size={16} color={t.mid}/>
        </button>
      </div>

      {/* テラスタル */}
      <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:10 }}>
        <button onClick={onTera} style={{ display:"flex", alignItems:"center", gap:5,
          padding:"6px 10px", borderRadius:10, fontSize:11.5, fontWeight:800, cursor:"pointer",
          border:`1px solid ${tera.on ? TYPES[tera.type] : t.border}`,
          background:tera.on ? TYPES[tera.type] + "22" : "transparent",
          color:tera.on ? TYPES[tera.type] : t.mid }}>
          <span style={{ width:8, height:8, borderRadius:2, transform:"rotate(45deg)",
            background:tera.on ? TYPES[tera.type] : t.lo }}/>
          テラス {tera.on ? "ON" : "OFF"}
        </button>
        {tera.on && (
          <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:2 }}>
            {TERA_TYPES.map((ty) => (
              <button key={ty} onClick={() => onTeraType(ty)}
                style={{ flex:"0 0 auto", padding:"5px 9px", borderRadius:9, fontSize:11, fontWeight:700,
                  cursor:"pointer", border:`1px solid ${tera.type === ty ? TYPES[ty] : t.border}`,
                  background:tera.type === ty ? TYPES[ty] : "transparent",
                  color:tera.type === ty ? "#0a0e16" : t.mid }}>{ty}</button>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Expander({ t, open, onClick, children }) {
  return (
    <div style={{ marginTop:10 }}>
      <button onClick={onClick} style={{ display:"flex", alignItems:"center", gap:6,
        background:"transparent", border:"none", color:t.mid, fontSize:11.5, fontWeight:700,
        cursor:"pointer", padding:"4px 0", fontFamily:"inherit" }}>
        詳細設定（能力P・性格・ランク・道具）
        <ChevronDown size={14} style={{ transform:open ? "rotate(180deg)" : "none", transition:".2s" }}/>
      </button>
      {open && <div style={{ display:"flex", flexDirection:"column", gap:9, marginTop:8,
        animation:"rise .2s ease" }}>{children}</div>}
    </div>
  );
}

function Stepper({ t, label, value, min, max, step, onChange, signed }) {
  const disp = signed && value > 0 ? `+${value}` : `${value}`;
  return (
    <div style={rowStyle(t)}>
      <span style={{ fontSize:12.5, color:t.mid, fontWeight:600 }}>{label}</span>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>
        <button onClick={() => onChange(Math.max(min, value - step))} style={stepBtn(t)}><Minus size={14}/></button>
        <span className="num" style={{ minWidth:34, textAlign:"center", fontWeight:800, fontSize:15 }}>{disp}</span>
        <button onClick={() => onChange(Math.min(max, value + step))} style={stepBtn(t)}><Plus size={14}/></button>
      </div>
    </div>
  );
}
function NatureRow({ t, value, onChange }) {
  const opts = [[0.9,"↓ 0.9"],[1.0,"無 1.0"],[1.1,"↑ 1.1"]];
  return (
    <div style={rowStyle(t)}>
      <span style={{ fontSize:12.5, color:t.mid, fontWeight:600 }}>性格補正</span>
      <div style={{ display:"flex", gap:5, marginLeft:"auto" }}>
        {opts.map(([v, l]) => (
          <button key={v} onClick={() => onChange(v)} style={segBtn(t, value === v)}>{l}</button>
        ))}
      </div>
    </div>
  );
}
function ChoiceRow({ t, label, value, opts, onChange }) {
  return (
    <div style={{ ...rowStyle(t), flexWrap:"wrap", rowGap:8 }}>
      <span style={{ fontSize:12.5, color:t.mid, fontWeight:600 }}>{label}</span>
      <div style={{ display:"flex", gap:5, marginLeft:"auto", flexWrap:"wrap", justifyContent:"flex-end" }}>
        {opts.map(([v, l]) => (
          <button key={v} onClick={() => onChange(v)} style={segBtn(t, value === v)}>{l}</button>
        ))}
      </div>
    </div>
  );
}
function ToggleRow({ t, label, value, onChange }) {
  return (
    <div style={rowStyle(t)}>
      <span style={{ fontSize:12.5, color:t.mid, fontWeight:600 }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{ marginLeft:"auto", width:44, height:25,
        borderRadius:999, border:"none", cursor:"pointer", position:"relative",
        background:value ? t.accent : t.chip, transition:".2s" }}>
        <span style={{ position:"absolute", top:3, left:value ? 22 : 3, width:19, height:19,
          borderRadius:999, background:value ? "#0a0e16" : t.mid, transition:".2s" }}/>
      </button>
    </div>
  );
}
function TypePill({ ty }) {
  return <span style={{ fontSize:10, fontWeight:800, color:"#0a0e16", background:TYPES[ty],
    padding:"3px 7px", borderRadius:7 }}>{ty}</span>;
}

/* ------------------------------- スタイル ------------------------------- */
const btn = (t) => ({ background:t.chip, border:`1px solid ${t.border}`, borderRadius:10,
  color:t.hi, padding:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" });
const stepBtn = (t) => ({ width:30, height:30, borderRadius:9, background:t.chip,
  border:`1px solid ${t.border}`, color:t.hi, cursor:"pointer", display:"flex",
  alignItems:"center", justifyContent:"center" });
const segBtn = (t, on) => ({ padding:"6px 10px", borderRadius:9, fontSize:11.5, fontWeight:700,
  cursor:"pointer", fontFamily:"inherit",
  border:`1px solid ${on ? t.accent : t.border}`, background:on ? t.accent : "transparent",
  color:on ? "#0a0e16" : t.mid });
const rowStyle = (t) => ({ display:"flex", alignItems:"center", padding:"6px 2px" });
const moveChip = (t, m, on) => ({ display:"flex", alignItems:"center", gap:6, padding:"8px 11px",
  borderRadius:11, fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
  border:`1px solid ${on ? TYPES[m.type] : t.border}`,
  background:on ? TYPES[m.type] + "26" : "transparent", color:on ? TYPES[m.type] : t.mid,
  position:"relative" });
function mult(eff) {
  const c = eff === 0 ? "#5a6678" : eff > 1 ? "#ff5a45" : eff < 1 ? "#5ad1e6" : "#93a0b4";
  return { fontSize:13, fontWeight:800, color:c, fontFamily:"'Saira', sans-serif",
    border:`1px solid ${c}55`, padding:"2px 8px", borderRadius:8 };
}
