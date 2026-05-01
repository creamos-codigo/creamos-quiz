// components/GameHub.tsx
"use client";

type View = "hub" | "quiz" | "prompt-battle";

interface GameHubProps {
  onSelect: (view: View) => void;
}

export default function GameHub({ onSelect }: GameHubProps) {
  return (
    <div className="w-full max-w-4xl flex flex-col items-center gap-10">
      <div className="text-center flex flex-col items-center gap-2">
        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
          Pick your game
        </h1>
        <p className="text-base text-gray-400 font-medium">
          Choose a chapter to start playing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
        {/* Quiz */}
        <button
          onClick={() => onSelect("quiz")}
          className="group relative flex flex-col items-start gap-4 p-8 rounded-2xl text-left transition-all duration-200 hover:-translate-y-1"
          style={{ backgroundColor: "#424242" }}
        >
          <div
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ backgroundColor: "#fdb648", color: "#333333" }}
          >
            Chapter 1
          </div>
          <h2 className="text-3xl font-black text-white">Quiz</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Test your knowledge of Creamos work, clients and history. Fastest fingers win.
          </p>
          <div
            className="mt-2 text-sm font-bold flex items-center gap-2 transition-transform group-hover:translate-x-1"
            style={{ color: "#fdb648" }}
          >
            Play now →
          </div>
        </button>

        {/* Prompt Battle */}
        <button
          onClick={() => onSelect("prompt-battle")}
          className="group relative flex flex-col items-start gap-4 p-8 rounded-2xl text-left transition-all duration-200 hover:-translate-y-1"
          style={{ backgroundColor: "#424242" }}
        >
          <div
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ backgroundColor: "#25e4a2", color: "#333333" }}
          >
            Chapter 2
          </div>
          <h2 className="text-3xl font-black text-white">Prompt Battle</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Get a creative brief, write the best prompt, let AI generate the image. Funniest result wins.
          </p>
          <div
            className="mt-2 text-sm font-bold flex items-center gap-2 transition-transform group-hover:translate-x-1"
            style={{ color: "#25e4a2" }}
          >
            Play now →
          </div>
        </button>
      </div>

      <div
        className="w-full max-w-md text-center p-5 rounded-xl border-2 border-dashed"
        style={{ borderColor: "#555555" }}
      >
        <p className="text-sm font-semibold text-gray-400">More chapters coming soon ✨</p>
      </div>
    </div>
  );
}