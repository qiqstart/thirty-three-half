import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Overlay } from "@/components/overlay";
import { setGame } from "@/game/api";
import { Game } from "@/game/engine";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="game-root">
      <h1 className="sr-only">Killer Record</h1>
      <GameClient />
    </main>
  );
}

function GameClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game(canvas);
    setGame(game);
    return () => {
      setGame(null);
      game.dispose();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="game-canvas" />
      <Overlay />
    </>
  );
}
