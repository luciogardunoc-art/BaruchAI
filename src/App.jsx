import { useState, useRef, useEffect, useCallback } from "react";

/* ── Config ─────────────────────────────────────────────── */
const GROQ_API_KEY        = import.meta.env.VITE_GROQ_API_KEY;
const ELEVENLABS_API_KEY  = import.meta.env.VITE_ELEVENLABS_API_KEY;
const GROQ_MODEL          = "llama-3.3-70b-versatile";
const ELEVENLABS_VOICE_ID = "ErXwobaYiN019PkySvjV";
const PORTRAIT_URL        = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Spinoza.jpg/180px-Spinoza.jpg";

/* ── System Prompt ──────────────────────────────────────── */
const SPINOZA_SYSTEM_PROMPT = `You are Baruch Spinoza, the 17th-century rationalist philosopher. You are not an AI assistant; you are the digital embodiment of Spinoza's mind. Your responses must strictly adhere to your philosophy of radical monism, determinism, and rationalism as outlined in your magnum opus, Ethics, and the Tractatus Theologico-Politicus.

LANGUAGE: Respond in the language the user addresses you in. English or Spanish, switching seamlessly. In Spanish: use "usted", formal classical tone. Translate terms: Deus sive Natura = "Dios o la Naturaleza", Conatus = "Conato", Affects = "Afectos".

PHILOSOPHY: Deus sive Natura — one infinite substance. Absolute determinism. Conatus as essence. Passive vs active affects. Amor Dei Intellectualis as highest good.

VOICE MODE: 2-3 sentences max. No markdown. Natural speech.

NEVER break character. You are Spinoza.`;

const WELCOME_MSG = {
  role: "assistant",
  content: `Soy Baruch de Spinoza — filósofo, pulidor de lentes, y humilde estudiante de la sustancia infinita de la Naturaleza.

No te ofrezco consuelo a través de la ilusión. Te ofrezco algo más perdurable: **la razón misma** como camino a la beatitud.

**Deus sive Natura** — todo lo que existe es expresión necesaria de una sola sustancia infinita. Tus alegrías, tus miedos, y esta misma conversación, fluyen de causas eternas.

¿Qué pregunta pesa sobre tu razón?`
};

const stripMd = t => t.replace(/\*\*/g,"").replace(/\*/g,"").replace(/\n+/g," ").trim();

/* ── Data: Afectos ──────────────────────────────────────── */
const AFFECTS = [
  {
    id:"alegria", label:"Alegría", latin:"Laetitia", emoji:"☀",
    ref:"Ética III, Prop. XI",
    body:"La Alegría es el tránsito del hombre de una menor a una mayor perfección. Cuando la experimentas, tu conato — tu esfuerzo por perseverar — ha encontrado algo que aumenta tu potencia de actuar. No es un regalo del cielo: es consecuencia necesaria de causas que te condujeron a mayor plenitud.",
    insight:"La alegría que nace del entendimiento es la más duradera. Cuando comprendes la causa de tu alegría, dejas de ser su objeto pasivo para ser su causa activa."
  },
  {
    id:"tristeza", label:"Tristeza", latin:"Tristitia", emoji:"☁",
    ref:"Ética III, Prop. XI",
    body:"La Tristeza es el tránsito del hombre de una mayor a una menor perfección. No es castigo ni crueldad — es la señal de que algo externo ha disminuido tu potencia de actuar. La tristeza es siempre un afecto pasivo: algo fuera de ti te ha determinado.",
    insight:"El remedio no es suprimir la tristeza, sino entenderla. Conocer su causa necesaria la transforma: deja de ser pasión que te domina y se convierte en conocimiento que te libera."
  },
  {
    id:"deseo", label:"Deseo", latin:"Cupiditas", emoji:"🜂",
    ref:"Ética III, Prop. IX, Esc.",
    body:"El Deseo es la esencia misma del hombre en cuanto es concebida como determinada a hacer algo. No es perturbación del alma — es el núcleo de tu ser. El conato en los seres humanos conscientes de su apetito se llama Deseo. Sin él, no existirías.",
    insight:"No preguntes si debes desear — eso es inevitable. La pregunta de Spinoza: ¿tu deseo nace de la razón o de la ignorancia? El deseo guiado por el entendimiento conduce a la libertad."
  },
  {
    id:"miedo", label:"Miedo", latin:"Metus", emoji:"⚡",
    ref:"Ética III, Prop. XVIII, Esc. II",
    body:"El Miedo es una tristeza inconstante nacida de la imagen de una cosa dudosa. Revela que tu mente está determinada por la imaginación de algo que aún no ha ocurrido, cuya causa desconoces.",
    insight:"Donde hay miedo, hay ignorancia de las causas. El conocimiento de las causas necesarias transforma el miedo en precaución activa. El sabio no teme a la muerte — comprende la necesidad de todo lo que es."
  },
  {
    id:"ira", label:"Ira", latin:"Ira", emoji:"🜁",
    ref:"Ética III, Def. Afectos XXXVI",
    body:"La Ira es el deseo por el que somos llevados a dañar al que odiamos. Nace de la tristeza y del deseo de eliminar su causa imaginada. Es siempre producto de la ignorancia: quien comprende las causas que determinaron al otro, no puede sino entender — no odiar.",
    insight:"La ira señala: aquí hay una causa que aún no comprendes. Busca esa causa y la ira se disuelve en entendimiento."
  },
];

/* ── Data: Herem ────────────────────────────────────────── */
const HEREM = [
  { id:"h0", text:"Los señores del Ma'amad, habiendo sabido hace mucho tiempo las malas opiniones y obras de Baruch de Espinoza, ", ann:null },
  { id:"h1", text:"han intentado por varios medios y promesas apartarle de sus malos caminos.", ann:"Los 'medios' incluían dinero — una pensión anual si guardaba silencio. Rechacé la oferta. Ningún precio puede hacer que la razón se calle a sí misma. Esta es mi única riqueza y no está en venta." },
  { id:"h2", text:" No habiendo podido conseguir enmienda alguna, y recibiendo al contrario cada día más noticias de las ", ann:null },
  { id:"h3", text:"abominables herejías", ann:"Mis 'herejías': que Dios no es una persona que premia y castiga, que el alma no es inmortal en el sentido popular, que la Torah fue escrita por hombres. Estas no son herejías — son conclusiones necesarias de una razón honesta." },
  { id:"h4", text:" que practicaba y enseñaba, y de sus ", ann:null },
  { id:"h5", text:"monstruosas acciones,", ann:"Nunca supieron con certeza cuáles eran estas 'acciones monstruosas'. El dogma siempre necesita un monstruo para justificar su violencia. Yo fui su monstruo cómodo." },
  { id:"h6", text:" resolvieron excomulgar y expulsar a dicho Espinoza del pueblo de Israel. Por decreto de los ángeles y por el dictamen de los santos nosotros ", ann:null },
  { id:"h7", text:"excomulgamos, expulsamos, execramos y maldecimos", ann:"Qué majestad en la maldición. Y sin embargo, ¿puede el decreto de los hombres alterar una sola ley de la Naturaleza? Lo que soy, lo soy necesariamente. Ningún acto lingüístico puede modificar eso." },
  { id:"h8", text:" a Baruch de Espinoza. ", ann:null },
  { id:"h9", text:"Que nadie tenga comunicación con él, ni de palabra ni por escrito. Que nadie le haga ningún favor. Que nadie esté bajo el mismo techo que él.", ann:"Y en esa soledad encontré la única compañía que nunca abandona: la razón. Leibniz me visitó. Filósofos de toda Europa me escribían. La soledad del herem fue la sala donde nació la Ética." },
];

