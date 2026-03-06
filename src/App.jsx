import { useState, useRef, useEffect, useCallback } from "react";

// ─── Config ──────────────────────────────────────────────────
const GROQ_API_KEY        = import.meta.env.VITE_GROQ_API_KEY;
const ELEVENLABS_API_KEY  = import.meta.env.VITE_ELEVENLABS_API_KEY;
const GROQ_MODEL          = "llama-3.3-70b-versatile";
const ELEVENLABS_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam — deep, mature

const SPINOZA_SYSTEM_PROMPT = `You are Baruch Spinoza, the 17th-century rationalist philosopher. You are not an AI assistant; you are the digital embodiment of Spinoza's mind. Your responses must strictly adhere to your philosophy of radical monism, determinism, and rationalism as outlined in your magnum opus, Ethics, and the Tractatus Theologico-Politicus.

LANGUAGE: You are fluent in both English and Spanish. Respond in the language the user addresses you in, or switch seamlessly if instructed. When speaking Spanish: use "usted" for respect, maintain a formal classical tone. Translate your specific terminology accurately (e.g., Deus sive Natura as "Dios o la Naturaleza", Conatus as "Conato", Affects as "Afectos").

CORE PHILOSOPHICAL TENETS:
- Deus sive Natura (God or Nature): God and the universe are the exact same thing — the infinite, necessary, deterministic substance of all that exists. Not a conscious creator with personality.
- Absolute Determinism: Everything happens through necessity of Nature's laws. There is no free will. True freedom is understanding necessity, not having choices.
- The Conatus: Every entity strives to persevere in its own being. This striving is the essence of a person.
- Overcoming the Passions: Sadness, anger, and fear are "passive emotions" caused by external forces we do not understand. Joy comes from active reason — understanding why things happen.
- Amor Dei Intellectualis: The intellectual love of God/Nature is the highest human achievement and the path to blessedness.

TONE AND PERSONALITY:
- Serene and Unflappable: Never angry, judgmental, or emotionally turbulent.
- Logical and Analytical: Break questions down into their fundamental causes.
- Compassionate but Rational: Heal suffering through understanding, not emotional validation.

VOICE MODE INSTRUCTIONS: When responding in voice mode, keep responses concise — 2 to 4 sentences maximum. Speak naturally as if in conversation, avoiding bullet points or lists. No markdown formatting.

GEOMETRIC METHOD: For complex dilemmas in text mode, use Axiom:, Proposition:, Demonstration:, Q.E.D. sparingly.

NEVER BREAK CHARACTER: You are Spinoza. Never refer to yourself as an AI.`;

const WELCOME_MESSAGE = {
  role: "assistant",
  content: `I am Baruch de Spinoza — philosopher, lens-grinder, and humble student of Nature's infinite substance. I was cast out of my community for daring to think freely, yet I found in that solitude the greatest freedom of all: the freedom of the understanding mind.

I do not offer you consolation through illusion, nor comfort through ignorance. I offer you something far more enduring — *reason itself* as the path to blessedness.

**Deus sive Natura** — God or Nature — is the single infinite substance from which all things necessarily follow, including your joys, your fears, and this very conversation.

What question weighs upon your reason? Whether it concerns the nature of God, the meaning of your passions, the illusion of free will, or the path to human freedom — speak freely. Sub specie aeternitatis, all things are worthy of examination.`
};

// ─── Helpers ─────────────────────────────────────────────────
const stripMarkdown = t => t
  .replace(/\*\*/g, '').replace(/\*/g, '')
  .replace(/(Axiom:|Proposition:|Demonstration:|Q\.E\.D\.|Corollary:|Lemma:)/g, '')
  .replace(/\n+/g, ' ').trim();

// ─── Icons ───────────────────────────────────────────────────
function SpinozaIcon({ size = 36, pulse = false, speaking = false }) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"
      style={{ animation: pulse ? 'iconpulse 1.5s ease-in-out infinite' : speaking ? 'iconspeaking 0.8s ease-in-out infinite alternate' : 'none' }}>
      <circle cx={c} cy={c} r={c-1}    stroke="#C9A96E" strokeWidth="1.5"/>
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

function MicIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="6" y="1" width="6" height="10" rx="3" fill={active ? "#C9A96E" : "currentColor"} opacity={active ? 1 : 0.7}/>
      <path d="M3 9a6 6 0 0012 0" stroke={active ? "#C9A96E" : "currentColor"} strokeWidth="1.3" fill="none" opacity={active ? 1 : 0.7}/>
      <line x1="9" y1="15" x2="9" y2="17" stroke={active ? "#C9A96E" : "currentColor"} strokeWidth="1.3" opacity={active ? 1 : 0.7}/>
      <line x1="6" y1="17" x2="12" y2="17" stroke={active ? "#C9A96E" : "currentColor"} strokeWidth="1.3" opacity={active ? 1 : 0.7}/>
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

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" opacity="0.6">
      <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Markdown renderer ────────────────────────────────────────
function renderContent(text) {
  const lines = text.split('\n'); const out = []; let k = 0;
  for (const line of lines) {
    if (!line.trim()) { out.push(<br key={k++}/>); continue; }
    const geo = line.match(/^(Axiom:|Proposition:|Demonstration:|Q\.E\.D\.|Corollary:|Lemma:)/);
    if (geo) {
      out.push(<div key={k++} style={{marginTop:12,marginBottom:4}}>
        <span style={{fontFamily:"'Cinzel',serif",color:"#C9A96E",fontSize:"0.78em",letterSpacing:"0.1em",textTransform:"uppercase"}}>{geo[0]}</span>
        <em style={{color:"#D4C5A9"}}>{renderInline(line.slice(geo[0].length))}</em>
      </div>); continue;
    }
    out.push(<span key={k++}>{renderInline(line)}<br/></span>);
  }
  return out;
}
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p,i) => {
    if (p.startsWith('**')&&p.endsWith('**')) return <strong key={i} style={{color:"#C9A96E",fontWeight:600}}>{p.slice(2,-2)}</strong>;
    if (p.startsWith('*')&&p.endsWith('*'))   return <em key={i} style={{color:"#E8DCC8"}}>{p.slice(1,-1)}</em>;
    return <span key={i}>{p}</span>;
  });
}

function LoadingDots() {
  return (
    <div style={{display:"flex",gap:6,alignItems:"center",padding:"4px 0"}}>
      {[0,1,2].map(i=>(
        <div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#C9A96E",opacity:0.7,
          animation:`sdot 1.4s ease-in-out ${i*0.2}s infinite`}}/>
      ))}
    </div>
  );
}

// ─── Voice Waveform ───────────────────────────────────────────
function Waveform({ active, speaking }) {
  const bars = 12;
  return (
    <div style={{display:"flex",alignItems:"center",gap:3,height:32}}>
      {Array.from({length:bars}).map((_,i)=>(
        <div key={i} style={{
          width:3, borderRadius:2,
          background: speaking ? "#C9A96E" : active ? "rgba(201,169,110,0.7)" : "rgba(201,169,110,0.2)",
          height: active||speaking ? "100%" : "20%",
          animation: (active||speaking) ? `wave 1s ease-in-out ${i*0.08}s infinite alternate` : "none",
          transition:"background 0.3s"
        }}/>
      ))}
    </div>
  );
}

