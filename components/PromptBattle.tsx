// components/PromptBattle.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { BRIEFS, Brief } from "../data/briefs";

interface PromptBattleProps {
  onBackToHub?: () => void;
}

interface Player {
  name: string;
  color: string;
}

interface Submission {
  playerName: string;
  prompt: string;
  imageUrl: string | null;
}

interface VoteRecord {
  voter: string;
  votedFor: string;
}

type Phase = "lobby" | "brief" | "writing" | "generating" | "voting" | "reveal" | "finished";

const TOTAL_ROUNDS = 5;
const WRITING_SECONDS = 30;
const VOTING_SECONDS = 15;
const REVEAL_SECONDS = 6;
const BRIEF_SECONDS = 3;

// Timer SFX behaviour: starts at this many seconds remaining, fades in over 1.5s.
const WARNING_THRESHOLD = 5;
const TIMER_TARGET_VOLUME = 0.6;
const TIMER_FADE_MS = 1500;

const AVATAR_PALETTE = ["#fdb648", "#fc2560", "#4d5dfb", "#25e4a2", "#a78bfa", "#fb923c", "#34d399", "#60a5fa"];
const AVATAR_TEXT: Record<string, string> = {
  "#fdb648": "#333333",
  "#fc2560": "#ffffff",
  "#4d5dfb": "#ffffff",
  "#25e4a2": "#333333",
  "#a78bfa": "#ffffff",
  "#fb923c": "#333333",
  "#34d399": "#333333",
  "#60a5fa": "#333333",
};

