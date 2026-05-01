// components/GameBoard.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { quizQuestions, Question } from "../data/questions";

interface GameBoardProps {
    onBackToHub?: () => void;
}

// Fixed color per answer slot: A=Blue B=Red C=Yellow D=Green
const ANSWER_SLOTS = [
    { bg: "#4d5dfb", text: "#ffffff" },
    { bg: "#fc2560", text: "#ffffff" },
    { bg: "#fdb648", text: "#333333" },
    { bg: "#25e4a2", text: "#333333" },
];

// Avatar palette — deterministic color from player name
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
    if (idx === 0) return "#fdb648"; // gold
    if (idx === 1) return "#888888"; // silver
    if (idx === 2) return "#25e4a2"; // green / bronze
    return "#555555";
};

export default function GameBoard({ onBackToHub }: GameBoardProps) {
    const [playerName, setPlayerName] = useState("");
    const [inLobby, setInLobby] = useState(false);
    const [gameState, setGameState] = useState<"lobby" | "playing" | "finished">("lobby");

    // Game state
    const [localQuestions, setLocalQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);

    // Leaderboard state
    const [leaderboard, setLeaderboard] = useState<{ name: string; score: number }[]>([]);

    const [players, setPlayers] = useState<{ name: string; color: string }[]>([]);
    const [countdown, setCountdown] = useState<number | null>(null);

    const channelRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playerNameRef = useRef("");
    const [isMuted, setIsMuted] = useState(false);

    // Announce self when joining the lobby
    useEffect(() => {
        if (!inLobby || !playerName.trim()) return;
        channelRef.current?.send({
            type: "broadcast",
            event: "player_joined",
            payload: { name: playerName.trim() },
        });
    }, [inLobby]);

    // Re-announce self whenever we return to the lobby (e.g. after back_to_lobby)
    useEffect(() => {
        if (gameState !== "lobby" || !inLobby || !playerNameRef.current) return;
        const t = setTimeout(() => {
            channelRef.current?.send({
                type: "broadcast",
                event: "player_joined",
                payload: { name: playerNameRef.current },
            });
        }, 150);
        return () => clearTimeout(t);
    }, [gameState]);

    // Audio setup — create once on mount, clean up on unmount
    useEffect(() => {
        const audio = new Audio("/music/funky-guitar.mp3");
        audio.loop = true;
        audio.volume = 1;
        audioRef.current = audio;
        return () => {
            audio.pause();
            audio.src = "";
        };
    }, []);

    // Control music based on game phase
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (gameState === "playing") {
            audio.currentTime = 0;
            audio.volume = 0.8;
            audio.play().catch(() => {});
        } else if (gameState === "finished") {
            const steps = 30;
            const stepMs = 100; // 30 steps × 100ms = 3s fade
            const decrement = audio.volume / steps;
            const fade = setInterval(() => {
                if (audio.volume > decrement) {
                    audio.volume = Math.max(0, audio.volume - decrement);
                } else {
                    audio.volume = 0;
                    audio.pause();
                    audio.currentTime = 0;
                    clearInterval(fade);
                }
            }, stepMs);
            return () => clearInterval(fade);
        } else {
            // back_to_lobby — stop immediately
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 1;
        }
    }, [gameState]);

    // Setup Supabase Realtime channel
    useEffect(() => {
        const channel = supabase.channel("creamos-quiz-room", {
            config: { broadcast: { self: true } },
        });

        channel
            .on("broadcast", { event: "player_joined" }, ({ payload }) => {
                setPlayers((prev) => {
                    if (prev.some((p) => p.name === payload.name)) return prev;
                    // Re-announce self so the new joiner discovers us
                    if (playerNameRef.current) {
                        channelRef.current?.send({
                            type: "broadcast",
                            event: "player_joined",
                            payload: { name: playerNameRef.current },
                        });
                    }
                    return [...prev, { name: payload.name, color: getPlayerColor(payload.name) }];
                });
            })
            .on("broadcast", { event: "start_game" }, () => {
                const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5);
                setLocalQuestions(shuffled);
                setCurrentIndex(0);
                setScore(0);
                setShowResult(false);
                setSelectedAnswer(null);
                setCountdown(3);
            })
            .on("broadcast", { event: "back_to_lobby" }, () => {
                setGameState("lobby");
                setPlayers([]);
                setCountdown(null);
                setCurrentIndex(0);
                setTimeLeft(15);
                setShowResult(false);
                setSelectedAnswer(null);
                setLocalQuestions([]);
            })
            .on("broadcast", { event: "player_finished" }, ({ payload }) => {
                setLeaderboard((prev) => [...prev, payload].sort((a, b) => b.score - a.score));
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Countdown before first question
    useEffect(() => {
        if (countdown === null) return;
        const t = setTimeout(() => {
            if (countdown === 1) {
                setGameState("playing");
                setTimeLeft(15);
                setCountdown(null);
            } else {
                setCountdown(countdown - 1);
            }
        }, 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    // Timer logic for each round
    useEffect(() => {
        if (gameState !== "playing" || showResult) return;

        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            handleRoundEnd();
        }
    }, [timeLeft, gameState, showResult]);

    const handleRoundEnd = () => {
        setShowResult(true);
        const currentQ = localQuestions[currentIndex];

        if (selectedAnswer === currentQ.correctAnswerIndex) {
            setScore((prev) => prev + 100);
        }

        setTimeout(() => {
            if (currentIndex + 1 < localQuestions.length) {
                setCurrentIndex((prev) => prev + 1);
                setTimeLeft(15);
                setSelectedAnswer(null);
                setShowResult(false);
            } else {
                setGameState("finished");
                channelRef.current?.send({
                    type: "broadcast",
                    event: "player_finished",
                    payload: {
                        name: playerName || "Anonymous Team Member",
                        score: score + (selectedAnswer === currentQ.correctAnswerIndex ? 100 : 0),
                    },
                });
            }
        }, 4000);
    };

    const startGameBroadcast = () => {
        channelRef.current?.send({ type: "broadcast", event: "start_game" });
    };

    const backToLobbyBroadcast = () => {
        channelRef.current?.send({ type: "broadcast", event: "back_to_lobby" });
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !audioRef.current.muted;
            setIsMuted(audioRef.current.muted);
        }
    };

    // Small reusable "Back to Games" button — only renders if onBackToHub is wired up
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

    // --- RENDERING SCREENS ---

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
                <img
                    src="/images/Creamos_PrimaryWordmark_WithTagline.svg"
                    alt="Creamos"
                    className="w-64"
                />

                <div className="w-full max-w-xs flex flex-col gap-3 mt-4">
                    <input
                        type="text"
                        placeholder="Your name"
                        value={playerName}
                        onChange={(e) => { setPlayerName(e.target.value); playerNameRef.current = e.target.value; }}
                        className="w-full px-4 py-3.5 rounded-xl text-white border focus:outline-none transition-colors text-center font-semibold text-lg"
                        style={{ backgroundColor: "#424242", borderColor: "#555555", caretColor: "#fdb648" }}
                        onFocus={(e) => (e.target.style.borderColor = "#fdb648")}
                        onBlur={(e) => (e.target.style.borderColor = "#555555")}
                    />
                    <button
                        onClick={() => setInLobby(true)}
                        disabled={!playerName.trim()}
                        className="w-full py-3.5 rounded-xl font-extrabold text-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ backgroundColor: "#fdb648", color: "#333333" }}
                    >
                        Enter the Lobby
                    </button>
                </div>

                <img
                    src="/images/Creamos_PrimaryWordmark_WithTagline.svg"
                    alt="Creamos"
                    className="w-28 mt-6 mx-auto block"
                    style={{ opacity: 0.35 }}
                />
            </div>
            </>
        );
    }

    // COUNTDOWN SCREEN
    if (countdown !== null) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
                <style>{`
                    @keyframes countdownPop {
                        0%   { opacity: 0; transform: scale(0.4); }
                        25%  { opacity: 1; transform: scale(1.08); }
                        65%  { opacity: 1; transform: scale(1); }
                        100% { opacity: 0; transform: scale(1.5); }
                    }
                `}</style>
                <span
                    key={countdown}
                    className="font-black select-none tabular-nums"
                    style={{
                        fontSize: "clamp(8rem, 30vw, 16rem)",
                        lineHeight: 1,
                        color: "#fdb648",
                        animation: "countdownPop 1s ease-out forwards",
                    }}
                >
                    {countdown}
                </span>
            </div>
        );
    }

    // LOBBY SCREEN
    if (gameState === "lobby") {
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

                <h1 className="text-5xl md:text-6xl font-black text-white mb-10">Quiz time!</h1>

                {/* Player presence panel */}
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
                            {/* Spinning conic border strip — clipped to a 3px ring */}
                            <div className="absolute -inset-[3px] rounded-[15px] overflow-hidden" style={{ zIndex: 0 }}>
                                <div style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    width: "200%",
                                    aspectRatio: "1",
                                    background: "conic-gradient(from 0deg, #fdb648, #fc2560, #4d5dfb, #25e4a2, #fdb648)",
                                    animation: "spinBorder 2s linear infinite",
                                }} />
                            </div>
                            {/* Blurred outer glow halo */}
                            <div style={{
                                position: "absolute",
                                inset: "-10px",
                                borderRadius: "20px",
                                background: "conic-gradient(from 0deg, #fdb648, #fc2560, #4d5dfb, #25e4a2, #fdb648)",
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
                        onClick={startGameBroadcast}
                        disabled={!canStart}
                        className="relative w-full py-4 rounded-xl font-extrabold text-xl transition-all duration-200 disabled:cursor-not-allowed"
                        style={{
                            ...(canStart ? { backgroundColor: "#fdb648", color: "#333333" } : { backgroundColor: "#424242", color: "#888888" }),
                            zIndex: 1,
                        }}
                    >
                        {canStart ? "START GAME FOR EVERYONE" : "Waiting for more players..."}
                    </button>
                </div>

                <button
                    onClick={backToLobbyBroadcast}
                    className="mt-5 px-5 py-2 rounded-full border text-xs font-medium transition-all duration-200"
                    style={{ borderColor: "#555555", color: "#888888" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#cccccc"; e.currentTarget.style.borderColor = "#888888"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#888888"; e.currentTarget.style.borderColor = "#555555"; }}
                >
                    ↩ Back to Lobby
                </button>

                <img
                    src="/images/Creamos_PrimaryWordmark_WithTagline.svg"
                    alt="Creamos"
                    className="w-28 mt-10 mx-auto block"
                    style={{ opacity: 0.35 }}
                />
            </div>
            </>
        );
    }

    // FINISHED SCREEN
    if (gameState === "finished") {
        return (
            <div className="w-full max-w-lg">
                <div className="rounded-2xl p-8" style={{ backgroundColor: "#3d3d3d" }}>
                    <h2 className="text-3xl font-black text-white text-center mb-1">Session Complete!</h2>
                    <p className="text-center font-bold text-xl mb-6" style={{ color: "#fdb648" }}>
                        Your Score: {score} pts
                    </p>

                    <div className="pt-5" style={{ borderTop: "1px solid #424242" }}>
                        <h4
                            className="text-xs uppercase tracking-widest font-semibold mb-4 text-center"
                            style={{ color: "#888888" }}
                        >
                            Leaderboard
                        </h4>
                        <ul className="flex flex-col gap-2">
                            {leaderboard.map((player, idx) => (
                                <li
                                    key={idx}
                                    className="flex justify-between items-center px-4 py-3 rounded-xl"
                                    style={{ backgroundColor: "#424242" }}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="font-black text-lg w-6 text-center"
                                            style={{ color: podiumColor(idx) }}
                                        >
                                            {idx + 1}
                                        </span>
                                        <span className="font-semibold text-white">{player.name}</span>
                                    </div>
                                    <span className="font-bold" style={{ color: "#fdb648" }}>
                                        {player.score} pts
                                    </span>
                                </li>
                            ))}
                            {leaderboard.length === 0 && (
                                <p className="text-center py-4" style={{ color: "#888888" }}>
                                    Waiting for other players to finish...
                                </p>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    // PLAYING SCREEN
    const question = localQuestions[currentIndex];
    const progress = (timeLeft / 15) * 100;

    return (
        <>
        <button
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
            className="fixed top-4 right-4 z-50 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: "#424242", color: isMuted ? "#555555" : "#fdb648" }}
        >
            {isMuted ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.68-7.94-6.47-9.38v2.12A8 8 0 0119 12zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a9.955 9.955 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
            ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
            )}
        </button>

        <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ backgroundColor: "#3d3d3d" }}>
            {/* Timer progress bar — shrinks left to right over 15s */}
            <div
                className="h-1.5 transition-all duration-1000 ease-linear"
                style={{
                    width: `${progress}%`,
                    backgroundColor: timeLeft <= 5 ? "#fc2560" : "#fdb648",
                }}
            />

            <div className="p-6 md:p-10">
                <div className="flex justify-between items-center mb-6">
                    <span className="font-semibold text-sm" style={{ color: "#888888" }}>
                        Question {currentIndex + 1} / {localQuestions.length}
                    </span>
                    <span
                        className={`font-black text-3xl tabular-nums${timeLeft <= 5 ? " animate-pulse" : ""}`}
                        style={{ color: timeLeft <= 5 ? "#fc2560" : "#fdb648" }}
                    >
                        {timeLeft.toString().padStart(2, "0")}
                    </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">{question.text}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {question.options.map((option, idx) => {
                        const slot = ANSWER_SLOTS[idx] ?? ANSWER_SLOTS[0];
                        let btnStyle: React.CSSProperties = { backgroundColor: slot.bg, color: slot.text };
                        let extra = "";

                        if (showResult) {
                            if (idx === question.correctAnswerIndex) {
                                btnStyle = { backgroundColor: "#25e4a2", color: "#333333" };
                                extra = "font-bold";
                            } else if (idx === selectedAnswer) {
                                btnStyle = { backgroundColor: "#fc2560", color: "#ffffff" };
                            } else {
                                btnStyle = { backgroundColor: slot.bg, color: slot.text, opacity: 0.2 };
                            }
                        } else if (selectedAnswer === idx) {
                            extra = "ring-4 ring-white/60";
                        }

                        return (
                            <button
                                key={idx}
                                disabled={showResult}
                                onClick={() => setSelectedAnswer(idx)}
                                style={btnStyle}
                                className={`p-4 rounded-xl text-left font-semibold transition-all duration-200 ${extra}`}
                            >
                                <span className="font-black mr-2 opacity-50 text-sm">{"ABCD"[idx]}</span>
                                {option}
                            </button>
                        );
                    })}
                </div>

                {showResult && (
                    <div className="mt-8 text-center">
                        <p
                            className="text-xl font-bold"
                            style={{ color: selectedAnswer === question.correctAnswerIndex ? "#25e4a2" : "#fc2560" }}
                        >
                            {selectedAnswer === question.correctAnswerIndex ? "🎉 Correct!" : "❌ Time's up / Incorrect!"}
                        </p>
                    </div>
                )}
            </div>
        </div>

        <button
            onClick={backToLobbyBroadcast}
            className="mt-4 px-5 py-2 rounded-full border text-xs font-medium transition-all duration-200"
            style={{ borderColor: "#555555", color: "#888888" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#cccccc"; e.currentTarget.style.borderColor = "#888888"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#888888"; e.currentTarget.style.borderColor = "#555555"; }}
        >
            ↩ Back to Lobby
        </button>
        </>
    );
}
