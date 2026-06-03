import React, { useState, useMemo, useEffect } from "react";
import { Search, Sun, Moon, X, Plus, Minus, ChevronDown, Zap, Layers, Target, RotateCcw } from "lucide-react";

/* =========================================================================
   Pokémon Champions ダメージ計算 — ダブル主軸ワイヤーフレーム
   2v2盤面 / 範囲技は複数対象を同時表示 / 味方巻き込み / 合算KO / ダブル補正
   ========================================================================= */

const TYPES = {
  ノーマル:"#9099a1", ほのお:"#ff6b3d", みず:"#3d9bff", でんき:"#f7cf3a",
  くさ:"#54c45e", こおり:"#5fd0d6", かくとう:"#e0432f", どく:"#a35ec0",
  じめん:"#d8a23a", ひこう:"#8fa9ff", エスパー:"#ff5d8a", むし:"#9fbb2a",
  いわ:"#c2a35e", ゴースト:"#6a5acd", ドラゴン:"#4f5bd6",
  あく:"#5a5566", はがね:"#6aa8b8", フェアリー:"#ff8fd0",
};
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
// target: single=対象選択 / foes=相手全体(範囲) / all=自分以外全体(味方巻き込み,範囲)
const M = {
  じしん:{name:"じしん",type:"じめん",cat:"phys",power:100,target:"all"},
  いわなだれ:{name:"いわなだれ",type:"いわ",cat:"phys",power:75,target:"foes"},
  ねっぷう:{name:"ねっぷう",type:"ほのお",cat:"spec",power:95,target:"foes"},
  げきりん:{name:"げきりん",type:"ドラゴン",cat:"phys",power:120,target:"single"},
  ストーンエッジ:{name:"ストーンエッジ",type:"いわ",cat:"phys",power:100,target:"single"},
  アイアンヘッド:{name:"アイアンヘッド",type:"はがね",cat:"phys",power:80,target:"single"},
  インファイト:{name:"インファイト",type:"かくとう",cat:"phys",power:120,target:"single"},
  とんぼがえり:{name:"とんぼがえり",type:"むし",cat:"phys",power:70,target:"single"},
  あんこくきょうだ:{name:"あんこくきょうだ",type:"あく",cat:"phys",power:75,target:"single",crit:true},
  すいりゅうれんだ:{name:"すいりゅうれんだ",type:"みず",cat:"phys",power:25,hits:3,target:"single",crit:true},
  ムーンフォース:{name:"ムーンフォース",type:"フェアリー",cat:"spec",power:95,target:"single"},
  シャドーボール:{name:"シャドーボール",type:"ゴースト",cat:"spec",power:80,target:"single"},
  かえんほうしゃ:{name:"かえんほうしゃ",type:"ほのお",cat:"spec",power:90,target:"single"},
  だいちのちから:{name:"だいちのちから",type:"じめん",cat:"spec",power:90,target:"single"},
  ハイドロポンプ:{name:"ハイドロポンプ",type:"みず",cat:"spec",power:110,target:"single"},
  フリーズドライ:{name:"フリーズドライ",type:"こおり",cat:"spec",power:70,target:"single",freezeDry:true},
};
const P = {
  ガブリアス:{name:"ガブリアス",types:["じめん","ドラゴン"],base:{hp:108,atk:130,def:95,spa:80,spd:85,spe:102},moves:["じしん","いわなだれ","げきりん","アイアンヘッド"]},
  カイリュー:{name:"カイリュー",types:["ドラゴン","ひこう"],base:{hp:91,atk:134,def:95,spa:100,spd:100,spe:80},moves:["げきりん","じしん","いわなだれ","インファイト"]},
  ハバタクカミ:{name:"ハバタクカミ",types:["ゴースト","フェアリー"],base:{hp:55,atk:55,def:55,spa:135,spd:135,spe:135},moves:["ムーンフォース","シャドーボール","かえんほうしゃ","フリーズドライ"]},
  ウーラオス:{name:"ウーラオス",types:["かくとう","みず"],base:{hp:100,atk:130,def:100,spa:63,spd:60,spe:97},moves:["すいりゅうれんだ","インファイト","とんぼがえり","いわなだれ"]},
  イーユイ:{name:"イーユイ",types:["あく","ほのお"],base:{hp:55,atk:80,def:80,spa:135,spd:120,spe:100},moves:["ねっぷう","かえんほうしゃ","シャドーボール","だいちのちから"]},
  ディンルー:{name:"ディンルー",types:["あく","じめん"],base:{hp:155,atk:110,def:125,spa:55,spd:80,spe:45},moves:["じしん","いわなだれ","あんこくきょうだ","とんぼがえり"]},
  ランドロス:{name:"ランドロス",types:["じめん","ひこう"],base:{hp:89,atk:145,def:90,spa:105,spd:80,spe:91},moves:["じしん","いわなだれ","とんぼがえり","インファイト"]},
  カバルドン:{name:"カバルドン",types:["じめん"],base:{hp:108,atk:112,def:118,spa:68,spd:72,spe:47},moves:["じしん","ストーンエッジ","アイアンヘッド"]},
  テツノツツミ:{name:"テツノツツミ",types:["こおり","みず"],base:{hp:56,atk:80,def:114,spa:124,spd:60,spe:136},moves:["フリーズドライ","ハイドロポンプ","だいちのちから","シャドーボール"]},
  モロバレル:{name:"モロバレル",types:["くさ","どく"],base:{hp:114,atk:85,def:70,spa:85,spd:80,spe:30},moves:["だいちのちから","シャドーボール"]},
};
const TERA_TYPES = ["じめん","ドラゴン","ほのお","みず","くさ","フェアリー","はがね","ひこう","ゴースト","あく"];

