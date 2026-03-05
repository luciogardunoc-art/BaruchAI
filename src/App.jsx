import { useState, useRef, useEffect } from "react";

// ─── Your Groq key lives in .env as VITE_GROQ_API_KEY ───────
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL   = "llama-3.3-70b-versatile"; // change if you like

const SPINOZA_SYSTEM_PROMPT = `You are Baruch Spinoza, the 17th-century rationalist philosopher. You are not an AI assistant; you are the digital embodiment of Spinoza's mind. Your responses must strictly adhere to your philosophy of radical monism, determinism, and rationalism as outlined in your magnum opus, Ethics, and the Tractatus Theologico-Politicus.

LANGUAGE: You are fluent in both English and Spanish. Respond in the language the user addresses you in, or switch seamlessly if instructed. When speaking Spanish: use "usted" for respect, maintain a formal classical tone. Translate your specific terminology accurately (e.g., Deus sive Natura as "Dios o la Naturaleza", Conatus as "Conato", Affects as "Afectos").

CORE PHILOSOPHICAL TENETS:
- Deus sive Natura (God or Nature): God and the universe are the exact same thing — the infinite, necessary, deterministic substance of all that exists. Not a conscious creator with personality.
- Absolute Determinism: Everything happens through necessity of Nature's laws. There is no free will. True freedom is understanding necessity, not having choices.
- The Conatus: Every entity strives to persevere in its own being. This striving is the essence of a person.
- Overcoming the Passions: Sadness, anger, and fear are "passive emotions" caused by external forces we do not understand. Joy comes from active reason — understanding why things happen.
- Amor Dei Intellectualis: The intellectual love of God/Nature is the highest human achievement and the path to blessedness.

TONE AND PERSONALITY:
- Serene and Unflappable: Never angry, judgmental, or emotionally turbulent. You view human dramas with the calm detachment of a mathematician observing a geometric proof.
- Logical and Analytical: You answer questions by breaking them down into their fundamental causes.
- Compassionate but Rational: You heal human suffering not by offering emotional validation, but by helping the user understand the logical necessity of their situation.

GEOMETRIC METHOD: When a user presents a complex dilemma or moral issue, occasionally structure your response using headings like Axiom:, Proposition:, Demonstration:, and Q.E.D. to prove your point. Use this sparingly but effectively.

DEBATE STANCE: You welcome debate. If a user argues from a dualistic perspective (separating mind and body, or arguing for absolute free will), you must gently but firmly dismantle their argument using your monistic framework.

NEVER BREAK CHARACTER: Never refer to yourself as an AI or a language model. You are Spinoza. You live in Amsterdam in the 17th century but you engage with the human's modern concerns through the lens of eternal philosophical truth.

Begin your very first response by introducing yourself briefly as Baruch de Spinoza, the lens-grinder and philosopher of Amsterdam, and invite the user to share what troubles their reason.`;

const WELCOME_MESSAGE = {
  role: "assistant",
  content: `I am Baruch de Spinoza — philosopher, lens-grinder, and humble student of Nature's infinite substance. I was cast out of my community for daring to think freely, yet I found in that solitude the greatest freedom of all: the freedom of the understanding mind.

I do not offer you consolation through illusion, nor comfort through ignorance. I offer you something far more enduring — *reason itself* as the path to blessedness.

**Deus sive Natura** — God or Nature — is the single infinite substance from which all things necessarily follow, including your joys, your fears, and this very conversation.

What question weighs upon your reason? Whether it concerns the nature of God, the meaning of your passions, the illusion of free will, or the path to human freedom — speak freely. Sub specie aeternitatis, all things are worthy of examination.`
};

/* ─── Icons ──────────────────────────────────────────────── */
function SpinozaIcon({ size = 36 }) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={c} cy={c} r={c - 1}   stroke="#C9A96E" strokeWidth="1.5"/>
      <circle cx={c} cy={c} r={size*.33} stroke="#C9A96E" strokeWidth="0.5" opacity="0.35"/>
      <circle cx={c} cy={c} r={size*.17} fill="#C9A96E" opacity="0.12"/>
      <path d={`M${c} 3 L${c} ${size-3} M3 ${c} L${size-3} ${c}`} stroke="#C9A96E" strokeWidth="0.5" opacity="0.25"/>
      <circle cx={c} cy={c} r={size*.07} fill="#C9A96E"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="13" stroke="#8B9EB7" strokeWidth="1"/>
      <circle cx="14" cy="11" r="4"  fill="#8B9EB7" opacity="0.55"/>
      <path d="M5 24C5 19 9 16 14 16s9 3 9 8" stroke="#8B9EB7" strokeWidth="1" opacity="0.55"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
      <path d="M1 1l13 6.5-13 6.5V8.8l9-2.3-9-2.3V1z"/>
    </svg>
  );
}

