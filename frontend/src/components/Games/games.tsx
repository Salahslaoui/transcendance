"use client";

import { useEffect, useState } from "react";
import Modal from "../ui/modal";
import type { StaticImageData } from "next/image";
import PingPongTable from "@/assets/ping-pong-table.png";
import PingPong from "./ping-pong";
import XO from "@/assets/tic-tac-toe.png"
import { Dispatch, SetStateAction } from "react";
import ChoosePlayer from "../ui/player-modal";
import { useGame } from "@/contexts/game-provider";
import { useRouter } from "next/navigation";
import TicTacToe from "./tic-tac-toe/TicTacToe";


type GameCardProps = {
    title: LaunchedGame;
    description: string;
    img: StaticImageData;
    setLaunchedGame: Dispatch<SetStateAction<LaunchedGame | null>>;
}


type GameModeProps = {
  mode: string;
  onClick: () => void;
}


type ChoiceModalProps = {
  launchedGame: LaunchedGame | null;
   onClose: () => void;
    setOpenMode: Dispatch<SetStateAction<OpenMode | null>>;
    players: Players;
    setPlayers: Dispatch<SetStateAction<Players>>;
}


export type Players = {
  left: string;
  right: string;
}


type GamesProps = {
  launchedGameInit: LaunchedGame | null;
  openModeInit: OpenMode | null;
}

export type LaunchedGame = "Ping Pong" | "Tic Tac Toe";
export type OpenMode = "Local" | "Remote";

function GameCard({ title, description, img, setLaunchedGame }: GameCardProps) {
    return (
      <>
        <div
        className="h-full w-full overflow-hidden cursor-pointer"
        onClick={() => {setLaunchedGame(title);}}
        >
          <div
            className="h-full w-full bg-cover bg-center transition-transform transform hover:scale-105"
            style={{ backgroundImage: `url(${img.src})` }}
          >

            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="p-4 rounded-2xl bg-slate-100/20 backdrop-blur-md">
                <h1 className="font-bold text-4xl 2xl:text-5xl text-slate-900">{title}</h1>
                <h1 className="font-semibold text-base 2xl:text-xl text-slate-800">{description}</h1>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

function GameMode({mode, onClick}: GameModeProps) {
  return (
    <div className=" flex flex-col items-center rounded-2xl bg-[#43435d] hover:bg-[#666691] hover:cursor-pointer p-3 w-full" onClick={onClick}>
      <h1>{mode}</h1>
    </div>
  )
}

function ModalError({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl w-[80%] bg-red-200 p-4 mt-3 border border-red-300">
      <h1 className="text-base font-semibold text-red-800">{error}</h1>
    </div>
  );
}


export default function Games() {
    const {matchId} = useGame();
    const [launchedGame, setLaunchedGame] = useState<LaunchedGame | null>(null);
    if (launchedGame === "Tic Tac Toe")
      return <TicTacToe setLaunchedGame={setLaunchedGame}/>;
    return (
      matchId != -1 ?
        <PingPong />
      :
      <div className="flex flex-col gap-4 h-screen w-full justify-center items-center">
        <div className="flex flex-col gap-1.5 items-center">
          <h1 className="text-4xl 2xl:text-5xl font-bold">Choose a game</h1>
          <h1 className="text-xl 2xl:text-2xl font-semibold">Let’s get this party going!</h1>
        </div>

        <div className="flex justify-center items-center-safe h-full w-full">
          <div className="flex flex-col md:flex-row divide-y-8 md:divide-y-0 md:divide-x-8 divide-gray-600 rounded-xl overflow-hidden bg-[#1a1a22] w-full h-[80%] 2xl:h-[90%]">
                <div className="flex-1">
                  <GameCard
                  title="Ping Pong"
                  description="Play retro ping pong game"
                  img={PingPongTable}
                  setLaunchedGame={(setLaunchedGame)}
                  />
                </div>
                <div className="flex-1">
                  <GameCard
                  title="Tic Tac Toe"
                  description="Play retro tic tac toe game"
                  img={XO}
                  setLaunchedGame={setLaunchedGame}
                  />
                </div>

            {
              launchedGame == "Ping Pong"  &&
                <Modal onClose={() => setLaunchedGame(null)}>
                  <ChoosePlayer mode="1v1" />
                </Modal>
            }
          </div>
        </div>
      </div>
    );
  }