const floor = Math.floor;
const pokeRound = (x) => (x - floor(x) > 0.5 ? Math.ceil(x) : floor(x));
const stageMult = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
function statVal(base, sp, nature, isHP) {
  const inner = floor((base * 2 + 31 + sp * 2) * 50 / 100);
  return isHP ? inner + 60 : floor((inner + 5) * nature);
}
function typeEff(mt, defTypes, fd) {
  let m = 1;
  for (const dt of defTypes) {
    if (fd && dt === "みず") { m *= 2; continue; }
    const c = CHART[mt];
    if (c.z.includes(dt)) m *= 0; else if (c.x2.includes(dt)) m *= 2; else if (c.h.includes(dt)) m *= 0.5;
  }
  return m;
}

// 1対象ぶんの計算
function calcOne({ atkMon, atkProf, atkTera, move, defMon, defProf, defTera, weather, terrain, spread }) {
  const isPhys = move.cat === "phys";
  const crit = !!move.crit;
  const aBase = isPhys ? atkMon.base.atk : atkMon.base.spa;
  let aStage = atkProf.stage - (atkProf.intim && isPhys ? 1 : 0);
  if (crit) aStage = Math.max(0, aStage); // 急所は攻撃の下降を無視
  let A = floor(statVal(aBase, atkProf.sp, atkProf.nature, false) * stageMult(aStage));

  const dBase = isPhys ? defMon.base.def : defMon.base.spd;
  let dStage = defProf.stage || 0;
  if (crit) dStage = Math.min(0, dStage); // 急所は防御の上昇を無視
  let D = floor(statVal(dBase, defProf.defSP, defProf.nature, false) * stageMult(dStage));
  if (defProf.vest && !isPhys) D = floor(D * 1.5);
  const maxHP = statVal(defMon.base.hp, defProf.hpSP, 1.0, true);

  const atkTypes = atkMon.types;
  const defTypes = defTera.on ? [defTera.type] : defMon.types;
  const mt = move.type;
  let stab = 1;
  if (atkTera.on) {
    const isOrig = atkTypes.includes(mt);
    if (mt === atkTera.type && isOrig) stab = 2.0;
    else if (mt === atkTera.type || isOrig) stab = 1.5;
  } else stab = atkTypes.includes(mt) ? 1.5 : 1;
  const eff = typeEff(mt, defTypes, move.freezeDry);

  const grounded = !atkTypes.includes("ひこう");
  let other = 1;
  if (atkProf.item === "band") other *= 1.5;
  if (atkProf.item === "tama") other *= 1.3;
  if (atkProf.hh) other *= 1.5;                  // てだすけ
  if (weather === "sun") other *= mt === "ほのお" ? 1.5 : mt === "みず" ? 0.5 : 1;
  if (weather === "rain") other *= mt === "みず" ? 1.5 : mt === "ほのお" ? 0.5 : 1;
  if (grounded) {
    if (terrain === "electric" && mt === "でんき") other *= 1.3;
    if (terrain === "grassy" && mt === "くさ") other *= 1.3;
    if (terrain === "psychic" && mt === "エスパー") other *= 1.3;
  }
  if (spread) other *= 0.75;                      // 範囲技
  if (crit) other *= 1.5;
  if (defProf.fg) other *= 0.75;                  // フレンドガード
  if (defProf.screen && !crit) other *= 0.6667;   // ダブルの壁(≒2732/4096)

  const lv = floor((2 * 50) / 5 + 2);
  const hits = move.hits || 1;
  const rolls = [];
  for (let r = 85; r <= 100; r++) {
    let d = floor(floor(lv * move.power * A / D) / 50) + 2;
    d = floor(d * r / 100);
    d = pokeRound(d * stab);
    d = floor(d * eff);
    d = floor(d * other);
    if (eff > 0) d = Math.max(1, d);
    rolls.push(d * hits);
  }
  rolls.sort((a, b) => a - b);
  return { rolls, min: rolls[0], max: rolls[15], maxHP, eff };
}
function koOf(min, max, rolls, maxHP, eff) {
  if (eff === 0) return { label: "こうかなし", sub: "", kind: "none" };
  if (min >= maxHP) return { label: "確定1発", sub: "乱数なし", kind: "ohko" };
  if (max >= maxHP) {
    const cnt = rolls.filter((d) => d >= maxHP).length;
    return { label: "乱数1発", sub: `${Math.round((cnt / 16) * 100)}%`, kind: "roll1" };
  }
  const g = Math.ceil(maxHP / min), b = Math.ceil(maxHP / max);
  return g === b ? { label: `確定${g}発`, sub: "乱数なし", kind: "nhko" }
                 : { label: `乱数${b}発`, sub: `確定${g}発`, kind: "rolln" };
}