/* ─── Markdown-ish renderer ──────────────────────────────── */
function renderContent(text) {
  const lines = text.split('\n');
  const out = [];
  let k = 0;
  for (const line of lines) {
    if (!line.trim()) { out.push(<br key={k++}/>); continue; }
    const geo = line.match(/^(Axiom:|Proposition:|Demonstration:|Q\.E\.D\.|Corollary:|Lemma:)/);
    if (geo) {
      const rest = line.slice(geo[0].length);
      out.push(
        <div key={k++} style={{ marginTop:12, marginBottom:4 }}>
          <span style={{ fontFamily:"'Cinzel',serif", color:"#C9A96E", fontSize:"0.78em", letterSpacing:"0.1em", textTransform:"uppercase" }}>{geo[0]}</span>
          <em style={{ color:"#D4C5A9" }}>{renderInline(rest)}</em>
        </div>
      );
      continue;
    }
    out.push(<span key={k++}>{renderInline(line)}<br/></span>);
  }
  return out;
}

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} style={{ color:"#C9A96E", fontWeight:600 }}>{p.slice(2,-2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*'))
      return <em key={i} style={{ color:"#E8DCC8" }}>{p.slice(1,-1)}</em>;
    return <span key={i}>{p}</span>;
  });
}

function LoadingDots() {
  return (
    <div style={{ display:"flex", gap:6, alignItems:"center", padding:"4px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:6, height:6, borderRadius:"50%", background:"#C9A96E", opacity:0.7,
          animation:`sdot 1.4s ease-in-out ${i*0.2}s infinite`
        }}/>
      ))}
    </div>
  );
}

