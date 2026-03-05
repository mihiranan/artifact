"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";
import { Proposal, Role, GenerationStatus } from "@/lib/types";
import { AndyFace } from "@/components/andy-face";

const GRADIENT_OPEN =
  "radial-gradient(ellipse at 100% 100%, rgba(168,85,247,0.28) 0%, rgba(139,92,246,0.12) 30%, rgba(99,102,241,0.06) 55%, transparent 80%)";
const GRADIENT_GLOW =
  "radial-gradient(circle at 100% 100%, rgba(168,85,247,0.6) 0%, rgba(168,85,247,0.3) 35%, transparent 70%)";
const GRADIENT_IDLE =
  "radial-gradient(circle at 100% 100%, rgba(168,85,247,0.35) 0%, rgba(168,85,247,0.15) 35%, transparent 70%)";
const MASK_STYLE =
  "radial-gradient(ellipse at 100% 100%, black 0%, black 40%, transparent 80%)";

function StreamingWords({ text }: { text: string }) {
  const committed = useRef("");
  const [parts, setParts] = useState<{ old: string; fresh: string }>({
    old: "",
    fresh: text,
  });

  useEffect(() => {
    const prev = committed.current;
    const fresh = text.slice(prev.length);
    setParts({ old: prev, fresh });

    const id = setTimeout(() => {
      committed.current = text;
    }, 200);
    return () => clearTimeout(id);
  }, [text]);

  return (
    <span>
      {parts.old}
      <span className="stream-fade-in">{parts.fresh}</span>
    </span>
  );
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatBotProps {
  proposal?: Proposal;
  currentRole?: Role;
  token?: string;
  decorative?: boolean;
  processingPhase?: GenerationStatus | null;
  editResultQuip?: { msg: string; key: number } | null;
  latestAndyMessage?: { msg: string; key: number } | null;
  glowPulse?: boolean;
}

export function ChatBot(props: ChatBotProps = {}) {
  if (props.decorative) return <ChatBotDecorative glowPulse={props.glowPulse} />;
  return <ChatBotFull {...props} />;
}

function ChatBotFull({ proposal, currentRole, token, processingPhase, editResultQuip, latestAndyMessage, glowPulse }: ChatBotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [quip, setQuip] = useState<{ text: string; dismissable: boolean } | null>(null);

  const isProcessing = !!processingPhase && processingPhase !== "idle";

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!latestAndyMessage) return;
    if (!latestAndyMessage.msg) { setQuip(null); return; }
    setQuip({ text: latestAndyMessage.msg, dismissable: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestAndyMessage?.key]);

  // Edit result quips (from inline editing)
  useEffect(() => {
    if (!editResultQuip) return;
    setQuip({ text: editResultQuip.msg, dismissable: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editResultQuip?.key]);

  // Dismiss bubble on any click outside the chatbot
  useEffect(() => {
    if (!quip) return;
    function handleClick(e: MouseEvent) {
      const bot = document.querySelector("[data-chatbot]");
      if (bot?.contains(e.target as Node)) return;
      setQuip(null);
    }
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [quip]);

  const chatAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (chatAreaRef.current && !chatAreaRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    try {
      const url = proposal
        ? `/api/proposals/${proposal.id}/chat?t=${token}`
        : `/api/chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          ...(currentRole ? { role: currentRole } : {}),
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to get response");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamingText(accumulated);
      }

      setStreaming(false);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: accumulated },
      ]);
      setStreamingText("");
    } catch {
      setStreaming(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't process that. Please try again.",
        },
      ]);
      setStreamingText("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div ref={chatAreaRef}>
      {/* Corner gradient backdrop — expands when chat is open */}
      <motion.div
        className="pointer-events-none fixed bottom-0 right-0 z-40"
        animate={{
          width: open ? "min(520px, 100vw)" : 260,
          height: open ? "calc(100vh - 40px)" : 260,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div
          className="absolute inset-0 backdrop-blur-xl"
          style={{
            background: open ? GRADIENT_OPEN : glowPulse ? GRADIENT_GLOW : GRADIENT_IDLE,
            mask: MASK_STYLE,
            WebkitMask: MASK_STYLE,
            transition: "background 0.4s ease-out",
          }}
        />
      </motion.div>

      {/* Chat overlay — messages + input floating over the gradient */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-32 right-5 z-50 flex w-[380px] max-h-[calc(100vh-180px)] flex-col"
          >
            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-2 pb-3 pt-12 space-y-2.5 hide-scrollbar"
              style={{
                mask: "linear-gradient(to bottom, transparent 0%, black 48px, black 100%)",
                WebkitMask: "linear-gradient(to bottom, transparent 0%, black 48px, black 100%)",
              }}
            >

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={msg.role === "user" ? { opacity: 0, y: 10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-foreground/90 text-background backdrop-blur-sm rounded-br-sm"
                        : "bg-background/70 text-foreground backdrop-blur-sm border border-border/30 rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="chat-md"><Markdown>{msg.content}</Markdown></div>
                    )}
                  </div>
                </motion.div>
              ))}

              {streaming && streamingText && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-background/70 backdrop-blur-sm border border-border/30 px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground shadow-sm">
                    <StreamingWords text={streamingText} />
                  </div>
                </motion.div>
              )}

              {streaming && !streamingText && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-background/70 backdrop-blur-sm border border-border/30 px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce" />
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0.15s]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center h-12 rounded-full bg-background/70 backdrop-blur-sm border border-border/30 pl-5 pr-[5px] shadow-sm focus-within:border-purple-400/40 transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={proposal ? "I've read the whole doc so you don't have to…" : "Ask me anything about Artifact…"}
                  className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/50 mr-2"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || streaming}
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-foreground/80 text-background transition-opacity disabled:opacity-20"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smiley button */}
      <motion.div
        data-chatbot
        className="fixed bottom-6 right-6 z-50 group"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
      >
        <div className={`pointer-events-none absolute -top-11 right-1/2 translate-x-1/2 transition-opacity duration-200 ${!open && !quip ? "opacity-0 group-hover:opacity-100" : "opacity-0"}`}>
          <div className="relative rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background shadow-md whitespace-nowrap">
            Andy
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-foreground" />
          </div>
        </div>
        <AnimatePresence>
          {quip && !open && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`absolute bottom-full right-0 mb-3 w-[320px] ${quip.dismissable ? "pointer-events-auto" : "pointer-events-none"}`}
            >
              <div
                className="relative cursor-pointer rounded-2xl bg-foreground px-3.5 py-2 text-[12px] leading-snug font-medium text-background shadow-lg"
                onClick={() => setQuip(null)}
              >
                {quip.text}
                <div className="absolute -bottom-1 right-8 h-2.5 w-2.5 rotate-45 bg-foreground" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {open && (
            <motion.span
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              className="pointer-events-none absolute -left-[9rem] bottom-5 text-[11px] italic text-muted-foreground/60 whitespace-nowrap select-none"
            >
              P.S. I also go by <span className="font-medium not-italic text-muted-foreground/80">&y</span>
            </motion.span>
          )}
        </AnimatePresence>
        <motion.button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-center focus:outline-none"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          aria-label="Chat about this document"
          data-tour="chatbot"
        >
          <AndyFace size={84} color="currentColor" blink />
        </motion.button>
      </motion.div>
    </div>
  );
}

function ChatBotDecorative({ glowPulse }: { glowPulse?: boolean }) {
  return (
    <div>
      <motion.div
        className="pointer-events-none fixed bottom-0 right-0 z-40"
        animate={{ width: 260, height: 260 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div
          className="absolute inset-0 backdrop-blur-xl"
          style={{
            background: glowPulse ? GRADIENT_GLOW : GRADIENT_IDLE,
            mask: MASK_STYLE,
            WebkitMask: MASK_STYLE,
            transition: "background 0.4s ease-out",
          }}
        />
      </motion.div>
      <motion.div
        className="fixed bottom-6 right-6 z-50 group"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
      >
        <div className="pointer-events-none absolute -top-11 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="relative rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background shadow-md whitespace-nowrap">
            Andy
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-foreground" />
          </div>
        </div>
        <div className="flex items-center justify-center">
          <AndyFace size={84} color="currentColor" blink />
        </div>
      </motion.div>
    </div>
  );
}
