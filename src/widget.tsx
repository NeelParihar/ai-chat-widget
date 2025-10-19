/*
  Entry point for the embeddable widget. This file exposes a global that
  mounts the widget into a Shadow DOM to avoid page CSS collisions.
*/
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

type AgentWidgetConfig = {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
  };
  agent?: { name?: string; avatar?: string };
  enableVoice?: boolean;
  context?: string;
  languageOptions?: string[];
};

declare global {
  interface Window {
    AgentWidgetConfig?: AgentWidgetConfig;
    AgentWidget?: { open: () => void; close: () => void; toggle: () => void };
  }
}

const defaultConfig: Required<
  Pick<
    AgentWidgetConfig,
    "position" | "theme" | "agent" | "enableVoice" | "languageOptions"
  >
> &
  Pick<AgentWidgetConfig, "context"> = {
  position: "bottom-right",
  theme: {
    primaryColor: "#4F46E5",
    backgroundColor: "#ffffff",
    textColor: "#111827",
    fontFamily:
      "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  agent: { name: "HelperBot", avatar: "" },
  enableVoice: true,
  languageOptions: ["en", "hi", "es"],
  context: undefined,
};

function useConfig(): AgentWidgetConfig {
  const [cfg, setCfg] = useState<AgentWidgetConfig>(() => ({
    ...defaultConfig,
    ...(window.AgentWidgetConfig ?? {}),
  }));
  useEffect(() => {
    // Pull latest config on mount in case the host updated it just-in-time
    setCfg((prev) => ({ ...prev, ...(window.AgentWidgetConfig ?? {}) }));
  }, []);
  return cfg;
}

function SvgIcon({
  path,
  size = 20,
  title,
}: {
  path: string;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      <path d={path} fill="currentColor" />
    </svg>
  );
}

const ICONS = {
  chat: "M4 4h16v10H7l-3 3V4z",
  mic: "M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2z",
  send: "M2 21l21-9L2 3v7l15 2-15 2v7z",
  close:
    "M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.29 9.17 12 2.89 5.71 4.3 4.29 10.59 10.6l6.3-6.3 1.41 1.41z",
  globe:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.1 0 2.1.9 3 2.4.9 1.4 1.5 3.2 1.8 5.1H7.2c.3-1.9.9-3.7 1.8-5.1C9.9 4.9 10.9 4 12 4zm0 16c-1.1 0-2.1-.9-3-2.4-.9-1.4-1.5-3.2-1.8-5.1h9.6c-.3 1.9-.9 3.7-1.8 5.1-.9 1.5-1.9 2.4-3 2.4z",
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  lang: string;
};

export function Widget() {
  const config = useConfig();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"chat" | "voice">(
    config.enableVoice ? "voice" : "chat"
  );
  const [lang, setLang] = useState(config.languageOptions?.[0] ?? "en");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  type SpeechRecognitionLike = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult:
      | ((e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void)
      | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  };
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);

  const styles = useMemo(() => {
    const primary =
      config.theme?.primaryColor ?? defaultConfig.theme.primaryColor;
    const bg =
      config.theme?.backgroundColor ?? defaultConfig.theme.backgroundColor;
    const text = config.theme?.textColor ?? defaultConfig.theme.textColor;
    const font = config.theme?.fontFamily ?? defaultConfig.theme.fontFamily;
    return { primary, bg, text, font };
  }, [config]);

  useEffect(() => {
    const api: NonNullable<Window["AgentWidget"]> = {
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen((prev) => !prev),
    };
    window.AgentWidget = api;
    return () => {
      if (window.AgentWidget === api) delete window.AgentWidget;
    };
  }, []);

  useEffect(() => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    )
      return;
    if (!config.enableVoice) return;
    type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
    interface WindowWithSR extends Window {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }
    const wsr = window as WindowWithSR;
    const SR: SpeechRecognitionConstructor | undefined =
      wsr.SpeechRecognition || wsr.webkitSpeechRecognition;
    if (!SR) return;
    const rec: SpeechRecognitionLike = new SR();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e: {
      results: ArrayLike<{ 0: { transcript: string } }>;
    }) => {
      // Aggregate interim and final transcripts so the user sees what will be sent
      const list = Array.from(
        e.results as ArrayLike<{ 0: { transcript: string } }>
      );
      const transcript = list
        .map((r) => (r && r[0] ? r[0].transcript : ""))
        .join(" ")
        .trim();
      setInput(transcript);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
  }, [lang, config.enableVoice]);

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      lang,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      interface WindowWithApiBase extends Window {
        __AGENT_WIDGET_API_BASE__?: string;
      }
      const w = window as WindowWithApiBase;
      const apiBase = w.__AGENT_WIDGET_API_BASE__ || "";
      const res = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.text,
          })),
          context: config.context,
          lang,
        }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data.reply ?? "",
        lang,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (mode === "voice" && config.enableVoice && data.reply) {
        const utter = new SpeechSynthesisUtterance(data.reply);
        utter.lang = lang;
        window.speechSynthesis.speak(utter);
      }
    } catch {
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "Sorry, something went wrong.",
        lang,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  }

  const containerPosition: React.CSSProperties = useMemo(() => {
    const base: React.CSSProperties = { position: "fixed", zIndex: 2147483000 };
    switch (config.position ?? "bottom-right") {
      case "bottom-right":
        return { ...base, bottom: 16, right: 16 };
      case "bottom-left":
        return { ...base, bottom: 16, left: 16 };
      case "top-right":
        return { ...base, top: 16, right: 16 };
      case "top-left":
        return { ...base, top: 16, left: 16 };
    }
  }, [config.position]);

  return (
    <div style={containerPosition}>
      {!open && (
        <button
          aria-label="Open agent"
          onClick={() => setOpen(true)}
          style={{
            background: styles.primary,
            color: "#fff",
            border: "none",
            borderRadius: 999,
            width: 56,
            height: 56,
            boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          <SvgIcon path={ICONS.chat} size={24} title="Open chat" />
        </button>
      )}
      {open && (
        <div
          style={{
            width: 360,
            height: 520,
            background: styles.bg,
            color: styles.text,
            fontFamily: styles.font,
            borderRadius: 16,
            boxShadow: "0 16px 48px rgba(0,0,0,0.24)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 12px",
              background: styles.primary,
              color: "#fff",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}
            >
              {config.agent?.avatar ? (
                <img
                  src={config.agent.avatar}
                  alt={config.agent?.name ?? "Agent"}
                  width={28}
                  height={28}
                  style={{ borderRadius: 999 }}
                />
              ) : (
                <SvgIcon path={ICONS.chat} size={22} />
              )}
              <strong>{config.agent?.name ?? "HelperBot"}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                }}
              >
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  style={{
                    borderRadius: 6,
                    border: "none",
                    padding: "4px 6px",
                  }}
                >
                  {(
                    config.languageOptions ?? defaultConfig.languageOptions
                  ).map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              {config.enableVoice && (
                <div
                  role="tablist"
                  aria-label="Mode"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 2,
                    background: "rgba(255,255,255,0.18)",
                    borderRadius: 999,
                    padding: 2,
                  }}
                >
                  <button
                    role="tab"
                    aria-selected={mode === "chat"}
                    onClick={() => setMode("chat")}
                    title="Chat mode"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: mode === "chat" ? "#fff" : "transparent",
                      color: mode === "chat" ? styles.primary : "#fff",
                      border: "none",
                      borderRadius: 999,
                      padding: "6px 10px",
                      cursor: "pointer",
                      transition: "background 120ms ease, color 120ms ease",
                    }}
                  >
                    <SvgIcon path={ICONS.chat} size={14} />
                  </button>
                  <button
                    role="tab"
                    aria-selected={mode === "voice"}
                    onClick={() => setMode("voice")}
                    title="Voice mode"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: mode === "voice" ? "#fff" : "transparent",
                      color: mode === "voice" ? styles.primary : "#fff",
                      border: "none",
                      borderRadius: 999,
                      padding: "6px 10px",
                      cursor: "pointer",
                      transition: "background 120ms ease, color 120ms ease",
                    }}
                  >
                    <SvgIcon path={ICONS.mic} size={14} />
                  </button>
                </div>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  background: "transparent",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <SvgIcon path={ICONS.close} size={20} />
              </button>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              padding: 12,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                }}
              >
                <div
                  style={{
                    background:
                      m.role === "user" ? styles.primary : "rgba(0,0,0,0.06)",
                    color: m.role === "user" ? "#fff" : styles.text,
                    padding: "8px 10px",
                    borderRadius: 12,
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ opacity: 0.7, fontSize: 12 }}>Thinking…</div>
            )}
          </div>
          <div
            style={{
              padding: 10,
              borderTop: "1px solid rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {mode === "chat" ? (
              <>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.15)",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  aria-label="Send"
                  style={{
                    background: styles.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 12px",
                    cursor: "pointer",
                  }}
                >
                  <SvgIcon path={ICONS.send} size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  className={`aw-mic ${listening ? "aw-mic--listening" : ""}`}
                  onClick={() => {
                    if (!recognitionRef.current) return;
                    if (!listening) {
                      recognitionRef.current.lang = lang;
                      try {
                        recognitionRef.current.start();
                        setListening(true);
                      } catch {
                        setListening(false);
                      }
                    } else {
                      recognitionRef.current.stop();
                      setListening(false);
                    }
                  }}
                  style={{
                    background: listening ? "#ef4444" : styles.primary,
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <SvgIcon path={ICONS.mic} size={18} />
                </button>
                <div
                  aria-live="polite"
                  title="Your spoken text"
                  style={{
                    flex: 1,
                    minHeight: 40,
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(0,0,0,0.12)",
                    color: input ? styles.text : "rgba(0,0,0,0.55)",
                    background: "rgba(255,255,255,0.9)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {input ||
                    (listening ? "Listening…" : "Tap mic to start speaking")}
                </div>
                <button
                  onClick={() => input && sendMessage(input)}
                  aria-label="Send"
                  disabled={!input.trim()}
                  style={{
                    background: styles.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 12px",
                    cursor: input.trim() ? "pointer" : "not-allowed",
                    opacity: input.trim() ? 1 : 0.7,
                  }}
                >
                  <SvgIcon path={ICONS.send} size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function mountIntoShadow() {
  const hostId = "agent-widget-host";
  let host = document.getElementById(hostId);
  if (!host) {
    host = document.createElement("div");
    host.id = hostId;
    document.body.appendChild(host);
  }
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  const container = document.createElement("div");
  shadow.appendChild(container);

  const style = document.createElement("style");
  style.textContent = `:host{all:initial}
  .aw-mic{position:relative; width:40px; height:40px; display:grid; place-items:center; border-radius:999px; border:none; box-shadow:0 4px 12px rgba(0,0,0,0.15);}
  .aw-mic:hover{transform:translateY(-1px); box-shadow:0 6px 16px rgba(0,0,0,0.2)}
  .aw-mic--listening{isolation:isolate}
  .aw-mic--listening::after{content:""; position:absolute; inset:-6px; border-radius:999px; border:2px solid rgba(239,68,68,0.5); animation:awPulse 1.2s ease-out infinite; z-index:-1}
  @keyframes awPulse{0%{opacity:.8; transform:scale(1)}100%{opacity:0; transform:scale(1.6)}}
  .aw-voice-input{min-height:40px;}
  `;
  shadow.appendChild(style);

  const root = createRoot(container);
  root.render(<Widget />);
}

// Auto-mount on load in browser contexts
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountIntoShadow);
  } else {
    mountIntoShadow();
  }
}
