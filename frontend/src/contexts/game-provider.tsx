"use client";

import { createContext, Dispatch, SetStateAction, useContext, useState, useRef, ReactNode, RefObject } from "react";

type GameContextType = {
  matchId: number;
  setMatchId: Dispatch<SetStateAction<number>>;
  isGameOpen: boolean;
  setIsGameOpen: Dispatch<SetStateAction<boolean>>;
  openGame: (id: number) => void;
  closeGame: () => void;
  myDirection: "left" | "right";
  setMyDirection: Dispatch<SetStateAction<"left" | "right">>;
  isControl: boolean;
  setIsControl: Dispatch<SetStateAction<boolean>>;
  timeout: RefObject<number | null>;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export default function GameProvider({ children }: { children: ReactNode }) {
  const [matchId, setMatchId] = useState(-1);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [myDirection, setMyDirection] = useState<"left" | "right">("left");
  const [isControl, setIsControl] = useState(false);
  const timeout = useRef<number|null>(null);
  

  const openGame = (id: number) => {
    setMatchId(id);
    setIsGameOpen(true);
  };

  const closeGame = () => {
    setMatchId(-1);
    setIsGameOpen(false);
  };
  
  return (
    <GameContext.Provider value={{ matchId, setMatchId, isGameOpen, setIsGameOpen, openGame, closeGame, myDirection, setMyDirection, isControl, setIsControl, timeout }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context)
    throw new Error("useGame must be used within a GameProvider");
  return context;
}