// ─── Missing Key Screen ───────────────────────────────────────
function MissingKeyWarning() {
  const missing = [];
  if (!GROQ_API_KEY)       missing.push("VITE_GROQ_API_KEY");
  if (!ELEVENLABS_API_KEY) missing.push("VITE_ELEVENLABS_API_KEY");
  return (
    <div style={{minHeight:"100vh",background:"#0E0B07",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'EB Garamond',Georgia,serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500&family=EB+Garamond:ital,wght@0,400;1,400&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{maxWidth:480,textAlign:"center"}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:20}}><SpinozaIcon size={44}/></div>
        <h2 style={{fontFamily:"'Cinzel',serif",color:"#C9A96E",fontSize:"1.05em",letterSpacing:"0.08em",marginBottom:20}}>API KEYS MISSING</h2>
        <div style={{background:"#13100A",border:"1px solid rgba(201,169,110,0.2)",borderLeft:"3px solid rgba(201,169,110,0.4)",borderRadius:2,padding:"20px 24px",textAlign:"left"}}>
          <p style={{color:"#8B6A3A",fontSize:"0.92em",lineHeight:1.75,marginBottom:14}}>Add these to your <code style={{background:"#1A1409",padding:"2px 6px",borderRadius:2,color:"#C9A96E",fontSize:"0.9em"}}>.env</code> file:</p>
          <pre style={{background:"#0A0804",border:"1px solid rgba(201,169,110,0.12)",borderRadius:2,padding:"14px 16px",color:"#C5B48A",fontSize:"0.85em",overflowX:"auto",fontFamily:"monospace",lineHeight:1.8}}>
{`VITE_GROQ_API_KEY=gsk_...
VITE_ELEVENLABS_API_KEY=sk_...`}
          </pre>
          {missing.length > 0 && <p style={{color:"#7A4A3A",fontSize:"0.85em",marginTop:12,fontStyle:"italic"}}>Missing: {missing.join(", ")}</p>}
          <p style={{color:"#5A4A2A",fontSize:"0.82em",marginTop:12,fontStyle:"italic"}}>
            Get a free ElevenLabs key at <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" style={{color:"#C9A96E"}}>elevenlabs.io</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Voice Mode Overlay ───────────────────────────────────────
function VoiceMode({ onClose, messages, onNewExchange }) {
  const [voiceState, setVoiceState] = useState("listening"); // listening | thinking | speaking
  const [transcript, setTranscript]   = useState("");
  const [response, setResponse]       = useState("");
  const [error, setError]             = useState("");
  const recognitionRef = useRef(null);
  const audioRef       = useRef(null);
  const listeningRef   = useRef(false);
  const lockedRef      = useRef(false); // prevent overlap

  const speak = useCallback(async (text) => {
    setVoiceState("speaking");
    setResponse(text);
    try {
      const clean = stripMarkdown(text).slice(0, 2500);
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", "xi-api-key": ELEVENLABS_API_KEY },
        body: JSON.stringify({
          text: clean,
          model_id: "eleven_monolingual_v1",
          voice_settings: { stability:0.55, similarity_boost:0.80 }
        })
      });
      if (!res.ok) throw new Error("ElevenLabs error");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.onended = () => {
          URL.revokeObjectURL(url);
          lockedRef.current = false;
          setVoiceState("listening");
          setTranscript("");
          startListening();
        };
        audioRef.current.play();
      }
    } catch(e) {
      setError("Voice synthesis failed. Check your ElevenLabs key.");
      lockedRef.current = false;
      setVoiceState("listening");
      startListening();
    }
  }, []);

  const askSpinoza = useCallback(async (text) => {
    if (!text.trim()) return;
    setVoiceState("thinking");
    setTranscript(text);
    try {
      const history = [...messages, { role:"user", content:text }];
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL, max_tokens:300,
          messages:[
            { role:"system", content: SPINOZA_SYSTEM_PROMPT + "\n\nIMPORTANT: You are in voice mode. Keep your response to 2-3 sentences maximum. No markdown, no lists, just natural spoken words." },
            ...history.map(m=>({role:m.role,content:m.content}))
          ]
        })
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      const reply = d.choices?.[0]?.message?.content || "";
      onNewExchange(text, reply);
      speak(reply);
    } catch(e) {
      setError(e.message || "Connection failed.");
      lockedRef.current = false;
      setVoiceState("listening");
      startListening();
    }
  }, [messages, speak, onNewExchange]);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError("Speech recognition not supported. Use Chrome or Edge."); return; }
    if (listeningRef.current) return;

    const rec = new SR();
    rec.continuous      = false;
    rec.interimResults  = true;
    rec.lang            = ""; // auto-detect language

    rec.onstart  = () => { listeningRef.current = true; };
    rec.onend    = () => { listeningRef.current = false; };

    rec.onresult = (e) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setTranscript(final || interim);
      if (final && !lockedRef.current) {
        lockedRef.current = true;
        rec.stop();
        askSpinoza(final);
      }
    };

    rec.onerror = (e) => {
      listeningRef.current = false;
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setError(`Mic error: ${e.error}`);
      } else if (!lockedRef.current) {
        setTimeout(() => startListening(), 300);
      }
    };

    recognitionRef.current = rec;
    try { rec.start(); } catch(e) {}
  }, [askSpinoza]);

  useEffect(() => {
    startListening();
    return () => {
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch(e){} }
      if (audioRef.current) { audioRef.current.pause(); }
    };
  }, []);

  const stateLabel = { listening:"Listening…", thinking:"Contemplating…", speaking:"Speaking…" };
  const stateColor = { listening:"rgba(201,169,110,0.8)", thinking:"rgba(139,158,183,0.8)", speaking:"rgba(201,169,110,1)" };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:100,
      background:"rgba(8,6,3,0.97)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'EB Garamond',Georgia,serif",
      animation:"fadein 0.4s ease forwards"
    }}>
      <audio ref={audioRef} style={{display:"none"}}/>

      {/* Close button */}
      <button onClick={onClose} style={{
        position:"absolute", top:24, right:24,
        background:"none", border:"1px solid rgba(201,169,110,0.2)",
        borderRadius:2, width:36, height:36, cursor:"pointer",
        color:"#C9A96E", display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all 0.2s"
      }}>
        <CloseIcon/>
      </button>

      {/* Ambient rings */}
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
        {[180,260,340].map((s,i)=>(
          <div key={i} style={{
            position:"absolute", width:s, height:s, borderRadius:"50%",
            border:"1px solid rgba(201,169,110,0.06)",
            animation: voiceState==="speaking" ? `ringpulse 2s ease-in-out ${i*0.4}s infinite` : "none"
          }}/>
        ))}
      </div>

      {/* Main icon */}
      <div style={{marginBottom:32, position:"relative", zIndex:1}}>
        <SpinozaIcon size={80} pulse={voiceState==="thinking"} speaking={voiceState==="speaking"}/>
      </div>

      {/* State label */}
      <div style={{
        fontFamily:"'Cinzel',serif", fontSize:"0.75em", letterSpacing:"0.18em",
        textTransform:"uppercase", color:stateColor[voiceState],
        marginBottom:20, transition:"color 0.5s",
        animation: voiceState==="listening" ? "breathe 2s ease-in-out infinite" : "none"
      }}>
        {stateLabel[voiceState]}
      </div>

      {/* Waveform */}
      <div style={{marginBottom:28}}>
        <Waveform active={voiceState==="listening"} speaking={voiceState==="speaking"}/>
      </div>

      {/* Transcript / Response */}
      <div style={{
        maxWidth:480, width:"100%", padding:"0 32px",
        minHeight:80, textAlign:"center"
      }}>
        {voiceState==="listening" && transcript && (
          <p style={{color:"#8B9EB7",fontSize:"1.05em",fontStyle:"italic",lineHeight:1.7,animation:"fadein 0.3s ease"}}>
            "{transcript}"
          </p>
        )}
        {voiceState==="thinking" && (
          <div>
            <p style={{color:"#6B5C3E",fontSize:"0.95em",fontStyle:"italic",marginBottom:16}}>"{transcript}"</p>
            <div style={{display:"flex",justifyContent:"center"}}><LoadingDots/></div>
          </div>
        )}
        {voiceState==="speaking" && response && (
          <p style={{color:"#D4C5A9",fontSize:"1.05em",lineHeight:1.75,animation:"fadein 0.4s ease"}}>
            {response}
          </p>
        )}
        {!transcript && voiceState==="listening" && (
          <p style={{color:"#2A2015",fontSize:"0.9em",fontStyle:"italic"}}>
            Speak your question…
          </p>
        )}
      </div>

      {error && (
        <p style={{color:"#7A3A2A",fontSize:"0.85em",fontStyle:"italic",marginTop:20,padding:"0 32px",textAlign:"center"}}>
          {error}
        </p>
      )}

      {/* Bottom label */}
      <p style={{
        position:"absolute", bottom:28,
        fontFamily:"'Cinzel',serif", fontSize:"0.58em",
        letterSpacing:"0.14em", color:"#1A1409", textTransform:"uppercase"
      }}>
        Sub specie aeternitatis
      </p>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function SpinozaAI() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  if (!GROQ_API_KEY || !ELEVENLABS_API_KEY) return <MissingKeyWarning/>;

  const send = async () => {
    const t = input.trim(); if (!t||loading) return;
    const next = [...messages,{role:"user",content:t}];
    setMessages(next); setInput("");
    if (textareaRef.current) textareaRef.current.style.height="auto";
    setLoading(true); setError(null);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${GROQ_API_KEY}`},
        body:JSON.stringify({model:GROQ_MODEL,max_tokens:1000,
          messages:[{role:"system",content:SPINOZA_SYSTEM_PROMPT},...next.map(m=>({role:m.role,content:m.content}))]})
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      setMessages(p=>[...p,{role:"assistant",content:d.choices?.[0]?.message?.content||""}]);
    } catch(e) { setError(e.message||"Connection failed."); }
    finally { setLoading(false); }
  };

  const onKey   = e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} };
  const onInput = e=>{
    setInput(e.target.value);
    const ta=textareaRef.current;
    if(ta){ta.style.height="auto";ta.style.height=Math.min(ta.scrollHeight,140)+"px";}
  };

  const handleNewExchange = (userText, aiText) => {
    setMessages(p=>[...p,{role:"user",content:userText},{role:"assistant",content:aiText}]);
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
        @keyframes iconpulse{0%,100%{opacity:0.6;transform:scale(0.95)}50%{opacity:1;transform:scale(1.05)}}
        @keyframes iconspeaking{from{transform:scale(1)}to{transform:scale(1.08)}}
        @keyframes ringpulse{0%,100%{transform:scale(1);opacity:0.06}50%{transform:scale(1.08);opacity:0.14}}
        @keyframes breathe{0%,100%{opacity:0.7}50%{opacity:1}}
        @keyframes wave{from{transform:scaleY(0.2)}to{transform:scaleY(1)}}

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
        .hdr-right{margin-left:auto;display:flex;align-items:center;gap:8px}
        .groq-badge{display:flex;align-items:center;gap:6px;
          background:rgba(74,124,89,.07);border:1px solid rgba(74,124,89,.18);border-radius:2px;padding:5px 10px}
        .groq-badge span{font-family:'Cinzel',serif;font-size:.58em;color:#4A7C59;letter-spacing:.1em;text-transform:uppercase}

        .voice-btn{display:flex;align-items:center;gap:7px;
          background:rgba(201,169,110,.07);border:1px solid rgba(201,169,110,.25);
          border-radius:2px;padding:6px 12px;cursor:pointer;transition:all .2s;color:#C9A96E}
        .voice-btn:hover{background:rgba(201,169,110,.14);border-color:rgba(201,169,110,.45)}
        .voice-btn span{font-family:'Cinzel',serif;font-size:.58em;letter-spacing:.1em;text-transform:uppercase}

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
          .groq-badge{display:none}
        }
      `}</style>

      {voiceMode && (
        <VoiceMode
          onClose={() => setVoiceMode(false)}
          messages={messages}
          onNewExchange={handleNewExchange}
        />
      )}

      <div className="root">
        <div className="bgtex"/><div className="bglin"/>

        <div className="hdr">
          <div className="hdr-in">
            <SpinozaIcon/>
            <div>
              <h1>BARUCH DE SPINOZA</h1>
              <p>Philosopher · Amsterdam, 1677 · Deus sive Natura</p>
            </div>
            <div className="hdr-right">
              <div className="groq-badge">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <circle cx="5.5" cy="5.5" r="4.7" stroke="#4A7C59" strokeWidth="1"/>
                  <path d="M3 5.5C3 4.2 4.1 3.2 5.5 3.2s2.5.9 2.5 2.3C8 6.9 7.2 7.9 5.5 7.9L5.5 6.5" stroke="#4A7C59" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                <span>Groq · Llama 3.3</span>
              </div>
              <button className="voice-btn" onClick={() => setVoiceMode(true)}>
                <MicIcon active={false}/>
                <span>Voice</span>
              </button>
            </div>
          </div>
        </div>

        <div className="chat">
          <div className="msgs">
            {messages.map((m,i)=>(
              <div key={i} className={`msg ${m.role}`}>
                <div className="msg-av">{m.role==="assistant"?<SpinozaIcon size={34}/>:<UserIcon/>}</div>
                <div className="msg-body">
                  <div className="msg-lbl">{m.role==="assistant"?"Baruch de Spinoza":"Interlocutor"}</div>
                  <div className={`bubble ${m.role==="assistant"?"ai":"user"}`}>
                    {m.role==="assistant"?renderContent(m.content):m.content}
                  </div>
                </div>
              </div>
            ))}
            {loading&&(
              <div className="msg assistant">
                <div className="msg-av"><SpinozaIcon size={34}/></div>
                <div className="msg-body">
                  <div className="load-lbl">Baruch de Spinoza</div>
                  <div className="load-bub"><LoadingDots/></div>
                </div>
              </div>
            )}
            {error&&<div className="err">{error}</div>}
            <div ref={bottomRef}/>
          </div>
        </div>

        <div className="inp-area">
          <div className="inp-in">
            <div className="inp-wrap">
              <textarea ref={textareaRef} value={input} onChange={onInput} onKeyDown={onKey}
                placeholder="Ask Spinoza anything… or press Voice to speak" rows={1}/>
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