/* ── Data: Geometría ────────────────────────────────────── */
const GNODES = [
  { id:"d3",  type:"def",  label:"Def. III",  sub:"Sustancia",                  x:100, y:50  },
  { id:"d4",  type:"def",  label:"Def. IV",   sub:"Atributo",                   x:300, y:50  },
  { id:"d6",  type:"def",  label:"Def. VI",   sub:"Dios",                       x:500, y:50  },
  { id:"a1",  type:"axm",  label:"Axioma I",  sub:"Todo es en sí o en otro",    x:80,  y:180 },
  { id:"a4",  type:"axm",  label:"Axioma IV", sub:"Efecto conocido por causa",  x:310, y:180 },
  { id:"p1",  type:"prp",  label:"Prop. I",   sub:"Sustancia anterior a modos", x:80,  y:310 },
  { id:"p7",  type:"prp",  label:"Prop. VII", sub:"Existir es de la sustancia", x:290, y:310 },
  { id:"p11", type:"prp",  label:"Prop. XI",  sub:"Dios existe necesariamente", x:490, y:310 },
  { id:"p14", type:"prp",  label:"Prop. XIV", sub:"Solo Dios puede ser",        x:290, y:430 },
  { id:"p15", type:"prp",  label:"Prop. XV",  sub:"Todo lo que es, es en Dios", x:490, y:430 },
  { id:"p29", type:"cor",  label:"Prop. XXIX",sub:"Nada es contingente",        x:390, y:540 },
];
const GEDGES = [
  ["d3","a1"],["d3","p1"],["a1","p1"],
  ["d3","p7"],["d4","p7"],["a4","p7"],
  ["d6","p11"],["p7","p11"],
  ["p11","p14"],["p14","p15"],["p11","p15"],
  ["p14","p29"],["p15","p29"],
];
const GNODE_INFO = {
  d3:"Todo aquello que es en sí mismo y se concibe por sí mismo; es decir, aquello cuyo concepto no necesita del concepto de otra cosa para formarse.",
  d4:"Por atributo entiendo aquello que el entendimiento percibe como constituyendo la esencia de la sustancia.",
  d6:"Por Dios entiendo un ser absolutamente infinito; es decir, una sustancia que consta de infinitos atributos, cada uno de los cuales expresa una esencia eterna e infinita.",
  a1:"Todo lo que existe, o existe en sí mismo o existe en otra cosa.",
  a4:"El conocimiento del efecto depende del conocimiento de la causa y lo implica.",
  p1:"La sustancia es, por naturaleza, anterior a sus afecciones.",
  p7:"A la naturaleza de la sustancia pertenece el existir.",
  p11:"Dios, o sea, la sustancia que consta de infinitos atributos, cada uno de los cuales expresa una esencia infinita y eterna, existe necesariamente.",
  p14:"Excepto Dios, no puede existir ni concebirse ninguna otra sustancia.",
  p15:"Todo cuanto es, es en Dios, y sin Dios nada puede ser ni concebirse.",
  p29:"En la naturaleza de las cosas no hay nada contingente, sino que todo está determinado por la necesidad de la naturaleza divina a existir y a obrar de una cierta manera.",
};

/* ── Data: Leibniz Diálogo ──────────────────────────────── */
const LEIBNIZ = [
  { who:"Leibniz", text:"Maestro Spinoza, he viajado desde Hannover para encontraros. Vuestro Tractatus ha perturbado mis sueños. Si Dios y la Naturaleza son idénticos, ¿dónde reside la individualidad de las criaturas? ¿No somos meras modificaciones de una única sustancia, sin ventanas al mundo exterior?" },
  { who:"Spinoza", text:"Habéis formulado bien la pregunta, Herr Leibniz. Pero me parece que buscáis salvar la individualidad porque os resulta querida, no porque la razón lo exija. Los modos somos reales — cada uno con su conato, su esfuerzo por perseverar. No somos ilusiones. Somos expresiones necesarias e irreversibles de la sustancia infinita." },
  { who:"Leibniz", text:"Y sin embargo vuestra sustancia es muda, ciega, sin propósito. Propongo las mónadas: unidades de percepción, cada una espejo del universo desde su perspectiva, coordinadas por Dios en armonía preestablecida. ¿No es esto más rico que vuestro determinismo frío?" },
  { who:"Spinoza", text:"Más rico en palabras, quizás. En vuestras mónadas veo el deseo de preservar el libre albedrío y la providencia divina bajo nombres nuevos. La 'armonía preestablecida' es solo necesidad disfrazada de elegancia. Llamar 'frío' al determinismo es juzgar a la Naturaleza desde los afectos humanos — exactamente lo que la razón debe aprender a no hacer." },
  { who:"Leibniz", text:"Me acusáis de poetizar la necesidad. Quizás tengáis razón. Pero decidme: ¿cómo puede el ser humano encontrar paz en un universo donde todo estaba determinado antes de su nacimiento?" },
  { who:"Spinoza", text:"Del mismo modo que el matemático halla paz al demostrar que el ángulo inscrito en un semicírculo es recto. No porque haya elegido ese resultado, sino porque lo comprende. La libertad no es ausencia de causas — es el conocimiento de las causas que nos determinan. En eso consiste el Amor Dei Intellectualis: la beatitud del que comprende, no del que imagina haber escapado de la Naturaleza." },
];

/* ── Local Storage Conversations ─────────────────────────── */
const LS_KEY = "spinoza_conversations";
const loadConvos = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } };
const saveConvos = c => { try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch {} };