const getPlayerColor = (name: string) => {
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const podiumColor = (idx: number) => {
  if (idx === 0) return "#fdb648";
  if (idx === 1) return "#888888";
  if (idx === 2) return "#25e4a2";
  return "#555555";
};

export default function PromptBattle({ onBackToHub }: PromptBattleProps) {
  // Identity
  const [playerName, setPlayerName] = useState("");
  const [inLobby, setInLobby] = useState(false);
  const playerNameRef = useRef("");

  // Roster
  const [players, setPlayers] = useState<Player[]>([]);

  // Phase
  const [phase, setPhase] = useState<Phase>("lobby");
  const phaseRef = useRef<Phase>("lobby");
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Round state
  const [roundBriefs, setRoundBriefs] = useState<Brief[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(WRITING_SECONDS);

  // My submission for this round
  const [myPrompt, setMyPrompt] = useState("");
  const [mySubmitted, setMySubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);

  // All submissions for this round
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const submissionsRef = useRef<Submission[]>([]);
  useEffect(() => { submissionsRef.current = submissions; }, [submissions]);

  // Voting
  const [myVote, setMyVote] = useState<string | null>(null);
  const [votes, setVotes] = useState<VoteRecord[]>([]);

  // Cumulative scoring
  const [scores, setScores] = useState<Record<string, number>>({});

  // Audio (timer SFX)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Channel
  const channelRef = useRef<any>(null);

  // ─────────────────────────────────────────────────────────────
  // Audio: timer.wav warning SFX
  // Plays during the final WARNING_THRESHOLD seconds of writing &
  // voting phases, fading in from silence to TIMER_TARGET_VOLUME.
  // Stops cleanly when time hits zero or the phase changes.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio("/music/timer.wav");
    audio.loop = false;
    audio.volume = 0;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const inWarningWindow =
      (phase === "writing" || phase === "voting") &&
      timeLeft > 0 &&
      timeLeft <= WARNING_THRESHOLD;

    if (inWarningWindow && audio.paused) {
      // Start fresh from silence and fade in
      audio.currentTime = 0;
      audio.volume = 0;
      audio.play().catch(() => {});

      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

      const startTime = Date.now();
      fadeIntervalRef.current = setInterval(() => {
        if (!audioRef.current) return;
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(1, elapsed / TIMER_FADE_MS);
        audioRef.current.volume = TIMER_TARGET_VOLUME * ratio;
        if (ratio >= 1 && fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
      }, 50);
    } else if (!inWarningWindow && !audio.paused) {
      // Time's up, or we changed phase mid-warning — stop SFX
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0;
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    }
  }, [phase, timeLeft]);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Channel setup
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel("creamos-prompt-battle-room", {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "pb_player_joined" }, ({ payload }) => {
        setPlayers((prev) => {
          if (prev.some((p) => p.name === payload.name)) return prev;
          if (playerNameRef.current) {
            channelRef.current?.send({
              type: "broadcast",
              event: "pb_player_joined",
              payload: { name: playerNameRef.current },
            });
          }
          return [...prev, { name: payload.name, color: getPlayerColor(payload.name) }];
        });
      })
      .on("broadcast", { event: "pb_start_game" }, ({ payload }) => {
        setRoundBriefs(payload.briefs);
        setCurrentRound(0);
        setSubmissions([]);
        setVotes([]);
        setScores({});
        setMyPrompt("");
        setMySubmitted(false);
        setMyVote(null);
        setPhase("brief");
      })
      .on("broadcast", { event: "pb_submission" }, ({ payload }) => {
        setSubmissions((prev) => {
          if (prev.some((s) => s.playerName === payload.playerName)) return prev;
          return [...prev, payload as Submission];
        });
      })
      .on("broadcast", { event: "pb_vote" }, ({ payload }) => {
        setVotes((prev) => {
          if (prev.some((v) => v.voter === payload.voter)) return prev;
          return [...prev, payload as VoteRecord];
        });
      })
      .on("broadcast", { event: "pb_back_to_lobby" }, () => {
        setPhase("lobby");
        setPlayers([]);
        setRoundBriefs([]);
        setCurrentRound(0);
        setSubmissions([]);
        setVotes([]);
        setScores({});
        setMyPrompt("");
        setMySubmitted(false);
        setMyVote(null);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Announce self when entering lobby
  useEffect(() => {
    if (!inLobby || !playerName.trim()) return;
    channelRef.current?.send({
      type: "broadcast",
      event: "pb_player_joined",
      payload: { name: playerName.trim() },
    });
  }, [inLobby]);

  // Re-announce when returning to lobby after back_to_lobby
  useEffect(() => {
    if (phase !== "lobby" || !inLobby || !playerNameRef.current) return;
    const t = setTimeout(() => {
      channelRef.current?.send({
        type: "broadcast",
        event: "pb_player_joined",
        payload: { name: playerNameRef.current },
      });
    }, 150);
    return () => clearTimeout(t);
  }, [phase]);

  // ─────────────────────────────────────────────────────────────
  // Phase: BRIEF (3 second reveal)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "brief") return;
    setTimeLeft(BRIEF_SECONDS);
    const t = setTimeout(() => {
      setMyPrompt("");
      setMySubmitted(false);
      setSubmissions([]);
      setVotes([]);
      setMyVote(null);
      setPhase("writing");
    }, BRIEF_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [phase, currentRound]);

  // ─────────────────────────────────────────────────────────────
  // Phase: WRITING (30s timer)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "writing") return;
    setTimeLeft(WRITING_SECONDS);
  }, [phase]);

  useEffect(() => {
    if (phase !== "writing") return;
    if (timeLeft <= 0) {
      if (!mySubmitted) {
        if (myPrompt.trim().length >= 3) {
          submitMyPrompt();
        } else {
          submitEmpty();
        }
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, mySubmitted, myPrompt]);

  // When submissions are complete, move to voting
  useEffect(() => {
    if (phase !== "writing" && phase !== "generating") return;
    if (submissions.length >= players.length && players.length > 0 && mySubmitted) {
      setPhase("voting");
    }
  }, [submissions, players, phase, mySubmitted]);

  const submitMyPrompt = async () => {
    if (mySubmitted) return;
    const trimmed = myPrompt.trim();
    if (trimmed.length < 3) return;

    setMySubmitted(true);
    setGenerating(true);
    setPhase((p) => (p === "writing" ? "generating" : p));

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });

      let imageUrl: string | null = null;
      if (res.ok) {
        const data = await res.json();
        imageUrl = data.url ?? null;
      }

      channelRef.current?.send({
        type: "broadcast",
        event: "pb_submission",
        payload: {
          playerName: playerNameRef.current,
          prompt: trimmed,
          imageUrl,
        } as Submission,
      });
    } catch (err) {
      console.error("Image gen error:", err);
      channelRef.current?.send({
        type: "broadcast",
        event: "pb_submission",
        payload: {
          playerName: playerNameRef.current,
          prompt: trimmed,
          imageUrl: null,
        } as Submission,
      });
    } finally {
      setGenerating(false);
    }
  };

  const submitEmpty = () => {
    if (mySubmitted) return;
    setMySubmitted(true);
    channelRef.current?.send({
      type: "broadcast",
      event: "pb_submission",
      payload: {
        playerName: playerNameRef.current,
        prompt: "(no prompt submitted)",
        imageUrl: null,
      } as Submission,
    });
  };

  // ─────────────────────────────────────────────────────────────
  // Phase: VOTING (15s timer)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "voting") return;
    setTimeLeft(VOTING_SECONDS);
  }, [phase]);

  useEffect(() => {
    if (phase !== "voting") return;
    if (timeLeft <= 0) {
      setPhase("reveal");
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  useEffect(() => {
    if (phase !== "voting") return;
    if (votes.length >= players.length && players.length > 0) {
      setPhase("reveal");
    }
  }, [votes, players, phase]);

  const castVote = (votedFor: string) => {
    if (myVote || votedFor === playerNameRef.current) return;
    setMyVote(votedFor);
    channelRef.current?.send({
      type: "broadcast",
      event: "pb_vote",
      payload: {
        voter: playerNameRef.current,
        votedFor,
      } as VoteRecord,
    });
  };

  // ─────────────────────────────────────────────────────────────
  // Phase: REVEAL — tally votes, update scores, advance
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "reveal") return;

    const roundScores: Record<string, number> = {};
    votes.forEach((v) => {
      roundScores[v.votedFor] = (roundScores[v.votedFor] || 0) + 100;
    });

    setScores((prev) => {
      const next = { ...prev };
      Object.entries(roundScores).forEach(([name, pts]) => {
        next[name] = (next[name] || 0) + pts;
      });
      return next;
    });

    setTimeLeft(REVEAL_SECONDS);
    const t = setTimeout(() => {
      const nextRound = currentRound + 1;
      if (nextRound >= TOTAL_ROUNDS || nextRound >= roundBriefs.length) {
        setPhase("finished");
      } else {
        setCurrentRound(nextRound);
        setPhase("brief");
      }
    }, REVEAL_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "reveal") return;
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  // ─────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────
  const startGame = () => {
    const shuffled = [...BRIEFS].sort(() => Math.random() - 0.5).slice(0, TOTAL_ROUNDS);
    channelRef.current?.send({
      type: "broadcast",
      event: "pb_start_game",
      payload: { briefs: shuffled },
    });
  };

  const backToLobbyBroadcast = () => {
    channelRef.current?.send({ type: "broadcast", event: "pb_back_to_lobby" });
  };

  // ─────────────────────────────────────────────────────────────
  // Reusable chrome (back button, mute button, footer logo)
  // ─────────────────────────────────────────────────────────────
  const BackToGamesButton = () => {
    if (!onBackToHub) return null;
    return (
      <button
        onClick={onBackToHub}
        className="fixed top-4 left-4 z-50 px-4 py-2 rounded-full text-xs font-semibold transition-colors"
        style={{ backgroundColor: "#424242", color: "#888888" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#fdb648"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#888888"; }}
      >
        ← Back to Games
      </button>
    );
  };

  const MuteButton = () => (
    <button
      onClick={toggleMute}
      title={isMuted ? "Unmute" : "Mute"}
      className="fixed top-4 right-4 z-50 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
      style={{ backgroundColor: "#424242", color: isMuted ? "#555555" : "#fdb648" }}
    >
      {isMuted ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.68-7.94-6.47-9.38v2.12A8 8 0 0119 12zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a9.955 9.955 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      )}
    </button>
  );

  const FooterLogo = () => (
    <div
      className="fixed left-1/2 z-40 pointer-events-none"
      style={{ bottom: "1rem", transform: "translateX(-50%)" }}
    >
      <img
        src="/images/Creamos_PrimaryWordmark_WithTagline.svg"
        alt="Creamos"
        className="w-24"
        style={{ opacity: 0.3 }}
      />
    </div>
  );

  // ═════════════════════════════════════════════════════════════
  // RENDERING
  // ═════════════════════════════════════════════════════════════

  // JOIN SCREEN
  if (!inLobby) {
    return (
      <>
        <BackToGamesButton />
        <div
          className="flex flex-col items-center gap-8 py-16 px-6 text-center"
          style={{ animation: "fadeInUp 0.7s ease-out" }}
        >
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(20px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
            Prompt Battle
          </h1>
          <p className="text-base text-gray-400 max-w-sm">
            Get a creative brief, write the best prompt. AI generates the image. Funniest result wins.
          </p>

          <div className="w-full max-w-xs flex flex-col gap-3 mt-2">
            <input
              type="text"
              placeholder="Your name"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                playerNameRef.current = e.target.value;
              }}
              className="w-full px-4 py-3.5 rounded-xl text-white border focus:outline-none transition-colors text-center font-semibold text-lg"
              style={{ backgroundColor: "#424242", borderColor: "#555555", caretColor: "#25e4a2" }}
              onFocus={(e) => (e.target.style.borderColor = "#25e4a2")}
              onBlur={(e) => (e.target.style.borderColor = "#555555")}
            />
            <button
              onClick={() => setInLobby(true)}
              disabled={!playerName.trim()}
              className="w-full py-3.5 rounded-xl font-extrabold text-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#25e4a2", color: "#333333" }}
            >
              Enter the Lobby
            </button>
          </div>
        </div>
        <FooterLogo />
      </>
    );
  }

  // LOBBY SCREEN
  if (phase === "lobby") {
    const canStart = players.length >= 2;
    return (
      <>
        <BackToGamesButton />
        <div className="text-center w-full max-w-lg py-8 px-4">
          <style>{`
            @keyframes fadeInScale {
              from { opacity: 0; transform: scale(0.75); }
              to   { opacity: 1; transform: scale(1); }
            }
            @keyframes spinBorder {
              from { transform: translate(-50%, -50%) rotate(0deg); }
              to   { transform: translate(-50%, -50%) rotate(360deg); }
            }
            @keyframes pulseGlow {
              0%, 100% { opacity: 0.35; }
              50%      { opacity: 0.65; }
            }
          `}</style>

          <h1 className="text-5xl md:text-6xl font-black text-white mb-10">Prompt Battle</h1>

          <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: "#3d3d3d" }}>
            <p className="text-xs uppercase tracking-widest font-semibold mb-1 text-center" style={{ color: "#888888" }}>
              Waiting Room
            </p>
            <p className="text-xs mb-6 text-center" style={{ color: "#888888" }}>
              {players.length} {players.length === 1 ? "player" : "players"}
            </p>
            <div className="flex flex-wrap gap-5 justify-center min-h-[88px]">
              {players.length === 0 && (
                <p className="text-sm self-center" style={{ color: "#888888" }}>
                  No one here yet…
                </p>
              )}
              {players.map((player) => (
                <div
                  key={player.name}
                  className="flex flex-col items-center gap-2"
                  style={{ animation: "fadeInScale 0.3s ease-out" }}
                >
                  <div className="relative">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-extrabold select-none"
                      style={{
                        backgroundColor: player.color,
                        color: AVATAR_TEXT[player.color] ?? "#ffffff",
                      }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2"
                      style={{ backgroundColor: "#25e4a2", borderColor: "#3d3d3d" }}
                    />
                  </div>
                  <span className="text-xs font-medium max-w-[64px] truncate" style={{ color: "#888888" }}>
                    {player.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative w-full">
            {canStart && (
              <>
                <div className="absolute -inset-[3px] rounded-[15px] overflow-hidden" style={{ zIndex: 0 }}>
                  <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: "200%",
                    aspectRatio: "1",
                    background: "conic-gradient(from 0deg, #25e4a2, #fdb648, #fc2560, #4d5dfb, #25e4a2)",
                    animation: "spinBorder 2s linear infinite",
                  }} />
                </div>
                <div style={{
                  position: "absolute",
                  inset: "-10px",
                  borderRadius: "20px",
                  background: "conic-gradient(from 0deg, #25e4a2, #fdb648, #fc2560, #4d5dfb, #25e4a2)",
                  filter: "blur(16px)",
                  animation: "spinBorder 2s linear infinite, pulseGlow 1.5s ease-in-out infinite",
                  zIndex: 0,
                  top: "50%",
                  left: "50%",
                  width: "200%",
                  aspectRatio: "1",
                  transformOrigin: "center",
                }} />
              </>
            )}
            <button
              onClick={startGame}
              disabled={!canStart}
              className="relative w-full py-4 rounded-xl font-extrabold text-xl transition-all duration-200 disabled:cursor-not-allowed"
              style={{
                ...(canStart
                  ? { backgroundColor: "#25e4a2", color: "#333333" }
                  : { backgroundColor: "#424242", color: "#888888" }),
                zIndex: 1,
              }}
            >
              {canStart ? "START BATTLE FOR EVERYONE" : "Waiting for more players..."}
            </button>
          </div>

          <button
            onClick={backToLobbyBroadcast}
            className="mt-5 px-5 py-2 rounded-full border text-xs font-medium transition-all duration-200"
            style={{ borderColor: "#555555", color: "#888888" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#cccccc"; e.currentTarget.style.borderColor = "#888888"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#888888"; e.currentTarget.style.borderColor = "#555555"; }}
          >
            ↩ Reset Lobby
          </button>
        </div>
        <FooterLogo />
      </>
    );
  }

  // BRIEF REVEAL SCREEN
  if (phase === "brief") {
    const brief = roundBriefs[currentRound];
    return (
      <>
        <MuteButton />
        <div className="flex flex-col items-center justify-center text-center px-6" style={{ minHeight: "60vh" }}>
          <style>{`
            @keyframes briefPop {
              0%   { opacity: 0; transform: scale(0.85); }
              100% { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#888888" }}>
            Round {currentRound + 1} of {TOTAL_ROUNDS}
          </p>
          <p className="text-sm uppercase tracking-widest font-bold mb-6" style={{ color: "#25e4a2" }}>
            Your Brief
          </p>
          <h2
            className="text-3xl md:text-5xl font-black text-white max-w-2xl"
            style={{ animation: "briefPop 0.6s ease-out" }}
          >
            {brief?.text ?? "..."}
          </h2>
        </div>
        <FooterLogo />
      </>
    );
  }

  // WRITING SCREEN
  if (phase === "writing") {
    const brief = roundBriefs[currentRound];
    const progress = (timeLeft / WRITING_SECONDS) * 100;
    return (
      <>
        <MuteButton />
        <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ backgroundColor: "#3d3d3d" }}>
          <div
            className="h-1.5 transition-all duration-1000 ease-linear"
            style={{
              width: `${progress}%`,
              backgroundColor: timeLeft <= 5 ? "#fc2560" : "#25e4a2",
            }}
          />

          <div className="p-6 md:p-10">
            <div className="flex justify-between items-center mb-5">
              <span className="font-semibold text-sm" style={{ color: "#888888" }}>
                Round {currentRound + 1} / {TOTAL_ROUNDS}
              </span>
              <span
                className={`font-black text-3xl tabular-nums${timeLeft <= 5 ? " animate-pulse" : ""}`}
                style={{ color: timeLeft <= 5 ? "#fc2560" : "#25e4a2" }}
              >
                {timeLeft.toString().padStart(2, "0")}
              </span>
            </div>

            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "#888888" }}>
              Brief
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6">
              {brief?.text}
            </h2>

            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "#888888" }}>
              Your Prompt
            </p>
            <textarea
              value={myPrompt}
              onChange={(e) => setMyPrompt(e.target.value)}
              disabled={mySubmitted}
              placeholder="Describe the image you want to generate..."
              maxLength={500}
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-white border focus:outline-none transition-colors font-medium text-base resize-none disabled:opacity-50"
              style={{ backgroundColor: "#2a2a2a", borderColor: "#555555", caretColor: "#25e4a2" }}
              onFocus={(e) => (e.target.style.borderColor = "#25e4a2")}
              onBlur={(e) => (e.target.style.borderColor = "#555555")}
            />

            <div className="flex justify-between items-center mt-2 text-xs" style={{ color: "#888888" }}>
              <span>{myPrompt.length} / 500</span>
              <span>Min 3 characters</span>
            </div>

            <button
              onClick={submitMyPrompt}
              disabled={mySubmitted || myPrompt.trim().length < 3}
              className="w-full mt-4 py-3.5 rounded-xl font-extrabold text-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#25e4a2", color: "#333333" }}
            >
              {mySubmitted ? "✓ Submitted — waiting for others..." : "Lock In My Prompt"}
            </button>
          </div>
        </div>
        <FooterLogo />
      </>
    );
  }

  // GENERATING SCREEN
  if (phase === "generating") {
    return (
      <>
        <MuteButton />
        <div className="flex flex-col items-center justify-center text-center px-6" style={{ minHeight: "50vh" }}>
          <style>{`
            @keyframes spin360 { to { transform: rotate(360deg); } }
          `}</style>
          <div
            className="w-16 h-16 rounded-full mb-6"
            style={{
              border: "4px solid #424242",
              borderTopColor: "#25e4a2",
              animation: "spin360 1s linear infinite",
            }}
          />
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
            {generating ? "Cooking your image..." : "Waiting for the others..."}
          </h2>
          <p className="text-sm" style={{ color: "#888888" }}>
            {submissions.length} / {players.length} submissions in
          </p>
        </div>
        <FooterLogo />
      </>
    );
  }

  // VOTING SCREEN
  if (phase === "voting") {
    const progress = (timeLeft / VOTING_SECONDS) * 100;
    const myName = playerNameRef.current;
    return (
      <>
        <MuteButton />
        <div className="w-full max-w-5xl pb-16">
          <div
            className="h-1.5 rounded-full mb-6 transition-all duration-1000 ease-linear"
            style={{
              width: `${progress}%`,
              backgroundColor: timeLeft <= 5 ? "#fc2560" : "#fdb648",
            }}
          />

          <div className="flex justify-between items-center mb-6 px-2">
            <h2 className="text-2xl md:text-3xl font-black text-white">
              {myVote ? "Vote locked in" : "Vote for your favourite"}
            </h2>
            <span
              className={`font-black text-3xl tabular-nums${timeLeft <= 5 ? " animate-pulse" : ""}`}
              style={{ color: timeLeft <= 5 ? "#fc2560" : "#fdb648" }}
            >
              {timeLeft.toString().padStart(2, "0")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {submissions.map((sub) => {
              const isOwn = sub.playerName === myName;
              const isVoted = myVote === sub.playerName;
              const disabled = isOwn || !!myVote;
              return (
                <button
                  key={sub.playerName}
                  onClick={() => castVote(sub.playerName)}
                  disabled={disabled}
                  className="relative rounded-2xl overflow-hidden transition-all duration-200 disabled:cursor-not-allowed text-left"
                  style={{
                    backgroundColor: "#3d3d3d",
                    outline: isVoted ? "4px solid #fdb648" : "none",
                    outlineOffset: "-4px",
                    opacity: disabled && !isOwn && !isVoted ? 0.5 : 1,
                  }}
                >
                  {sub.imageUrl ? (
                    <img
                      src={sub.imageUrl}
                      alt={sub.prompt}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div
                      className="w-full aspect-square flex items-center justify-center text-xs px-4 text-center"
                      style={{ backgroundColor: "#2a2a2a", color: "#888888" }}
                    >
                      ⚠ Image generation failed
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs italic line-clamp-2" style={{ color: "#cccccc" }}>
                      "{sub.prompt}"
                    </p>
                    {isOwn && (
                      <p className="text-xs font-bold mt-1" style={{ color: "#25e4a2" }}>
                        Your entry
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {submissions.length < players.length && (
            <p className="text-center text-xs mt-4" style={{ color: "#888888" }}>
              {submissions.length} / {players.length} submissions in...
            </p>
          )}
        </div>
        <FooterLogo />
      </>
    );
  }

  // REVEAL SCREEN
  if (phase === "reveal") {
    const myName = playerNameRef.current;
    const voteCounts: Record<string, number> = {};
    votes.forEach((v) => { voteCounts[v.votedFor] = (voteCounts[v.votedFor] || 0) + 1; });
    const maxVotes = Math.max(0, ...Object.values(voteCounts));

    return (
      <>
        <MuteButton />
        <div className="w-full max-w-5xl pb-16">
          <h2 className="text-2xl md:text-3xl font-black text-white text-center mb-2">
            Round {currentRound + 1} Results
          </h2>
          <p className="text-center text-sm mb-6" style={{ color: "#888888" }}>
            {currentRound + 1 === TOTAL_ROUNDS ? "Final round!" : `Next round in ${timeLeft}s`}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {submissions.map((sub) => {
              const v = voteCounts[sub.playerName] || 0;
              const isWinner = v > 0 && v === maxVotes;
              return (
                <div
                  key={sub.playerName}
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: "#3d3d3d",
                    outline: isWinner ? "4px solid #fdb648" : "none",
                    outlineOffset: "-4px",
                  }}
                >
                  {isWinner && (
                    <div
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-black z-10"
                      style={{ backgroundColor: "#fdb648", color: "#333333" }}
                    >
                      👑 Winner
                    </div>
                  )}
                  {sub.imageUrl ? (
                    <img src={sub.imageUrl} alt={sub.prompt} className="w-full aspect-square object-cover" />
                  ) : (
                    <div
                      className="w-full aspect-square flex items-center justify-center text-xs px-4 text-center"
                      style={{ backgroundColor: "#2a2a2a", color: "#888888" }}
                    >
                      ⚠ Image generation failed
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs italic mb-2" style={{ color: "#cccccc" }}>
                      "{sub.prompt}"
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white">
                        {sub.playerName}
                        {sub.playerName === myName && (
                          <span className="ml-1 text-xs" style={{ color: "#25e4a2" }}>(you)</span>
                        )}
                      </span>
                      <span className="text-sm font-bold" style={{ color: "#fdb648" }}>
                        {v} {v === 1 ? "vote" : "votes"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <FooterLogo />
      </>
    );
  }

  // FINISHED SCREEN
  if (phase === "finished") {
    const ranked = Object.entries(scores)
      .map(([name, score]) => ({ name, score }))
      .sort((a, b) => b.score - a.score);

    players.forEach((p) => {
      if (!ranked.some((r) => r.name === p.name)) {
        ranked.push({ name: p.name, score: 0 });
      }
    });
    ranked.sort((a, b) => b.score - a.score);

    return (
      <>
        <BackToGamesButton />
        <div className="w-full max-w-lg">
          <div className="rounded-2xl p-8" style={{ backgroundColor: "#3d3d3d" }}>
            <h2 className="text-3xl font-black text-white text-center mb-1">Battle Complete!</h2>
            <p className="text-center font-bold text-xl mb-6" style={{ color: "#25e4a2" }}>
              Your Score: {scores[playerNameRef.current] || 0} pts
            </p>

            <div className="pt-5" style={{ borderTop: "1px solid #424242" }}>
              <h4 className="text-xs uppercase tracking-widest font-semibold mb-4 text-center" style={{ color: "#888888" }}>
                Final Leaderboard
              </h4>
              <ul className="flex flex-col gap-2">
                {ranked.map((player, idx) => (
                  <li
                    key={player.name}
                    className="flex justify-between items-center px-4 py-3 rounded-xl"
                    style={{ backgroundColor: "#424242" }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-black text-lg w-6 text-center" style={{ color: podiumColor(idx) }}>
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-white">{player.name}</span>
                    </div>
                    <span className="font-bold" style={{ color: "#fdb648" }}>
                      {player.score} pts
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={backToLobbyBroadcast}
              className="w-full mt-6 py-3 rounded-xl font-bold transition-colors"
              style={{ backgroundColor: "#25e4a2", color: "#333333" }}
            >
              ↩ Back to Lobby
            </button>
          </div>
        </div>
        <FooterLogo />
      </>
    );
  }

  return null;
}