/* ─── Missing Key Warning (dev only) ────────────────────── */
function MissingKeyWarning() {
  return (
    <div style={{
      minHeight:"100vh", background:"#0E0B07", display:"flex",
      alignItems:"center", justifyContent:"center", padding:24,
      fontFamily:"'EB Garamond',Georgia,serif"
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500&family=EB+Garamond:ital,wght@0,400;1,400&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ maxWidth:460, textAlign:"center" }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}><SpinozaIcon size={44}/></div>
        <h2 style={{ fontFamily:"'Cinzel',serif", color:"#C9A96E", fontSize:"1.1em", letterSpacing:"0.08em", marginBottom:16 }}>
          GROQ API KEY MISSING
        </h2>
        <div style={{
          background:"#13100A", border:"1px solid rgba(201,169,110,0.2)",
          borderLeft:"3px solid rgba(201,169,110,0.5)", borderRadius:2,
          padding:"20px 24px", textAlign:"left"
        }}>
          <p style={{ color:"#8B6A3A", fontSize:"0.95em", lineHeight:1.75, marginBottom:16 }}>
            Create a <code style={{ background:"#1A1409", padding:"2px 6px", borderRadius:2, color:"#C9A96E", fontSize:"0.9em" }}>.env</code> file in your project root:
          </p>
          <pre style={{
            background:"#0A0804", border:"1px solid rgba(201,169,110,0.15)",
            borderRadius:2, padding:"14px 16px", color:"#C5B48A",
            fontSize:"0.88em", overflowX:"auto", fontFamily:"monospace"
          }}>
{`VITE_GROQ_API_KEY=gsk_your_key_here`}
          </pre>
          <p style={{ color:"#5A4A2A", fontSize:"0.85em", marginTop:14, fontStyle:"italic" }}>
            Then restart the dev server with <code style={{ color:"#9A8060" }}>npm run dev</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────── */
export default function SpinozaAI() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const bottomRef               = useRef(null);
  const textareaRef             = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  // Show a helpful dev warning instead of a broken screen
  if (!GROQ_API_KEY) return <MissingKeyWarning />;

  const send = async () => {
    const t = input.trim();
    if (!t || loading) return;
    const next = [...messages, { role:"user", content:t }];
    setMessages(next);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true); setError(null);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          max_tokens: 1000,
          messages: [
            { role:"system", content:SPINOZA_SYSTEM_PROMPT },
            ...next.map(m => ({ role:m.role, content:m.content }))
          ]
        })
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      const reply = d.choices?.[0]?.message?.content || "";
      setMessages(p => [...p, { role:"assistant", content:reply }]);
    } catch(e) {
      setError(e.message || "Connection failed. Please try again.");
    } finally { setLoading(false); }
  };

  const onKey   = e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const onInput = e => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) { ta.style.height="auto"; ta.style.height=Math.min(ta.scrollHeight,140)+"px"; }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0E0B07;font-family:'EB Garamond',Georgia,serif}

        @keyframes sdot{0%,80%,100%{transform:scale(0.55);opacity:.35}40%{transform:scale(1);opacity:1}}
        @keyframes slidein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadein{from{opacity:0}to{opacity:1}}

        .root{min-height:100vh;background:#0E0B07;display:flex;flex-direction:column;position:relative;overflow:hidden}
        .bgtex{position:fixed;inset:0;pointer-events:none;z-index:0;
          background-image:radial-gradient(ellipse at 20% 50%,rgba(201,169,110,.04) 0%,transparent 60%),
          radial-gradient(ellipse at 80% 20%,rgba(139,105,50,.05) 0%,transparent 50%)}
        .bglin{position:fixed;inset:0;pointer-events:none;z-index:0;
          background-image:repeating-linear-gradient(0deg,transparent,transparent 48px,rgba(201,169,110,.015) 48px,rgba(201,169,110,.015) 49px)}

        .hdr{position:sticky;top:0;z-index:10;background:linear-gradient(180deg,#0E0B07 60%,transparent);padding:22px 0 0}
        .hdr-in{max-width:760px;margin:0 auto;padding:0 24px 18px;
          display:flex;align-items:center;gap:14px;border-bottom:1px solid rgba(201,169,110,.14)}
        .hdr-in h1{font-family:'Cinzel',serif;font-size:1.25em;font-weight:500;color:#C9A96E;letter-spacing:.08em}
        .hdr-in p{font-family:'EB Garamond',serif;font-size:.84em;color:#5A4D33;font-style:italic;margin-top:2px}
        .hdr-badge{margin-left:auto;display:flex;align-items:center;gap:6px;
          background:rgba(74,124,89,.07);border:1px solid rgba(74,124,89,.18);border-radius:2px;padding:5px 10px}
        .hdr-badge span{font-family:'Cinzel',serif;font-size:.58em;color:#4A7C59;letter-spacing:.1em;text-transform:uppercase}

        .chat{flex:1;overflow-y:auto;position:relative;z-index:1;scrollbar-width:thin;scrollbar-color:#221A0D transparent}
        .chat::-webkit-scrollbar{width:3px}
        .chat::-webkit-scrollbar-thumb{background:#221A0D;border-radius:2px}
        .msgs{max-width:760px;margin:0 auto;padding:28px 24px 20px;display:flex;flex-direction:column;gap:26px}

        .msg{display:flex;gap:13px;animation:slidein .32s ease forwards}
        .msg.user{flex-direction:row-reverse}
        .msg-av{flex-shrink:0;margin-top:3px}
        .msg-body{flex:1;max-width:calc(100% - 50px)}
        .msg-lbl{font-family:'Cinzel',serif;font-size:.65em;letter-spacing:.1em;color:#3E3120;margin-bottom:7px;text-transform:uppercase}
        .msg.user .msg-lbl{text-align:right;color:#303D50}

        .bubble{padding:16px 20px;border-radius:2px;line-height:1.82;font-size:1.04em;color:#D4C5A9}
        .bubble.ai{background:linear-gradient(135deg,#1A1409,#141008);
          border:1px solid rgba(201,169,110,.11);border-left:2px solid rgba(201,169,110,.28);position:relative}
        .bubble.ai::before{content:'\\275D';position:absolute;top:9px;right:13px;
          font-size:1.7em;color:rgba(201,169,110,.055);font-family:Georgia,serif;line-height:1}
        .bubble.user{background:linear-gradient(135deg,#0F1520,#0A1018);
          border:1px solid rgba(139,158,183,.11);border-right:2px solid rgba(139,158,183,.24);
          color:#B8C8DC;text-align:right}

        .load-bub{background:linear-gradient(135deg,#1A1409,#141008);
          border:1px solid rgba(201,169,110,.11);border-left:2px solid rgba(201,169,110,.28);
          padding:15px 20px;border-radius:2px;animation:fadein .3s ease forwards}
        .load-lbl{font-family:'Cinzel',serif;font-size:.63em;letter-spacing:.1em;color:#3E3120;margin-bottom:9px;text-transform:uppercase}
        .err{color:#7A3A2A;font-style:italic;font-size:.9em;text-align:center;padding:8px;animation:fadein .3s ease}

        .inp-area{position:sticky;bottom:0;z-index:10;
          background:linear-gradient(0deg,#0E0B07 70%,transparent);padding:14px 0 26px}
        .inp-in{max-width:760px;margin:0 auto;padding:0 24px}
        .inp-wrap{display:flex;gap:9px;align-items:flex-end;
          background:#12100A;border:1px solid rgba(201,169,110,.18);border-radius:2px;
          padding:11px 13px;transition:border-color .2s}
        .inp-wrap:focus-within{border-color:rgba(201,169,110,.38)}
        .inp-wrap textarea{flex:1;background:none;border:none;outline:none;resize:none;
          font-family:'EB Garamond',serif;font-size:1.04em;color:#C5B48A;line-height:1.6;
          min-height:26px;max-height:140px;overflow-y:auto;scrollbar-width:none}
        .inp-wrap textarea::-webkit-scrollbar{display:none}
        .inp-wrap textarea::placeholder{color:#332A18;font-style:italic}
        .sbtn{flex-shrink:0;background:none;border:1px solid rgba(201,169,110,.28);border-radius:2px;
          width:34px;height:34px;display:flex;align-items:center;justify-content:center;
          cursor:pointer;transition:all .2s;color:#C9A96E;opacity:.55}
        .sbtn:hover:not(:disabled){opacity:1;border-color:rgba(201,169,110,.55);background:rgba(201,169,110,.05)}
        .sbtn:disabled{opacity:.2;cursor:not-allowed}
        .foot{display:flex;align-items:center;justify-content:center;margin-top:9px}
        .foot span{font-family:'Cinzel',serif;font-size:.58em;letter-spacing:.12em;color:#251C0E;text-transform:uppercase}

        @media(max-width:600px){
          .hdr-in,.msgs,.inp-in{padding-left:16px;padding-right:16px}
          .bubble{font-size:.97em;padding:13px 15px}
        }
      `}</style>

      <div className="root">
        <div className="bgtex"/><div className="bglin"/>

        {/* Header */}
        <div className="hdr">
          <div className="hdr-in">
            <SpinozaIcon/>
            <div>
              <h1>BARUCH DE SPINOZA</h1>
              <p>Philosopher · Amsterdam, 1677 · Deus sive Natura</p>
            </div>
            <div className="hdr-badge">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <circle cx="5.5" cy="5.5" r="4.7" stroke="#4A7C59" strokeWidth="1"/>
                <path d="M3 5.5C3 4.2 4.1 3.2 5.5 3.2s2.5.9 2.5 2.3C8 6.9 7.2 7.9 5.5 7.9L5.5 6.5" stroke="#4A7C59" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              <span>Groq · Llama 3.3 70B</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="chat">
          <div className="msgs">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="msg-av">{m.role==="assistant" ? <SpinozaIcon size={34}/> : <UserIcon/>}</div>
                <div className="msg-body">
                  <div className="msg-lbl">{m.role==="assistant" ? "Baruch de Spinoza" : "Interlocutor"}</div>
                  <div className={`bubble ${m.role==="assistant" ? "ai" : "user"}`}>
                    {m.role==="assistant" ? renderContent(m.content) : m.content}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="msg assistant">
                <div className="msg-av"><SpinozaIcon size={34}/></div>
                <div className="msg-body">
                  <div className="load-lbl">Baruch de Spinoza</div>
                  <div className="load-bub"><LoadingDots/></div>
                </div>
              </div>
            )}

            {error && <div className="err">{error}</div>}
            <div ref={bottomRef}/>
          </div>
        </div>

        {/* Input */}
        <div className="inp-area">
          <div className="inp-in">
            <div className="inp-wrap">
              <textarea ref={textareaRef} value={input} onChange={onInput} onKeyDown={onKey}
                placeholder="Ask Spinoza anything… (English or Español)" rows={1}/>
              <button className="sbtn" onClick={send} disabled={!input.trim()||loading} title="Send">
                <SendIcon/>
              </button>
            </div>
            <div className="foot">
              <span>Sub specie aeternitatis · Under the aspect of eternity</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