const themes = {
  dark:{ bg:"#0a0e16", grad:"radial-gradient(120% 80% at 50% -10%, #14203a 0%, #0a0e16 55%)",
    panel:"#121826", panel2:"#192131", border:"#28303f", hi:"#eef2f8", mid:"#93a0b4", lo:"#5a6678", chip:"#1c2533", accent:"#9af23a", foe:"#ff6b3d" },
  light:{ bg:"#efe9dc", grad:"radial-gradient(120% 80% at 50% -10%, #fff 0%, #efe9dc 60%)",
    panel:"#fff", panel2:"#f5f1e8", border:"#ddd5c4", hi:"#1a1d24", mid:"#5d6678", lo:"#9099a1", chip:"#f1ece0", accent:"#3a8a12", foe:"#d2502a" },
};
const koColor = { ohko:"#ff5a45", roll1:"#ff8a3d", nhko:"#ffc24a", rolln:"#ffd66b", none:"#5a6678" };

export default function App() {
  const [theme, setTheme] = useState("dark");
  const t = themes[theme];

  const [slots, setSlots] = useState({ foeL:"カバルドン", foeR:"モロバレル", allyA:"ガブリアス", allyB:"イーユイ" });
  const [activeAtk, setActiveAtk] = useState("allyA");
  const [moveKey, setMoveKey] = useState("じしん");
  const [focusFoe, setFocusFoe] = useState("foeL");

  const [atkProfs, setAtkProfs] = useState({
    allyA:{ sp:32, nature:1.1, stage:0, item:"none", hh:false, intim:false },
    allyB:{ sp:32, nature:1.1, stage:0, item:"none", hh:false, intim:false },
  });
  const atkProf = atkProfs[activeAtk];
  const setAtk = (key, val) => setAtkProfs((p) => ({ ...p, [activeAtk]: { ...p[activeAtk], [key]: val } }));
  const [defProfs, setDefProfs] = useState({
    foeL:{ hpSP:32, defSP:16, nature:1.0, vest:false, fg:false, screen:false, stage:0 },
    foeR:{ hpSP:32, defSP:0, nature:1.0, vest:false, fg:false, screen:false, stage:0 },
    allyA:{ hpSP:0, defSP:0, nature:1.0, vest:false, fg:false, screen:false, stage:0 },
    allyB:{ hpSP:0, defSP:0, nature:1.0, vest:false, fg:false, screen:false, stage:0 },
  });
  const [tera, setTera] = useState({
    foeL:{on:false,type:"はがね"}, foeR:{on:false,type:"みず"},
    allyA:{on:false,type:"はがね"}, allyB:{on:false,type:"みず"},
  });
  const [weather, setWeather] = useState("none");
  const [terrain, setTerrain] = useState("none");

  const [sheet, setSheet] = useState(null); // slot id
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null); // 'atk' | 'def'
  const [comboMv, setComboMv] = useState({ allyA:"じしん", allyB:"ねっぷう" });
  const [pulse, setPulse] = useState(0);

  const atkMon = P[slots[activeAtk]];
  const move = M[moveKey];
  const allyOther = activeAtk === "allyA" ? "allyB" : "allyA";

  // 対象スロット決定
  const targetSlots = useMemo(() => {
    if (move.target === "single") return [focusFoe];
    if (move.target === "foes") return ["foeL", "foeR"];
    return ["foeL", "foeR", allyOther]; // all: 味方巻き込み
  }, [move, focusFoe, allyOther]);
  const isSpread = targetSlots.length > 1;

  const results = useMemo(() => {
    const out = {};
    for (const sl of targetSlots) {
      const dp = defProfs[sl] || { hpSP:0, defSP:0, nature:1.0 };
      const r = calcOne({
        atkMon, atkProf, atkTera: tera[activeAtk], move,
        defMon: P[slots[sl]], defProf: dp, defTera: tera[sl] || {on:false,type:""},
        weather, terrain, spread: isSpread,
      });
      out[sl] = { ...r, ko: koOf(r.min, r.max, r.rolls, r.maxHP, r.eff), isAlly: sl === allyOther };
    }
    return out;
  }, [targetSlots, atkMon, atkProf, tera, move, slots, defProfs, weather, terrain, isSpread, activeAtk, allyOther]);

  useEffect(() => { setPulse((p) => p + 1); }, [moveKey, slots, focusFoe, weather, terrain]);

  const primarySlot = targetSlots.includes(focusFoe) ? focusFoe : targetSlots[0];
  const others = targetSlots.filter((s) => s !== primarySlot);

  const pickMon = (key) => { setSlots((p) => ({ ...p, [sheet]: key })); if (sheet === activeAtk) setMoveKey(P[key].moves[0]); setSheet(null); setQ(""); };
  const monList = Object.values(P).filter((p) => !q || p.name.includes(q) || p.types.some((ty) => ty.includes(q)));

  // 合算（切り替え不要・味方A/Bの技を直接選択して、focus中の相手に合算）
  const effMv = (sl) => {
    const k = comboMv[sl];
    if (k === "none") return "none";
    return P[slots[sl]].moves.includes(k) ? k : P[slots[sl]].moves[0];
  };
  const contrib = (sl) => {
    const mvKey = effMv(sl);
    if (mvKey === "none") return null;
    const mv = M[mvKey];
    const r = calcOne({
      atkMon: P[slots[sl]], atkProf: atkProfs[sl], atkTera: tera[sl], move: mv,
      defMon: P[slots[focusFoe]], defProf: defProfs[focusFoe], defTera: tera[focusFoe],
      weather, terrain, spread: mv.target !== "single",
    });
    return { slot: sl, name: P[slots[sl]].name, mv, min: r.min, max: r.max,
      ko: koOf(r.min, r.max, r.rolls, r.maxHP, r.eff) };
  };
  const comboParts = ["allyA", "allyB"].map(contrib).filter(Boolean);
  const comboMin = comboParts.reduce((a, c) => a + c.min, 0);
  const comboMax = comboParts.reduce((a, c) => a + c.max, 0);
  const comboHP = statVal(P[slots[focusFoe]].base.hp, defProfs[focusFoe].hpSP, 1, true);

  return (
    <div style={{ minHeight:"100vh", background:t.bg, display:"flex", justifyContent:"center",
      fontFamily:"'Zen Kaku Gothic New', ui-sans-serif, sans-serif", color:t.hi }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Saira:wght@500;600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes fade { from{opacity:0} to{opacity:1} }
        @keyframes pop { 0%{transform:scale(.97);opacity:.5} 100%{transform:scale(1);opacity:1} }
        @keyframes rise { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .num { font-family:'Saira', ui-sans-serif, sans-serif; font-variant-numeric: tabular-nums; }
        ::-webkit-scrollbar{ height:0; width:0; }
      `}</style>

      <div style={{ width:"100%", maxWidth:430, minHeight:"100vh", background:t.grad, position:"relative", paddingBottom:40, overflow:"hidden" }}>
        {/* ヘッダー */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px 6px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:t.accent, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Zap size={16} color={t.bg} strokeWidth={2.6}/>
            </div>
            <div style={{ fontWeight:900, fontSize:15 }}>ダメ計
              <span style={{ color:t.lo, fontWeight:700, fontSize:11, marginLeft:6 }}>Champions · ダブル</span></div>
          </div>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} style={btn(t)}>{theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}</button>
        </div>

        {/* ===== 2v2 盤面 ===== */}
        <div style={{ margin:"4px 16px 0", padding:"12px", borderRadius:18, background:t.panel, border:`1px solid ${t.border}` }}>
          <div style={{ fontSize:10, color:t.foe, fontWeight:800, letterSpacing:1, marginBottom:6 }}>あいて</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {["foeL","foeR"].map((sl) => (
              <FoeSlot key={sl} t={t} mon={P[slots[sl]]} tera={tera[sl]} focused={focusFoe === sl && move.target === "single"}
                inTarget={targetSlots.includes(sl)} res={results[sl]}
                onMon={() => setSheet(sl)} onFocus={() => setFocusFoe(sl)} />
            ))}
          </div>
          <div style={{ fontSize:10, color:t.accent, fontWeight:800, letterSpacing:1, margin:"10px 0 6px" }}>みかた</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {["allyA","allyB"].map((sl) => (
              <AllySlot key={sl} t={t} mon={P[slots[sl]]} tera={tera[sl]} active={sl === activeAtk}
                hitByAlly={move.target === "all" && sl === allyOther} res={sl === allyOther ? results[allyOther] : null}
                onMon={() => setSheet(sl)} onActivate={() => { setActiveAtk(sl); setMoveKey(P[slots[sl]].moves[0]); }} />
            ))}
          </div>
        </div>

        {/* ===== HERO: 確定数（複数対象） ===== */}
        <div key={pulse} style={{ margin:"10px 16px 0", padding:"16px 18px", borderRadius:20, background:t.panel, border:`1px solid ${t.border}`, position:"relative", overflow:"hidden", animation:"pop .26s ease" }}>
          {(() => {
            const r = results[primarySlot]; if (!r) return null;
            const kc = koColor[r.ko.kind];
            return (
              <div style={{ position:"relative" }}>
                <div style={{ position:"absolute", inset:-18, background:`radial-gradient(70% 110% at 0% 0%, ${kc}22, transparent 60%)` }}/>
                <div style={{ position:"relative" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:11, color:t.mid, fontWeight:700 }}>
                    <span style={{ ...moveTag(move) }}>{move.name}</span>
                    {isSpread && <span style={{ fontSize:10, color:t.lo, border:`1px solid ${t.border}`, borderRadius:6, padding:"1px 6px" }}>範囲 ×0.75</span>}
                    → {P[slots[primarySlot]].name}{r.isAlly && <span style={{ color:t.foe }}>（味方巻き込み）</span>}
                  </div>
                  <div className="num" style={{ fontSize:50, fontWeight:800, lineHeight:1, marginTop:6, color:kc, textShadow:`0 0 24px ${kc}55` }}>{r.ko.label}</div>
                  {r.ko.sub && <div style={{ fontSize:12.5, color:t.mid, fontWeight:600, marginTop:3 }}>{r.ko.sub}</div>}
                  <div style={{ display:"flex", alignItems:"baseline", gap:10, marginTop:12 }}>
                    <div className="num" style={{ fontSize:24, fontWeight:700 }}>{r.min}–{r.max}</div>
                    <div className="num" style={{ fontSize:13, color:t.mid, fontWeight:600 }}>{(r.min/r.maxHP*100).toFixed(1)}–{(r.max/r.maxHP*100).toFixed(1)}%</div>
                    <div style={{ marginLeft:"auto", ...mult(r.eff) }}>×{r.eff}</div>
                  </div>
                  <HPBar t={t} kc={kc} minPct={r.min/r.maxHP*100} maxPct={r.max/r.maxHP*100}/>
                  <div style={{ fontSize:10, color:t.lo, marginTop:5 }}>相手HP {r.maxHP} 基準</div>
                </div>
              </div>
            );
          })()}

          {/* 複数対象（範囲技） */}
          {others.length > 0 && (
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              {others.map((sl) => {
                const r = results[sl]; const kc = koColor[r.ko.kind];
                return (
                  <div key={sl} style={{ flex:1, padding:"10px 12px", borderRadius:13, background:t.panel2, border:`1px solid ${r.isAlly ? t.foe + "66" : t.border}` }}>
                    <div style={{ fontSize:10.5, color:r.isAlly ? t.foe : t.mid, fontWeight:700 }}>
                      {P[slots[sl]].name}{r.isAlly && " ⚠味方"}</div>
                    <div className="num" style={{ fontSize:19, fontWeight:800, color:kc, marginTop:2 }}>{r.ko.label}</div>
                    <div className="num" style={{ fontSize:11, color:t.mid }}>{(r.min/r.maxHP*100).toFixed(0)}–{(r.max/r.maxHP*100).toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 技チップ */}
        <div style={{ margin:"12px 16px 0" }}>
          <div style={{ fontSize:10.5, color:t.lo, fontWeight:700, marginBottom:7 }}>{atkMon.name} のわざ</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
            {atkMon.moves.map((mk) => {
              const on = mk === moveKey; const mv = M[mk];
              return (
                <button key={mk} onClick={() => setMoveKey(mk)} style={moveChip(t, mv, on)}>
                  {mv.name}
                  {mv.target !== "single" && <span style={{ fontSize:9, opacity:.8 }}>※範囲</span>}
                </button>
              );
            })}
          </div>
          {move.target === "single" && (
            <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:9 }}>
              <Target size={13} color={t.mid}/>
              <span style={{ fontSize:11, color:t.mid, fontWeight:600 }}>対象:</span>
              {["foeL","foeR"].map((sl) => (
                <button key={sl} onClick={() => setFocusFoe(sl)} style={segBtn(t, focusFoe === sl)}>{P[slots[sl]].name}</button>
              ))}
            </div>
          )}
        </div>

        {/* ===== 合算KO（切り替え不要・2体同時） ===== */}
        <div style={{ margin:"14px 16px 0", padding:"12px 14px", borderRadius:16, background:t.panel, border:`1px solid ${t.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
            <Layers size={15} color={t.accent}/>
            <span style={{ fontWeight:800, fontSize:13 }}>合算KO</span>
            <span style={{ fontSize:10.5, color:t.lo, marginLeft:2 }}>この相手を2体で落とす</span>
            <div style={{ display:"flex", gap:5, marginLeft:"auto" }}>
              {["foeL","foeR"].map((sl) => (
                <button key={sl} onClick={() => setFocusFoe(sl)} style={segBtn(t, focusFoe === sl)}>{P[slots[sl]].name}</button>
              ))}
            </div>
          </div>

          {["allyA","allyB"].map((sl) => {
            const c = contrib(sl); const sel = effMv(sl);
            return (
              <div key={sl} style={{ padding:"8px 0", borderTop:`1px solid ${t.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                  <span style={{ fontSize:9, fontWeight:800, color:t.bg, background:t.accent, borderRadius:5, padding:"1px 5px" }}>
                    {sl === "allyA" ? "味方A" : "味方B"}</span>
                  <span style={{ fontWeight:800, fontSize:13 }}>{P[slots[sl]].name}</span>
                  {c && <span className="num" style={{ marginLeft:"auto", fontSize:13, fontWeight:800, color: koColor[c.ko.kind] || t.hi }}>
                    {c.min}–{c.max} <span style={{ fontSize:10, color:t.mid }}>({c.ko.label})</span></span>}
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  <button onClick={() => setComboMv((p) => ({ ...p, [sl]:"none" }))} style={miniChip(t, sel === "none")}>打たない</button>
                  {P[slots[sl]].moves.map((mk) => (
                    <button key={mk} onClick={() => setComboMv((p) => ({ ...p, [sl]:mk }))} style={miniMove(t, M[mk], sel === mk)}>
                      {M[mk].name}{M[mk].target !== "single" && <span style={{ fontSize:8, opacity:.8 }}>※範囲</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <div style={{ display:"flex", alignItems:"baseline", gap:8, marginTop:8, paddingTop:9, borderTop:`1px solid ${t.border}` }}>
            <span style={{ fontSize:11, color:t.mid, fontWeight:700 }}>合計 → {P[slots[focusFoe]].name}</span>
            <span className="num" style={{ fontSize:21, fontWeight:800 }}>{comboMin}–{comboMax}</span>
            <span className="num" style={{ fontSize:11, color:t.mid }}>HP {comboHP}</span>
            <span className="num" style={{ fontSize:16, fontWeight:800, marginLeft:"auto",
              color: comboParts.length === 0 ? t.lo : comboMin >= comboHP ? koColor.ohko : comboMax >= comboHP ? koColor.roll1 : t.mid }}>
              {comboParts.length === 0 ? "—" : comboMin >= comboHP ? "確定で落ちる" : comboMax >= comboHP ? "乱数で落ちる" : "落ちない"}</span>
          </div>
        </div>

        {/* ===== 攻撃側の詳細 / ダブル補正 ===== */}
        <div style={{ margin:"12px 16px 0", padding:"12px 14px", borderRadius:16, background:t.panel, border:`1px solid ${t.border}` }}>
          <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
            <ToggleChip t={t} label="てだすけ ×1.5" on={atkProf.hh} onClick={() => setAtk("hh", !atkProf.hh)}/>
            <ToggleChip t={t} label="いかく被(-1)" on={atkProf.intim} onClick={() => setAtk("intim", !atkProf.intim)}/>
            <TeraChip t={t} tera={tera[activeAtk]} onToggle={() => setTera((p) => ({ ...p, [activeAtk]:{ ...p[activeAtk], on:!p[activeAtk].on } }))}/>
          </div>
          {tera[activeAtk].on && <TeraTypeRow t={t} sel={tera[activeAtk].type} onSel={(ty) => setTera((p) => ({ ...p, [activeAtk]:{ on:true, type:ty } }))}/>}
          <Expander t={t} open={detail === "atk"} onClick={() => setDetail(detail === "atk" ? null : "atk")} label="攻撃側 詳細（能力P・性格・ランク・道具）">
            <Stepper t={t} label={(move.cat === "phys" ? "こうげき" : "とくこう") + " 能力P"} value={atkProf.sp} min={0} max={32} step={4} onChange={(v) => setAtk("sp", v)}/>
            <NatureRow t={t} value={atkProf.nature} onChange={(v) => setAtk("nature", v)}/>
            <Stepper t={t} label="ランク補正" value={atkProf.stage} min={-6} max={6} step={1} signed onChange={(v) => setAtk("stage", v)}/>
            <ChoiceRow t={t} label="もちもの" value={atkProf.item} opts={[["none","なし"],["band","こだわり ×1.5"],["tama","いのちのたま ×1.3"]]} onChange={(v) => setAtk("item", v)}/>
          </Expander>
        </div>

        {/* ===== 対象(focus)の防御詳細 ===== */}
        {defProfs[primarySlot] && (
          <div style={{ margin:"12px 16px 0", padding:"12px 14px", borderRadius:16, background:t.panel, border:`1px solid ${t.border}` }}>
            <div style={{ fontSize:10.5, color:t.foe, fontWeight:700, marginBottom:8 }}>対象 {P[slots[primarySlot]].name} の耐久</div>
            <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:4 }}>
              <TeraChip t={t} tera={tera[primarySlot]} onToggle={() => setTera((p) => ({ ...p, [primarySlot]:{ ...p[primarySlot], on:!p[primarySlot].on } }))}/>
              <ToggleChip t={t} label="フレンドガード ×0.75" on={defProfs[primarySlot].fg} onClick={() => upd(setDefProfs, primarySlot, "fg", !defProfs[primarySlot].fg)}/>
              <ToggleChip t={t} label="壁" on={defProfs[primarySlot].screen} onClick={() => upd(setDefProfs, primarySlot, "screen", !defProfs[primarySlot].screen)}/>
            </div>
            {tera[primarySlot].on && <TeraTypeRow t={t} sel={tera[primarySlot].type} onSel={(ty) => setTera((p) => ({ ...p, [primarySlot]:{ on:true, type:ty } }))}/>}
            <Expander t={t} open={detail === "def"} onClick={() => setDetail(detail === "def" ? null : "def")} label="耐久 詳細（HP・防御・性格・チョッキ）">
              <Stepper t={t} label="HP 能力P" value={defProfs[primarySlot].hpSP} min={0} max={32} step={4} onChange={(v) => upd(setDefProfs, primarySlot, "hpSP", v)}/>
              <Stepper t={t} label={(move.cat === "phys" ? "ぼうぎょ" : "とくぼう") + " 能力P"} value={defProfs[primarySlot].defSP} min={0} max={32} step={4} onChange={(v) => upd(setDefProfs, primarySlot, "defSP", v)}/>
              <NatureRow t={t} value={defProfs[primarySlot].nature} onChange={(v) => upd(setDefProfs, primarySlot, "nature", v)}/>
              <ChoiceRow t={t} label="もちもの" value={defProfs[primarySlot].vest ? "vest" : "none"} opts={[["none","なし"],["vest","とつげきチョッキ"]]} onChange={(v) => upd(setDefProfs, primarySlot, "vest", v === "vest")}/>
            </Expander>
          </div>
        )}

        {/* フィールド */}
        <div style={{ margin:"12px 16px 0", padding:"12px 14px", borderRadius:16, background:t.panel, border:`1px solid ${t.border}` }}>
          <div style={{ fontSize:10.5, color:t.lo, fontWeight:700, marginBottom:8 }}>フィールド状態</div>
          <ChoiceRow t={t} label="てんき" value={weather} opts={[["none","なし"],["sun","ひざしつよい"],["rain","あめ"]]} onChange={setWeather}/>
          <ChoiceRow t={t} label="フィールド" value={terrain} opts={[["none","なし"],["electric","エレキ"],["grassy","グラス"],["psychic","サイコ"]]} onChange={setTerrain}/>
        </div>

        <div style={{ textAlign:"center", color:t.lo, fontSize:10, marginTop:18, padding:"0 24px" }}>
          ダブル主軸ワイヤーフレーム · 範囲技は両対象+味方巻き込みを同時表示 / 合算KO / ダブル補正適用
        </div>

        {/* 検索シート */}
        {sheet && (
          <div style={{ position:"absolute", inset:0, zIndex:30, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
            <div onClick={() => { setSheet(null); setQ(""); }} style={{ position:"absolute", inset:0, background:"#000a", animation:"fade .2s" }}/>
            <div style={{ position:"relative", background:t.panel, borderTopLeftRadius:22, borderTopRightRadius:22, border:`1px solid ${t.border}`, maxHeight:"82%", display:"flex", flexDirection:"column", animation:"sheetUp .28s cubic-bezier(.2,.8,.2,1)" }}>
              <div style={{ padding:"14px 16px 8px", display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ fontWeight:800, fontSize:14 }}>{sheet.startsWith("foe") ? "あいて" : "みかた"} ポケモン</div>
                <button onClick={() => { setSheet(null); setQ(""); }} style={{ ...btn(t), marginLeft:"auto" }}><X size={17}/></button>
              </div>
              <div style={{ padding:"0 16px 10px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, background:t.panel2, border:`1px solid ${t.border}`, borderRadius:12, padding:"10px 12px" }}>
                  <Search size={16} color={t.mid}/>
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="名前・タイプで検索" style={{ border:"none", outline:"none", background:"transparent", color:t.hi, fontSize:14, width:"100%", fontFamily:"inherit" }}/>
                </div>
              </div>
              <div style={{ overflowY:"auto", padding:"0 10px 20px" }}>
                {monList.map((p, i) => (
                  <button key={p.name} onClick={() => pickMon(p.name)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 12px", background:"transparent", border:"none", borderRadius:12, cursor:"pointer", color:t.hi, animation:`rise .25s ease ${i*0.02}s both` }}>
                    <span style={{ fontWeight:700, fontSize:14 }}>{p.name}</span>
                    <span style={{ display:"flex", gap:5, marginLeft:"auto" }}>{p.types.map((ty) => <TypePill key={ty} ty={ty}/>)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------- helpers --------- */
function upd(setter, slot, key, val) { setter((p) => ({ ...p, [slot]: { ...p[slot], [key]: val } })); }

function FoeSlot({ t, mon, tera, focused, inTarget, res, onMon, onFocus }) {
  const kc = res ? koColor[res.ko.kind] : t.lo;
  return (
    <div onClick={onFocus} style={{ borderRadius:13, padding:"9px 10px", cursor:"pointer",
      background: inTarget ? t.panel2 : t.chip, border:`1px solid ${focused ? t.foe : inTarget ? t.foe + "55" : t.border}` }}>
      <button onClick={(e) => { e.stopPropagation(); onMon(); }} style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none", padding:0, cursor:"pointer", color:t.hi, width:"100%" }}>
        <span style={{ fontWeight:800, fontSize:13.5 }}>{mon.name}</span>
        <ChevronDown size={13} color={t.mid} style={{ marginLeft:"auto" }}/>
      </button>
      <div style={{ display:"flex", gap:4, marginTop:4 }}>{(tera.on ? [tera.type] : mon.types).map((ty) => <TypePill key={ty} ty={ty} sm/>)}</div>
      {res && <div className="num" style={{ fontSize:13, fontWeight:800, color:kc, marginTop:5 }}>{res.ko.label}
        <span style={{ fontSize:10, color:t.mid, fontWeight:600 }}> {(res.min/res.maxHP*100).toFixed(0)}–{(res.max/res.maxHP*100).toFixed(0)}%</span></div>}
    </div>
  );
}
function AllySlot({ t, mon, tera, active, hitByAlly, res, onMon, onActivate }) {
  return (
    <div onClick={onActivate} style={{ borderRadius:13, padding:"9px 10px", cursor:"pointer", background: active ? t.panel2 : t.chip,
      border:`1px solid ${active ? t.accent : hitByAlly ? t.foe + "66" : t.border}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
        {active && <span style={{ fontSize:8.5, fontWeight:800, color:t.bg, background:t.accent, borderRadius:5, padding:"1px 5px" }}>攻撃</span>}
        <span style={{ fontWeight:800, fontSize:13.5 }}>{mon.name}</span>
        <button onClick={(e) => { e.stopPropagation(); onMon(); }} style={{ marginLeft:"auto", background:"none", border:"none", padding:0, cursor:"pointer", color:t.mid, display:"flex" }}><ChevronDown size={13}/></button>
      </div>
      <div style={{ display:"flex", gap:4, marginTop:4 }}>{(tera.on ? [tera.type] : mon.types).map((ty) => <TypePill key={ty} ty={ty} sm/>)}</div>
      {hitByAlly && res ? <div className="num" style={{ fontSize:12, fontWeight:800, color:t.foe, marginTop:5 }}>⚠{res.ko.label} <span style={{ fontSize:10, fontWeight:600 }}>{(res.max/res.maxHP*100).toFixed(0)}%</span></div>
        : !active && <div style={{ fontSize:9.5, color:t.lo, marginTop:5 }}>タップで攻撃役に</div>}
    </div>
  );
}
function HPBar({ t, kc, minPct, maxPct }) {
  return (
    <div style={{ marginTop:9, height:11, borderRadius:6, background:t.panel2, border:`1px solid ${t.border}`, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", left:0, top:0, bottom:0, borderRadius:6, width:`${Math.min(100, maxPct)}%`, background:`${kc}55`, transition:"width .25s" }}/>
      <div style={{ position:"absolute", left:0, top:0, bottom:0, borderRadius:6, width:`${Math.min(100, minPct)}%`, background:kc, transition:"width .25s" }}/>
    </div>
  );
}
function TeraChip({ t, tera, onToggle }) {
  return (
    <button onClick={onToggle} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 10px", borderRadius:10, fontSize:11.5, fontWeight:800, cursor:"pointer",
      border:`1px solid ${tera.on ? TYPES[tera.type] : t.border}`, background:tera.on ? TYPES[tera.type] + "22" : "transparent", color:tera.on ? TYPES[tera.type] : t.mid }}>
      <span style={{ width:8, height:8, borderRadius:2, transform:"rotate(45deg)", background:tera.on ? TYPES[tera.type] : t.lo }}/>
      テラス {tera.on ? "ON" : "OFF"}
    </button>
  );
}
function TeraTypeRow({ t, sel, onSel }) {
  return (
    <div style={{ display:"flex", gap:5, overflowX:"auto", marginTop:8, paddingBottom:2 }}>
      {TERA_TYPES.map((ty) => (
        <button key={ty} onClick={() => onSel(ty)} style={{ flex:"0 0 auto", padding:"5px 9px", borderRadius:9, fontSize:11, fontWeight:700, cursor:"pointer",
          border:`1px solid ${sel === ty ? TYPES[ty] : t.border}`, background:sel === ty ? TYPES[ty] : "transparent", color:sel === ty ? "#0a0e16" : t.mid }}>{ty}</button>
      ))}
    </div>
  );
}
function ToggleChip({ t, label, on, onClick }) {
  return <button onClick={onClick} style={{ padding:"6px 10px", borderRadius:10, fontSize:11.5, fontWeight:700, cursor:"pointer",
    border:`1px solid ${on ? t.accent : t.border}`, background:on ? t.accent : "transparent", color:on ? "#0a0e16" : t.mid }}>{label}</button>;
}
function Expander({ t, open, onClick, label, children }) {
  return (
    <div style={{ marginTop:10 }}>
      <button onClick={onClick} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", color:t.mid, fontSize:11.5, fontWeight:700, cursor:"pointer", padding:"4px 0", fontFamily:"inherit" }}>
        {label}<ChevronDown size={14} style={{ transform:open ? "rotate(180deg)" : "none", transition:".2s" }}/>
      </button>
      {open && <div style={{ display:"flex", flexDirection:"column", gap:9, marginTop:8, animation:"rise .2s ease" }}>{children}</div>}
    </div>
  );
}
function Stepper({ t, label, value, min, max, step, onChange, signed }) {
  const disp = signed && value > 0 ? `+${value}` : `${value}`;
  return (
    <div style={rowStyle}>
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
  return (
    <div style={rowStyle}>
      <span style={{ fontSize:12.5, color:t.mid, fontWeight:600 }}>性格補正</span>
      <div style={{ display:"flex", gap:5, marginLeft:"auto" }}>
        {[[0.9,"↓"],[1.0,"無"],[1.1,"↑"]].map(([v, l]) => <button key={v} onClick={() => onChange(v)} style={segBtn(t, value === v)}>{l} {v.toFixed(1)}</button>)}
      </div>
    </div>
  );
}
function ChoiceRow({ t, label, value, opts, onChange }) {
  return (
    <div style={{ ...rowStyle, flexWrap:"wrap", rowGap:8 }}>
      <span style={{ fontSize:12.5, color:t.mid, fontWeight:600 }}>{label}</span>
      <div style={{ display:"flex", gap:5, marginLeft:"auto", flexWrap:"wrap", justifyContent:"flex-end" }}>
        {opts.map(([v, l]) => <button key={v} onClick={() => onChange(v)} style={segBtn(t, value === v)}>{l}</button>)}
      </div>
    </div>
  );
}
function TypePill({ ty, sm }) {
  return <span style={{ fontSize: sm ? 9 : 10, fontWeight:800, color:"#0a0e16", background:TYPES[ty], padding: sm ? "2px 5px" : "3px 7px", borderRadius:6 }}>{ty}</span>;
}

const btn = (t) => ({ background:t.chip, border:`1px solid ${t.border}`, borderRadius:10, color:t.hi, padding:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" });
const stepBtn = (t) => ({ width:30, height:30, borderRadius:9, background:t.chip, border:`1px solid ${t.border}`, color:t.hi, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" });
const segBtn = (t, on) => ({ padding:"6px 10px", borderRadius:9, fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", border:`1px solid ${on ? t.accent : t.border}`, background:on ? t.accent : "transparent", color:on ? "#0a0e16" : t.mid });
const rowStyle = { display:"flex", alignItems:"center", padding:"6px 2px" };
const moveChip = (t, m, on) => ({ display:"flex", alignItems:"center", gap:5, padding:"8px 11px", borderRadius:11, fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", border:`1px solid ${on ? TYPES[m.type] : t.border}`, background:on ? TYPES[m.type] + "26" : "transparent", color:on ? TYPES[m.type] : t.mid });
const moveTag = (m) => ({ fontSize:10.5, fontWeight:800, color:"#0a0e16", background:TYPES[m.type], padding:"2px 7px", borderRadius:6 });
const miniChip = (t, on) => ({ padding:"5px 9px", borderRadius:9, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", border:`1px solid ${on ? t.accent : t.border}`, background:on ? t.accent : "transparent", color:on ? "#0a0e16" : t.mid });
const miniMove = (t, m, on) => ({ display:"flex", alignItems:"center", gap:3, padding:"5px 9px", borderRadius:9, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", border:`1px solid ${on ? TYPES[m.type] : t.border}`, background:on ? TYPES[m.type] + "26" : "transparent", color:on ? TYPES[m.type] : t.mid });
function mult(eff) {
  const c = eff === 0 ? "#5a6678" : eff > 1 ? "#ff5a45" : eff < 1 ? "#5ad1e6" : "#93a0b4";
  return { fontSize:13, fontWeight:800, color:c, fontFamily:"'Saira', sans-serif", border:`1px solid ${c}55`, padding:"2px 8px", borderRadius:8 };
}
