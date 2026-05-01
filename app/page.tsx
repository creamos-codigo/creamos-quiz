// app/page.tsx
"use client";

import { useState } from "react";
import GameBoard from "../components/GameBoard";
import GameHub from "../components/GameHub";
import PromptBattle from "../components/PromptBattle";

type View = "hub" | "quiz" | "prompt-battle";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState<View>("hub");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "Creamos.123456") {
      setIsLoggedIn(true);
      setError("");
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  const goHome = () => setView("hub");

  if (isLoggedIn) {
    return (
      <main className="min-h-screen p-8 flex flex-col items-center justify-center">
        {view === "hub" && <GameHub onSelect={setView} />}
        {view === "quiz" && <GameBoard onBackToHub={goHome} />}
        {view === "prompt-battle" && <PromptBattle onBackToHub={goHome} />}
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="flex flex-col items-center gap-8 w-full max-w-xs text-center"
        style={{ animation: "fadeInUp 0.7s ease-out" }}
      >
        <h1 className="text-6xl font-black text-white tracking-tight">Game time!</h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-3 w-full">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl text-white border focus:outline-none transition-colors text-center font-semibold text-lg"
            style={{ backgroundColor: "#424242", borderColor: "#555555", caretColor: "#fdb648" }}
            onFocus={(e) => (e.target.style.borderColor = "#fdb648")}
            onBlur={(e) => (e.target.style.borderColor = "#555555")}
            placeholder="Enter password"
          />
          {error && (
            <p className="text-sm font-medium" style={{ color: "#fc2560" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-extrabold text-lg transition-all duration-200"
            style={{ backgroundColor: "#fdb648", color: "#333333" }}
          >
            Enter
          </button>
        </form>

        <img
          src="/images/Creamos_PrimaryWordmark_WithTagline.svg"
          alt="Creamos"
          className="w-32 mt-2"
          style={{ opacity: 0.45 }}
        />
      </div>
    </main>
  );
}