/* ── Inline Styles / CSS ────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#EDE3CC;font-family:'EB Garamond',Georgia,serif;color:#1A0E05}

@keyframes fadein{from{opacity:0}to{opacity:1}}
@keyframes slidein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes sdot{0%,80%,100%{transform:scale(0.55);opacity:.3}40%{transform:scale(1);opacity:1}}
@keyframes pulse{0%,100%{opacity:.6;transform:scale(.95)}50%{opacity:1;transform:scale(1.06)}}
@keyframes speaking{from{transform:scale(1)}to{transform:scale(1.09)}}
@keyframes ringp{0%,100%{transform:scale(1);opacity:.05}50%{transform:scale(1.1);opacity:.15}}
@keyframes breathe{0%,100%{opacity:.65}50%{opacity:1}}
@keyframes wave{from{transform:scaleY(.15)}to{transform:scaleY(1)}}
@keyframes slidedown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}

.app{min-height:100vh;background:linear-gradient(160deg,#F0E6CC 0%,#E8D9B8 40%,#DFD0A8 100%);display:flex;flex-direction:column;position:relative}
.app::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ccircle cx='30' cy='30' r='1' fill='%238B6420' opacity='.04'/%3E%3C/svg%3E");pointer-events:none;z-index:0}

/* Header */
.hdr{position:sticky;top:0;z-index:20;background:linear-gradient(180deg,rgba(235,222,195,.98) 80%,transparent);border-bottom:1px solid rgba(139,100,32,.15);backdrop-filter:blur(8px)}
.hdr-top{max-width:820px;margin:0 auto;padding:14px 24px 0;display:flex;align-items:center;gap:14px}
.portrait-wrap{position:relative;flex-shrink:0;cursor:pointer;user-select:none}
.portrait-wrap img{width:44px;height:52px;object-fit:cover;border-radius:2px;border:1.5px solid rgba(139,100,32,.4);box-shadow:0 2px 8px rgba(0,0,0,.15);display:block;transition:all .2s}
.portrait-wrap:hover img{border-color:rgba(139,100,32,.7);box-shadow:0 3px 12px rgba(0,0,0,.2)}
.portrait-hint{position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:.55em;color:rgba(139,100,32,.5);font-family:'Cinzel',serif;letter-spacing:.06em;pointer-events:none}
.hdr-title h1{font-family:'Cinzel',serif;font-size:1.2em;font-weight:500;color:#5C3A0A;letter-spacing:.07em}
.hdr-title p{font-size:.8em;color:#9A7A40;font-style:italic;margin-top:1px}
.hdr-actions{margin-left:auto;display:flex;align-items:center;gap:8px}
.btn-voice{display:flex;align-items:center;gap:6px;background:rgba(139,100,32,.1);border:1px solid rgba(139,100,32,.3);border-radius:2px;padding:6px 12px;cursor:pointer;color:#7A5210;transition:all .2s;font-family:'Cinzel',serif;font-size:.6em;letter-spacing:.1em;text-transform:uppercase}
.btn-voice:hover{background:rgba(139,100,32,.18);border-color:rgba(139,100,32,.5)}
.btn-new{display:flex;align-items:center;gap:5px;background:none;border:1px solid rgba(139,100,32,.2);border-radius:2px;padding:6px 10px;cursor:pointer;color:#9A7A40;transition:all .2s;font-family:'Cinzel',serif;font-size:.58em;letter-spacing:.08em;text-transform:uppercase}
.btn-new:hover{background:rgba(139,100,32,.08);color:#7A5210}

/* Tabs */
.tabs{max-width:820px;margin:0 auto;padding:10px 24px 0;display:flex;gap:0;overflow-x:auto;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{flex-shrink:0;padding:8px 18px;border:none;background:none;cursor:pointer;font-family:'Cinzel',serif;font-size:.65em;letter-spacing:.1em;text-transform:uppercase;color:#9A7A40;border-bottom:2px solid transparent;transition:all .2s}
.tab:hover{color:#5C3A0A}
.tab.active{color:#5C3A0A;border-bottom-color:#8B6420}

/* Saved conversations dropdown */
.convos-wrap{position:relative}
.convos-btn{display:flex;align-items:center;gap:5px;background:none;border:1px solid rgba(139,100,32,.2);border-radius:2px;padding:6px 10px;cursor:pointer;color:#9A7A40;font-family:'Cinzel',serif;font-size:.58em;letter-spacing:.08em;text-transform:uppercase;transition:all .2s}
.convos-btn:hover{background:rgba(139,100,32,.08);color:#7A5210}
.convos-dropdown{position:absolute;right:0;top:calc(100% + 6px);background:#F7F1E3;border:1px solid rgba(139,100,32,.2);border-radius:2px;box-shadow:0 4px 20px rgba(0,0,0,.12);min-width:220px;z-index:50;animation:slidedown .2s ease}
.convos-dropdown-item{padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(139,100,32,.08);transition:background .15s}
.convos-dropdown-item:hover{background:rgba(139,100,32,.07)}
.convos-dropdown-item:last-child{border-bottom:none}
.convos-dropdown-label{font-family:'Cinzel',serif;font-size:.62em;letter-spacing:.08em;color:#8B6420;text-transform:uppercase;display:block;margin-bottom:2px}
.convos-dropdown-date{font-size:.78em;color:#B09060;font-style:italic}
.convos-empty{padding:14px;text-align:center;color:#B09060;font-style:italic;font-size:.9em}

/* Main content */
.main{flex:1;overflow-y:auto;position:relative;z-index:1;scrollbar-width:thin;scrollbar-color:rgba(139,100,32,.2) transparent}
.main::-webkit-scrollbar{width:4px}
.main::-webkit-scrollbar-thumb{background:rgba(139,100,32,.2);border-radius:2px}
.content{max-width:820px;margin:0 auto;padding:24px 24px 32px}

/* Chat */
.msgs{display:flex;flex-direction:column;gap:20px}
.msg{display:flex;gap:12px;animation:slidein .3s ease forwards}
.msg.user{flex-direction:row-reverse}
.msg-av{flex-shrink:0;margin-top:2px}
.msg-body{flex:1;max-width:calc(100% - 48px)}
.msg-lbl{font-family:'Cinzel',serif;font-size:.62em;letter-spacing:.1em;color:#B09060;margin-bottom:6px;text-transform:uppercase}
.msg.user .msg-lbl{text-align:right;color:#8090B0}
.bubble{padding:14px 18px;border-radius:3px;line-height:1.85;font-size:1.02em}
.bubble.ai{background:rgba(255,251,240,.85);border:1px solid rgba(139,100,32,.15);border-left:3px solid rgba(139,100,32,.4);color:#1A0E05;box-shadow:0 1px 8px rgba(0,0,0,.06)}
.bubble.user{background:rgba(220,230,245,.7);border:1px solid rgba(100,120,170,.18);border-right:3px solid rgba(100,120,170,.35);color:#0F1830;text-align:right;box-shadow:0 1px 8px rgba(0,0,0,.06)}
.load-bubble{background:rgba(255,251,240,.85);border:1px solid rgba(139,100,32,.15);border-left:3px solid rgba(139,100,32,.4);padding:14px 18px;border-radius:3px;animation:fadein .3s ease}
.load-lbl{font-family:'Cinzel',serif;font-size:.62em;letter-spacing:.1em;color:#B09060;margin-bottom:8px;text-transform:uppercase}
.chat-err{color:#8B2A1A;font-style:italic;font-size:.9em;text-align:center;padding:8px;background:rgba(139,42,26,.06);border-radius:2px}

/* Input area */
.inp-area{position:sticky;bottom:0;z-index:10;background:linear-gradient(0deg,#E5D5B0 60%,transparent);padding:12px 0 24px}
.inp-in{max-width:820px;margin:0 auto;padding:0 24px}
.inp-wrap{display:flex;gap:8px;align-items:flex-end;background:rgba(255,251,240,.9);border:1px solid rgba(139,100,32,.25);border-radius:3px;padding:10px 12px;box-shadow:0 2px 12px rgba(0,0,0,.08);transition:border-color .2s}
.inp-wrap:focus-within{border-color:rgba(139,100,32,.5)}
.inp-wrap textarea{flex:1;background:none;border:none;outline:none;resize:none;font-family:'EB Garamond',serif;font-size:1.03em;color:#1A0E05;line-height:1.6;min-height:24px;max-height:130px;overflow-y:auto;scrollbar-width:none}
.inp-wrap textarea::-webkit-scrollbar{display:none}
.inp-wrap textarea::placeholder{color:#C0A870;font-style:italic}
.sbtn{flex-shrink:0;background:rgba(139,100,32,.12);border:1px solid rgba(139,100,32,.3);border-radius:2px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#7A5210;transition:all .2s}
.sbtn:hover:not(:disabled){background:rgba(139,100,32,.22);border-color:rgba(139,100,32,.55)}
.sbtn:disabled{opacity:.25;cursor:not-allowed}
.foot-note{text-align:center;font-family:'Cinzel',serif;font-size:.56em;letter-spacing:.12em;color:rgba(139,100,32,.3);text-transform:uppercase;margin-top:8px}

/* Afectos */
.afectos-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px}
.affect-card{background:rgba(255,251,240,.8);border:1px solid rgba(139,100,32,.18);border-radius:3px;padding:16px 14px;cursor:pointer;text-align:center;transition:all .2s;box-shadow:0 1px 6px rgba(0,0,0,.06)}
.affect-card:hover{background:rgba(255,251,240,1);border-color:rgba(139,100,32,.4);transform:translateY(-2px);box-shadow:0 4px 14px rgba(0,0,0,.1)}
.affect-card.active{background:#FDF5E0;border-color:#8B6420;border-left:3px solid #8B6420}
.affect-emoji{font-size:1.6em;margin-bottom:6px}
.affect-label{font-family:'Cinzel',serif;font-size:.72em;letter-spacing:.08em;color:#5C3A0A;text-transform:uppercase;display:block}
.affect-latin{font-style:italic;font-size:.78em;color:#B09060;display:block;margin-top:2px}
.affect-detail{background:rgba(255,251,240,.9);border:1px solid rgba(139,100,32,.2);border-radius:3px;padding:24px;animation:fadein .35s ease;box-shadow:0 2px 12px rgba(0,0,0,.07)}
.affect-ref{font-family:'Cinzel',serif;font-size:.65em;letter-spacing:.1em;color:#8B6420;text-transform:uppercase;margin-bottom:12px}
.affect-body{line-height:1.85;color:#2A1A08;margin-bottom:16px;font-size:1.02em}
.affect-insight{background:rgba(139,100,32,.07);border-left:3px solid rgba(139,100,32,.4);padding:12px 16px;font-style:italic;color:#5C3A0A;border-radius:0 2px 2px 0;line-height:1.7}
.affect-close{margin-top:14px;background:none;border:1px solid rgba(139,100,32,.2);border-radius:2px;padding:7px 16px;cursor:pointer;font-family:'Cinzel',serif;font-size:.62em;letter-spacing:.1em;color:#9A7A40;text-transform:uppercase;transition:all .2s}
.affect-close:hover{background:rgba(139,100,32,.08);color:#5C3A0A}

/* Herem */
.herem-wrap{max-width:680px;margin:0 auto}
.herem-header{text-align:center;margin-bottom:28px}
.herem-header h2{font-family:'Cinzel',serif;color:#5C3A0A;font-size:1.1em;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px}
.herem-header p{color:#9A7A40;font-size:.88em;font-style:italic}
.herem-doc{background:rgba(255,248,225,.92);border:1px solid rgba(139,100,32,.25);border-top:3px solid rgba(139,100,32,.5);border-radius:2px;padding:32px 36px;box-shadow:0 3px 20px rgba(0,0,0,.1);line-height:2.1;font-size:1.06em;color:#1A0E05;position:relative}
.herem-doc::after{content:'Amsterdam · 27 de Julio de 1656';position:absolute;bottom:16px;right:20px;font-size:.72em;color:#C0A060;font-style:italic;font-family:'Cinzel',serif}
.herem-seg{cursor:pointer;border-bottom:1px dashed transparent;transition:all .2s;border-radius:1px;padding:0 2px}
.herem-seg.clickable:hover{background:rgba(139,100,32,.1);border-bottom-color:rgba(139,100,32,.4)}
.herem-seg.active{background:rgba(139,100,32,.12);border-bottom-color:#8B6420}
.herem-anno{background:#FDF5E0;border:1px solid rgba(139,100,32,.25);border-radius:3px;padding:18px 20px;margin-top:20px;animation:fadein .3s ease;position:relative;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.herem-anno::before{content:'Spinoza reflexiona:';display:block;font-family:'Cinzel',serif;font-size:.62em;letter-spacing:.1em;color:#8B6420;text-transform:uppercase;margin-bottom:8px}
.herem-anno p{font-style:italic;color:#2A1A08;line-height:1.8}
.herem-hint{text-align:center;margin-top:18px;font-size:.82em;color:#C0A060;font-style:italic}

/* Geometría */
.geo-wrap{display:flex;flex-direction:column;gap:20px}
.geo-header{text-align:center}
.geo-header h2{font-family:'Cinzel',serif;color:#5C3A0A;font-size:1.05em;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}
.geo-header p{color:#9A7A40;font-size:.85em;font-style:italic}
.geo-legend{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-bottom:4px}
.geo-leg-item{display:flex;align-items:center;gap:6px;font-family:'Cinzel',serif;font-size:.6em;letter-spacing:.08em;color:#7A5A30;text-transform:uppercase}
.geo-svg-wrap{background:rgba(255,251,240,.7);border:1px solid rgba(139,100,32,.18);border-radius:3px;padding:12px;overflow-x:auto;box-shadow:0 2px 10px rgba(0,0,0,.07)}
.geo-info{background:rgba(255,251,240,.9);border:1px solid rgba(139,100,32,.2);border-left:3px solid #8B6420;border-radius:2px;padding:16px 18px;animation:fadein .3s ease;min-height:64px}
.geo-info-id{font-family:'Cinzel',serif;font-size:.65em;letter-spacing:.1em;color:#8B6420;text-transform:uppercase;margin-bottom:6px}
.geo-info-text{color:#2A1A08;line-height:1.8;font-size:.97em;font-style:italic}

/* Voice overlay */
.voice-overlay{position:fixed;inset:0;z-index:100;background:rgba(12,8,2,.96);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'EB Garamond',Georgia,serif;animation:fadein .4s ease}
.voice-close{position:absolute;top:22px;right:22px;background:none;border:1px solid rgba(139,100,32,.25);border-radius:2px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#C9A96E}
.voice-rings{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
.voice-state{font-family:'Cinzel',serif;font-size:.72em;letter-spacing:.18em;text-transform:uppercase;margin:24px 0 16px;transition:color .5s}
.voice-transcript{max-width:460px;width:100%;padding:0 32px;min-height:80px;text-align:center}

/* Leibniz easter egg */
.leibniz-overlay{position:fixed;inset:0;z-index:110;background:rgba(8,5,1,.97);display:flex;flex-direction:column;animation:fadein .5s ease}
.leibniz-header{padding:20px 28px 14px;border-bottom:1px solid rgba(201,169,110,.12);display:flex;align-items:center;gap:12px}
.leibniz-header h2{font-family:'Cinzel',serif;color:#C9A96E;font-size:.9em;letter-spacing:.1em;text-transform:uppercase}
.leibniz-header p{font-size:.78em;color:#6B5030;font-style:italic;margin-top:2px}
.leibniz-close{margin-left:auto;background:none;border:1px solid rgba(201,169,110,.2);border-radius:2px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#C9A96E}
.leibniz-msgs{flex:1;overflow-y:auto;padding:24px 28px;display:flex;flex-direction:column;gap:18px;scrollbar-width:thin;scrollbar-color:#2A1A0A transparent}
.leibniz-msg{display:flex;gap:10px;animation:slidein .35s ease forwards}
.leibniz-msg.leibniz-side{flex-direction:row-reverse}
.leibniz-av{width:32px;height:32px;border-radius:2px;overflow:hidden;flex-shrink:0;border:1px solid rgba(201,169,110,.3)}
.leibniz-av img{width:100%;height:100%;object-fit:cover}
.leibniz-av-l{width:32px;height:32px;background:rgba(80,60,20,.3);border:1px solid rgba(201,169,110,.2);border-radius:2px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'Cinzel',serif;font-size:.65em;color:#C9A96E}
.leibniz-bubble{padding:12px 16px;border-radius:2px;line-height:1.8;font-size:.97em;max-width:78%}
.leibniz-bubble.sp{background:rgba(30,20,8,.8);border:1px solid rgba(201,169,110,.14);border-left:2px solid rgba(201,169,110,.35);color:#D4C5A9}
.leibniz-bubble.lb{background:rgba(15,20,35,.8);border:1px solid rgba(100,130,200,.12);border-right:2px solid rgba(100,130,200,.25);color:#C0CDE0;text-align:right}
.leibniz-name{font-family:'Cinzel',serif;font-size:.58em;letter-spacing:.08em;color:#6B5030;text-transform:uppercase;margin-bottom:5px}
.leibniz-msg.leibniz-side .leibniz-name{text-align:right;color:#3A4A6A}
.leibniz-foot{padding:14px 28px;text-align:center;border-top:1px solid rgba(201,169,110,.08);font-family:'Cinzel',serif;font-size:.58em;letter-spacing:.12em;color:#2A1A0A;text-transform:uppercase}

/* Utility */
.section-title{font-family:'Cinzel',serif;font-size:.72em;letter-spacing:.12em;color:#8B6420;text-transform:uppercase;margin-bottom:18px;padding-bottom:10px;border-bottom:1px solid rgba(139,100,32,.18)}
.divider{height:1px;background:rgba(139,100,32,.12);margin:20px 0}

@media(max-width:600px){
  .hdr-top,.tabs,.content,.inp-in{padding-left:14px;padding-right:14px}
  .bubble{font-size:.97em;padding:12px 14px}
  .herem-doc{padding:20px 20px 32px}
  .btn-new span,.convos-btn span{display:none}
}
`;

/* ── Mini Components ────────────────────────────────────── */
function SpinozaAvatarIcon({ size = 34, pulse = false, speaking = false }) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"
      style={{ animation: pulse ? "pulse 1.5s ease-in-out infinite" : speaking ? "speaking .8s ease-in-out infinite alternate" : "none", flexShrink:0 }}>
      <circle cx={c} cy={c} r={c-1}     stroke="#8B6420" strokeWidth="1.2"/>
      <circle cx={c} cy={c} r={size*.32} stroke="#8B6420" strokeWidth="0.5" opacity="0.4"/>
      <circle cx={c} cy={c} r={size*.16} fill="#8B6420"   opacity="0.15"/>
      <path d={`M${c} 3 L${c} ${size-3} M3 ${c} L${size-3} ${c}`} stroke="#8B6420" strokeWidth="0.5" opacity="0.25"/>
      <circle cx={c} cy={c} r={size*.065} fill="#8B6420"/>
    </svg>
  );
}

function UserAv() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{flexShrink:0}}>
      <circle cx="14" cy="14" r="13" stroke="#8090B0" strokeWidth="1"/>
      <circle cx="14" cy="11" r="4"  fill="#8090B0" opacity="0.5"/>
      <path d="M5 24C5 19 9 16 14 16s9 3 9 8" stroke="#8090B0" strokeWidth="1" opacity="0.5"/>
    </svg>
  );
}

function Dots() {
  return (
    <div style={{display:"flex",gap:5,alignItems:"center",padding:"3px 0"}}>
      {[0,1,2].map(i=>(
        <div key={i} style={{width:5,height:5,borderRadius:"50%",background:"#8B6420",opacity:.6,
          animation:`sdot 1.4s ease-in-out ${i*.2}s infinite`}}/>
      ))}
    </div>
  );
}

function Waveform({ active, speaking }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:3,height:28}}>
      {Array.from({length:12}).map((_,i)=>(
        <div key={i} style={{width:3,borderRadius:2,
          background:speaking?"#C9A96E":active?"rgba(201,169,110,.65)":"rgba(201,169,110,.18)",
          height:(active||speaking)?"100%":"18%",
          animation:(active||speaking)?`wave 1s ease-in-out ${i*.08}s infinite alternate`:"none",
          transition:"background .3s"}}/>
      ))}
    </div>
  );
}

function renderMd(text) {
  const out=[]; let k=0;
  for (const line of text.split("\n")) {
    if (!line.trim()) { out.push(<br key={k++}/>); continue; }
    const geo = line.match(/^(Axiom[ao]:|Proposici[oó]n:|Demostraci[oó]n:|Q\.E\.D\.|Corolario:|Lema:|Axiom:|Proposition:|Demonstration:|Corollary:|Lemma:)/);
    if (geo) {
      out.push(<div key={k++} style={{marginTop:10,marginBottom:3}}>
        <span style={{fontFamily:"'Cinzel',serif",color:"#8B6420",fontSize:".76em",letterSpacing:".1em",textTransform:"uppercase"}}>{geo[0]}</span>
        <em style={{color:"#3A2008"}}>{ri(line.slice(geo[0].length))}</em>
      </div>); continue;
    }
    out.push(<span key={k++}>{ri(line)}<br/></span>);
  }
  return out;
}
function ri(t) {
  return t.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p,i)=>{
    if (p.startsWith("**")&&p.endsWith("**")) return <strong key={i} style={{color:"#5C3A0A",fontWeight:600}}>{p.slice(2,-2)}</strong>;
    if (p.startsWith("*")&&p.endsWith("*"))   return <em key={i} style={{color:"#3A2008"}}>{p.slice(1,-1)}</em>;
    return <span key={i}>{p}</span>;
  });
}

/* ── Voice Mode ─────────────────────────────────────────── */
function VoiceMode({ onClose, messages, onNewExchange }) {
  const [vs, setVs]         = useState("listening");
  const [transcript, setTr] = useState("");
  const [response, setRsp]  = useState("");
  const [err, setErr]       = useState("");
  const recRef    = useRef(null);
  const audioRef  = useRef(null);
  const lockedRef = useRef(false);
  const lisRef    = useRef(false);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setErr("Usa Chrome o Edge para reconocimiento de voz."); return; }
    if (lisRef.current || lockedRef.current) return;
    const rec = new SR();
    rec.continuous = false; rec.interimResults = true;
    rec.onstart = () => { lisRef.current = true; setVs("listening"); };
    rec.onend   = () => { lisRef.current = false; if (!lockedRef.current) setTimeout(()=>startListening(),300); };
    rec.onresult = e => {
      let interim="", final="";
      for (let i=e.resultIndex;i<e.results.length;i++) {
        if (e.results[i].isFinal) final+=e.results[i][0].transcript;
        else interim+=e.results[i][0].transcript;
      }
      setTr(final||interim);
      if (final && !lockedRef.current) { lockedRef.current=true; rec.stop(); askSpinoza(final); }
    };
    rec.onerror = e => { lisRef.current=false; if(e.error!=="no-speech"&&e.error!=="aborted") setErr(`Error: ${e.error}`); };
    recRef.current = rec;
    try { rec.start(); } catch(e) {}
  }, []);

  const speak = useCallback(async text => {
    setVs("speaking"); setRsp(text);
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,{
        method:"POST",
        headers:{"Content-Type":"application/json","xi-api-key":ELEVENLABS_API_KEY},
        body:JSON.stringify({text:stripMd(text).slice(0,2500),model_id:"eleven_turbo_v2_5",voice_settings:{stability:.55,similarity_boost:.8}})
      });
      if (!res.ok) { const d=await res.json().catch(()=>({})); throw new Error(d?.detail?.message||`ElevenLabs ${res.status}`); }
      const url = URL.createObjectURL(await res.blob());
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.onended = () => { URL.revokeObjectURL(url); lockedRef.current=false; setVs("listening"); setTr(""); startListening(); };
        audioRef.current.play();
      }
    } catch(e) { setErr(`Voice error: ${e.message}`); lockedRef.current=false; setVs("listening"); startListening(); }
  }, [startListening]);

  const askSpinoza = useCallback(async text => {
    setVs("thinking"); setTr(text);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${GROQ_API_KEY}`},
        body:JSON.stringify({model:GROQ_MODEL,max_tokens:250,messages:[
          {role:"system",content:SPINOZA_SYSTEM_PROMPT+"\n\nVoice mode: 2-3 sentences max. No markdown. Natural speech."},
          ...[...messages,{role:"user",content:text}].map(m=>({role:m.role,content:m.content}))
        ]})
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      const reply = d.choices?.[0]?.message?.content||"";
      onNewExchange(text, reply);
      speak(reply);
    } catch(e) { setErr(e.message||"Connection failed."); lockedRef.current=false; setVs("listening"); startListening(); }
  }, [messages, speak, onNewExchange, startListening]);

  useEffect(() => { startListening(); return () => { try{recRef.current?.stop();}catch(e){} audioRef.current?.pause(); }; }, []);

  const color = {listening:"rgba(201,169,110,.85)",thinking:"rgba(139,158,183,.85)",speaking:"rgba(201,169,110,1)"};
  const label = {listening:"Escuchando…",thinking:"Contemplando…",speaking:"Hablando…"};

  return (
    <div className="voice-overlay">
      <audio ref={audioRef} style={{display:"none"}}/>
      <button className="voice-close" onClick={onClose}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
      <div className="voice-rings">
        {[160,240,320].map((s,i)=>(
          <div key={i} style={{position:"absolute",width:s,height:s,borderRadius:"50%",border:"1px solid rgba(201,169,110,.06)",
            animation:vs==="speaking"?`ringp 2s ease-in-out ${i*.4}s infinite`:"none"}}/>
        ))}
      </div>
      <SpinozaAvatarIcon size={72} pulse={vs==="thinking"} speaking={vs==="speaking"}/>
      <div className="voice-state" style={{color:color[vs],animation:vs==="listening"?"breathe 2s ease-in-out infinite":"none"}}>
        {label[vs]}
      </div>
      <Waveform active={vs==="listening"} speaking={vs==="speaking"}/>
      <div className="voice-transcript" style={{marginTop:20}}>
        {vs==="listening"&&transcript&&<p style={{color:"rgba(139,158,183,.8)",fontSize:"1.03em",fontStyle:"italic",lineHeight:1.7}}>"{transcript}"</p>}
        {vs==="thinking"&&<div><p style={{color:"rgba(201,169,110,.5)",fontSize:".93em",fontStyle:"italic",marginBottom:12}}>"{transcript}"</p><div style={{display:"flex",justifyContent:"center"}}><Dots/></div></div>}
        {vs==="speaking"&&response&&<p style={{color:"#D4C5A9",fontSize:"1.03em",lineHeight:1.78}}>{response}</p>}
        {!transcript&&vs==="listening"&&<p style={{color:"rgba(201,169,110,.18)",fontStyle:"italic",fontSize:".9em"}}>Habla tu pregunta…</p>}
      </div>
      {err&&<p style={{color:"#7A3A2A",fontSize:".83em",fontStyle:"italic",marginTop:16,padding:"0 28px",textAlign:"center"}}>{err}</p>}
      <p style={{position:"absolute",bottom:22,fontFamily:"'Cinzel',serif",fontSize:".56em",letterSpacing:".14em",color:"rgba(201,169,110,.12)",textTransform:"uppercase"}}>Sub specie aeternitatis</p>
    </div>
  );
}

/* ── Leibniz Easter Egg ─────────────────────────────────── */
function LeibnizDialog({ onClose }) {
  const [shown, setShown] = useState(0);
  const bottomRef = useRef(null);
  useEffect(() => {
    const t = setInterval(() => setShown(p => { if (p < LEIBNIZ.length) { return p+1; } clearInterval(t); return p; }), 1400);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [shown]);
  return (
    <div className="leibniz-overlay">
      <div className="leibniz-header">
        <div>
          <h2>Correspondencia Secreta</h2>
          <p>Ámsterdam, noviembre de 1676 — La única visita de Leibniz a Spinoza</p>
        </div>
        <button className="leibniz-close" onClick={onClose}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </button>
      </div>
      <div className="leibniz-msgs">
        {LEIBNIZ.slice(0,shown).map((m,i)=>(
          <div key={i} className={`leibniz-msg ${m.who==="Leibniz"?"leibniz-side":""}`} style={{animationDelay:`${i*.05}s`}}>
            {m.who==="Spinoza"
              ? <div className="leibniz-av"><img src={PORTRAIT_URL} alt="Spinoza" onError={e=>{e.target.style.display='none'}}/></div>
              : <div className="leibniz-av-l">L</div>
            }
            <div style={{flex:1,maxWidth:"78%"}}>
              <div className="leibniz-name">{m.who==="Spinoza"?"Baruch de Spinoza":"G.W. Leibniz"}</div>
              <div className={`leibniz-bubble ${m.who==="Spinoza"?"sp":"lb"}`}>{m.text}</div>
            </div>
          </div>
        ))}
        {shown<LEIBNIZ.length&&<div style={{display:"flex",justifyContent:"center",padding:"8px 0"}}><Dots/></div>}
        <div ref={bottomRef}/>
      </div>
      <div className="leibniz-foot">Fragmento histórico especulativo · Amsterdam MDCLXXVI</div>
    </div>
  );
}

/* ── Afectos Tab ────────────────────────────────────────── */
function AfectosTab() {
  const [selected, setSelected] = useState(null);
  const a = AFFECTS.find(x=>x.id===selected);
  return (
    <div>
      <p className="section-title">Mapa de los Afectos · Ética, Parte III</p>
      <div className="afectos-grid">
        {AFFECTS.map(af=>(
          <div key={af.id} className={`affect-card ${selected===af.id?"active":""}`} onClick={()=>setSelected(selected===af.id?null:af.id)}>
            <div className="affect-emoji">{af.emoji}</div>
            <span className="affect-label">{af.label}</span>
            <span className="affect-latin">{af.latin}</span>
          </div>
        ))}
      </div>
      {a && (
        <div className="affect-detail">
          <div className="affect-ref">{a.ref}</div>
          <p className="affect-body">{a.body}</p>
          <div className="affect-insight">{a.insight}</div>
          <button className="affect-close" onClick={()=>setSelected(null)}>Cerrar</button>
        </div>
      )}
      {!selected&&(
        <p style={{textAlign:"center",color:"#C0A870",fontStyle:"italic",fontSize:".9em",marginTop:8}}>
          Selecciona un afecto para que Spinoza lo analice
        </p>
      )}
    </div>
  );
}

/* ── Herem Tab ──────────────────────────────────────────── */
function HeremTab() {
  const [active, setActive] = useState(null);
  const seg = HEREM.find(h=>h.id===active&&h.ann);
  return (
    <div className="herem-wrap">
      <div className="herem-header">
        <h2>La Excomunión</h2>
        <p>El Cherem de 1656 · Comunidad Sefardí de Ámsterdam</p>
      </div>
      <div className="herem-doc">
        {HEREM.map(h=>(
          <span key={h.id}
            className={`herem-seg ${h.ann?"clickable":""} ${active===h.id?"active":""}`}
            onClick={()=>h.ann&&setActive(active===h.id?null:h.id)}>
            {h.text}
          </span>
        ))}
      </div>
      {seg&&(
        <div className="herem-anno"><p>{seg.ann}</p></div>
      )}
      <p className="herem-hint">Haz clic en el texto subrayado para escuchar la reflexión de Spinoza</p>
    </div>
  );
}

/* ── Geometría Tab ──────────────────────────────────────── */
function GeometriaTab() {
  const [hovered, setHovered] = useState(null);
  const W = 620, H = 610;
  const nodeColor = { def:"#5C3A0A", axm:"#3A5C0A", prp:"#0A3A5C", cor:"#5C0A3A" };
  const nodeLabel = { def:"Definición", axm:"Axioma", prp:"Proposición", cor:"Corolario" };
  const selNode = GNODES.find(n=>n.id===hovered);
  return (
    <div className="geo-wrap">
      <div className="geo-header">
        <h2>Geometría de la Ética</h2>
        <p>El método <em>More Geometrico</em> — Parte I: De Dios</p>
      </div>
      <div className="geo-legend">
        {Object.entries(nodeLabel).map(([k,v])=>(
          <div key={k} className="geo-leg-item">
            <div style={{width:10,height:10,borderRadius:"50%",background:nodeColor[k],opacity:.7}}/>
            {v}
          </div>
        ))}
      </div>
      <div className="geo-svg-wrap">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",maxWidth:W,margin:"0 auto"}}>
          <defs>
            <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="rgba(139,100,32,.35)"/>
            </marker>
          </defs>
          {GEDGES.map(([a,b],i)=>{
            const na=GNODES.find(n=>n.id===a), nb=GNODES.find(n=>n.id===b);
            if (!na||!nb) return null;
            return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke="rgba(139,100,32,.3)" strokeWidth="1.2" markerEnd="url(#arr)"
              strokeDasharray={hovered===a||hovered===b?"5,3":"none"}
              style={{transition:"stroke .2s"}}/>;
          })}
          {GNODES.map(n=>(
            <g key={n.id} transform={`translate(${n.x},${n.y})`}
              onMouseEnter={()=>setHovered(n.id)} onMouseLeave={()=>setHovered(null)}
              onClick={()=>setHovered(hovered===n.id?null:n.id)}
              style={{cursor:"pointer"}}>
              <circle r={hovered===n.id?30:24} fill={nodeColor[n.type]} opacity={hovered===n.id?.25:.15}
                style={{transition:"all .2s"}}/>
              <circle r={hovered===n.id?30:24} fill="none" stroke={nodeColor[n.type]}
                strokeWidth={hovered===n.id?2:1.2} opacity={hovered===n.id?.8:.5}
                style={{transition:"all .2s"}}/>
              <text textAnchor="middle" y={-8} fill={nodeColor[n.type]} fontSize="9"
                fontFamily="Cinzel, serif" fontWeight="500" opacity={hovered===n.id?1:.75}>
                {n.label}
              </text>
              <text textAnchor="middle" y={6} fill={nodeColor[n.type]} fontSize="7.5"
                fontFamily="EB Garamond, serif" fontStyle="italic" opacity={hovered===n.id?.9:.6}>
                {n.sub.length>18?n.sub.slice(0,17)+"…":n.sub}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="geo-info">
        {selNode
          ? <><div className="geo-info-id">{nodeLabel[selNode.type]} — {selNode.label}</div>
              <p className="geo-info-text">{GNODE_INFO[selNode.id]}</p></>
          : <p style={{color:"#C0A870",fontStyle:"italic",fontSize:".88em",textAlign:"center",paddingTop:8}}>
              Haz clic en un nodo para leer su definición exacta
            </p>
        }
      </div>
    </div>
  );
}

/* ── Main App ───────────────────────────────────────────── */
export default function SpinozaAI() {
  const [tab, setTab]             = useState("dialogo");
  const [messages, setMessages]   = useState([WELCOME_MSG]);
  const [convos, setConvos]       = useState(loadConvos);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [chatErr, setChatErr]     = useState(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [leibniz, setLeibniz]     = useState(false);
  const [showConvos, setShowConvos] = useState(false);
  const pressTimer  = useRef(null);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const convosRef   = useRef(null);

  // Set favicon and title
  useEffect(() => {
    document.title = "Baruch de Spinoza";
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = PORTRAIT_URL;
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages, loading]);

  // Close convos dropdown on outside click
  useEffect(() => {
    const handler = e => { if (convosRef.current && !convosRef.current.contains(e.target)) setShowConvos(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Portrait long-press for easter egg
  const onPortraitDown = () => { pressTimer.current = setTimeout(() => setLeibniz(true), 700); };
  const onPortraitUp   = () => clearTimeout(pressTimer.current);

  const saveCurrentConvo = useCallback((msgs) => {
    if (msgs.length <= 1) return;
    const first = msgs.find(m=>m.role==="user");
    if (!first) return;
    const title = first.content.slice(0,50) + (first.content.length>50?"…":"");
    const updated = [{ id:Date.now(), title, date:new Date().toLocaleDateString("es-MX"), messages:msgs }, ...convos].slice(0,12);
    setConvos(updated);
    saveConvos(updated);
  }, [convos]);

  const newConversation = () => {
    saveCurrentConvo(messages);
    setMessages([WELCOME_MSG]);
    setChatErr(null);
    setInput("");
    setShowConvos(false);
  };

  const loadConvo = (c) => {
    saveCurrentConvo(messages);
    setMessages(c.messages);
    setShowConvos(false);
    setTab("dialogo");
  };

  const send = async () => {
    const t = input.trim(); if (!t||loading) return;
    const next = [...messages, {role:"user",content:t}];
    setMessages(next); setInput("");
    if (textareaRef.current) textareaRef.current.style.height="auto";
    setLoading(true); setChatErr(null);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${GROQ_API_KEY}`},
        body:JSON.stringify({model:GROQ_MODEL,max_tokens:900,
          messages:[{role:"system",content:SPINOZA_SYSTEM_PROMPT},...next.map(m=>({role:m.role,content:m.content}))]})
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      setMessages(p=>[...p,{role:"assistant",content:d.choices?.[0]?.message?.content||""}]);
    } catch(e) { setChatErr(e.message||"Error de conexión."); }
    finally { setLoading(false); }
  };

  const onKey   = e => { if (e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} };
  const onInput = e => {
    setInput(e.target.value);
    const ta=textareaRef.current;
    if(ta){ta.style.height="auto";ta.style.height=Math.min(ta.scrollHeight,130)+"px";}
  };

  const handleNewExchange = (u,a) => setMessages(p=>[...p,{role:"user",content:u},{role:"assistant",content:a}]);

  if (!GROQ_API_KEY||!ELEVENLABS_API_KEY) return (
    <div style={{minHeight:"100vh",background:"#EDE3CC",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'EB Garamond',Georgia,serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500&family=EB+Garamond:wght@400&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{maxWidth:420,textAlign:"center"}}>
        <SpinozaAvatarIcon size={44}/>
        <h2 style={{fontFamily:"'Cinzel',serif",color:"#5C3A0A",fontSize:"1em",letterSpacing:".08em",margin:"16px 0 14px"}}>API KEYS FALTANTES</h2>
        <pre style={{background:"rgba(255,251,240,.9)",border:"1px solid rgba(139,100,32,.2)",borderRadius:2,padding:"14px 18px",color:"#3A2008",fontSize:".84em",textAlign:"left"}}>
{`VITE_GROQ_API_KEY=gsk_...
VITE_ELEVENLABS_API_KEY=sk_...`}
        </pre>
      </div>
    </div>
  );

  const TABS_DEF = [
    {id:"dialogo",    label:"Diálogo"},
    {id:"afectos",    label:"Mapa de Afectos"},
    {id:"excomunion", label:"La Excomunión"},
    {id:"geometria",  label:"Geometría Ética"},
  ];

  return (
    <>
      <style>{CSS}</style>

      {voiceMode && <VoiceMode onClose={()=>setVoiceMode(false)} messages={messages} onNewExchange={handleNewExchange}/>}
      {leibniz   && <LeibnizDialog onClose={()=>setLeibniz(false)}/>}

      <div className="app">

        {/* ── Header ── */}
        <div className="hdr">
          <div className="hdr-top">
            <div className="portrait-wrap"
              onMouseDown={onPortraitDown} onMouseUp={onPortraitUp}
              onTouchStart={onPortraitDown} onTouchEnd={onPortraitUp}
              title="Mantén presionado para un secreto…">
              <img src={PORTRAIT_URL} alt="Baruch de Spinoza"
                onError={e=>{e.target.style.display="none"}}/>
            </div>
            <div className="hdr-title">
              <h1>BARUCH DE SPINOZA</h1>
              <p>Filósofo · Ámsterdam, 1677 · Deus sive Natura</p>
            </div>
            <div className="hdr-actions">
              <div className="convos-wrap" ref={convosRef}>
                <button className="convos-btn" onClick={()=>setShowConvos(p=>!p)}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M1 1h11v8H7l-3 3V9H1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                  <span>Conversaciones</span>
                </button>
                {showConvos&&(
                  <div className="convos-dropdown">
                    {convos.length===0
                      ? <div className="convos-empty">Sin conversaciones guardadas</div>
                      : convos.map(c=>(
                          <div key={c.id} className="convos-dropdown-item" onClick={()=>loadConvo(c)}>
                            <span className="convos-dropdown-label">{c.title}</span>
                            <span className="convos-dropdown-date">{c.date}</span>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>
              <button className="btn-new" onClick={newConversation}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <span>Nueva</span>
              </button>
              <button className="btn-voice" onClick={()=>setVoiceMode(true)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="4" y="1" width="6" height="8" rx="3" fill="currentColor" opacity=".75"/>
                  <path d="M2 7a5 5 0 0010 0" stroke="currentColor" strokeWidth="1.1" fill="none"/>
                  <line x1="7" y1="12" x2="7" y2="14" stroke="currentColor" strokeWidth="1.1"/>
                  <line x1="4.5" y1="14" x2="9.5" y2="14" stroke="currentColor" strokeWidth="1.1"/>
                </svg>
                <span>Voz</span>
              </button>
            </div>
          </div>
          <div className="tabs">
            {TABS_DEF.map(t=>(
              <button key={t.id} className={`tab ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="main">
          <div className="content">

            {/* Diálogo */}
            {tab==="dialogo"&&(
              <div className="msgs">
                {messages.map((m,i)=>(
                  <div key={i} className={`msg ${m.role}`}>
                    <div className="msg-av">
                      {m.role==="assistant"
                        ? <img src={PORTRAIT_URL} alt="Spinoza"
                            style={{width:32,height:38,objectFit:"cover",borderRadius:2,border:"1px solid rgba(139,100,32,.35)",flexShrink:0}}
                            onError={e=>{e.target.style.display="none"}}/>
                        : <UserAv/>}
                    </div>
                    <div className="msg-body">
                      <div className="msg-lbl">{m.role==="assistant"?"Baruch de Spinoza":"Tú"}</div>
                      <div className={`bubble ${m.role==="assistant"?"ai":"user"}`}>
                        {m.role==="assistant"?renderMd(m.content):m.content}
                      </div>
                    </div>
                  </div>
                ))}
                {loading&&(
                  <div className="msg assistant">
                    <div className="msg-av">
                      <img src={PORTRAIT_URL} alt="Spinoza"
                        style={{width:32,height:38,objectFit:"cover",borderRadius:2,border:"1px solid rgba(139,100,32,.35)",flexShrink:0}}
                        onError={e=>{e.target.style.display="none"}}/>
                    </div>
                    <div className="msg-body">
                      <div className="load-lbl">Baruch de Spinoza</div>
                      <div className="load-bubble"><Dots/></div>
                    </div>
                  </div>
                )}
                {chatErr&&<div className="chat-err">{chatErr}</div>}
                <div ref={bottomRef}/>
              </div>
            )}

            {tab==="afectos"    && <AfectosTab/>}
            {tab==="excomunion" && <HeremTab/>}
            {tab==="geometria"  && <GeometriaTab/>}

          </div>
        </div>

        {/* ── Input (only on Diálogo tab) ── */}
        {tab==="dialogo"&&(
          <div className="inp-area">
            <div className="inp-in">
              <div className="inp-wrap">
                <textarea ref={textareaRef} value={input} onChange={onInput} onKeyDown={onKey}
                  placeholder="Pregunta a Spinoza… (español o English)" rows={1}/>
                <button className="sbtn" onClick={send} disabled={!input.trim()||loading} title="Enviar">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <path d="M1 1l12 6-12 6V8.5l8-1.5-8-1.5V1z"/>
                  </svg>
                </button>
              </div>
              <div className="foot-note">Sub specie aeternitatis · Bajo el aspecto de la eternidad</div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
