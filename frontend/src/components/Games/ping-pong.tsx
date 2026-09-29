import { Dispatch, Ref, RefObject, SetStateAction, useEffect, useRef, useState } from "react";
import WebsocketService, { GamePauseInfo, WsDataIn } from "@/services/ws";
import Modal from "../ui/modal";
import { CurrentState, useCountdown, useCurrentState, useUser, useVsPlayer } from "@/contexts/user-provider";
import { useGame } from "@/contexts/game-provider";
import CooldownBar from "../ui/cooldown-bar";
import {getPauseInfo} from "@/helpers/utils";
import { count } from "console";
import { useRouter } from "next/router";
import { usePathname } from "next/navigation";
import { statSync } from "fs";

type PaddleObj = {
    left: number;
    right: number;
  }

  type Vector = {
    x: number;
    y: number;
  };

  type Dimensions = {
    width: number;
    height: number;
  };

  type PossibleWinners = "left" | "right";

  type BallInfo = {
    color: string;
    radius: number;
  };


  type GameContext = {
    ctx: CanvasRenderingContext2D;
    dimsRef: RefObject<Dimensions>;
    paddleDims: Dimensions;
    worldDims: Dimensions;
    ballInfo: BallInfo;
    loopRef: RefObject<number | null>;
    pressedKeys: RefObject<Record<string, boolean>>;
    matchId: number;
  };

type GameState = {
    ballPos: Vector;
    paddlesPos: PaddleObj;
}


type SnapShot = {
    time: number;
    ballPos: Vector;
    paddlesPos: PaddleObj;
}


function scale(value: number, from: number, to: number) {
  return (value / from) * to;
}


function drawPaddles({ ctx, dimsRef, paddleDims, worldDims}: GameContext, { paddlesPos }: GameState) {
  ctx.fillStyle = "red";
  const dims = dimsRef.current;
  ctx.fillRect(0,
    scale(paddlesPos.left, worldDims.height, dims.height),
    scale(paddleDims.width, worldDims.width, dims.width),
    scale(paddleDims.height, worldDims.height, dims.height));

  ctx.fillRect(
    dims.width - scale(paddleDims.width, worldDims.width, dims.width),
    scale(paddlesPos.right, worldDims.height, dims.height),
    scale(paddleDims.width, worldDims.width, dims.width),
    scale(paddleDims.height, worldDims.height, dims.height)
  )
}


function drawBall({ ctx, ballInfo, worldDims, dimsRef }: GameContext, { ballPos }: GameState) {
  const dims = dimsRef.current;
  ctx.beginPath();
  ctx.arc(
    scale(ballPos.x, worldDims.width, dims.width),
    scale(ballPos.y, worldDims.height, dims.height),
    scale(ballInfo.radius, worldDims.width, dims.width),
    0, Math.PI * 2);
  ctx.fillStyle = ballInfo.color;
  ctx.fill();
}





function isValidKey(key: string) {
  return (key == "ArrowUp" || key === "ArrowDown");
}


function Control({ isControl }: { isControl: boolean }) {
  return (
    <div
      className={`px-4 py-2 rounded-xl text-white font-semibold text-sm w-max ${
        isControl ? 'bg-green-500' : 'bg-yellow-500'
      }`}
    >
      {isControl ? 'Active Page' : 'Spectate Mode'}
    </div>
  );
}

function findSnapshots(snapshots: SnapShot[], renderTime: number) {
  let older: SnapShot | null = null;
  let newer: SnapShot | null = null;

  for (let i = snapshots.length - 1; i >= 0; i--) {
    if (snapshots[i].time <= renderTime) {
      older = snapshots[i];
      newer = snapshots[i + 1] || snapshots[i];
      break;
    }
  }

  return { older, newer };
}

function gameLoop(game: GameContext, snapshotsRef: RefObject<SnapShot[]>) {
  const renderTime = performance.now() - 50;
  const snapshots = snapshotsRef.current;
  let {older, newer} = findSnapshots(snapshots, renderTime);
  if (!older && !newer) {
    game.loopRef.current = requestAnimationFrame(() => gameLoop(game, snapshotsRef));
    return;
  }

  if (!older)
    older = newer!;
  if (!newer)
    newer = older!;
  const dims = game.dimsRef.current;
  const gradient = game.ctx.createLinearGradient(0, 0, dims.width, dims.height);
  game.ctx.clearRect(0, 0, dims.width, dims.height);
  gradient.addColorStop(0, "#1a1a1a");
  gradient.addColorStop(1, "#0f4c75");
  game.ctx.fillStyle = gradient;

  const t = older.time === newer.time ? 0 : (renderTime - older.time) / (newer.time - older.time);

  const state: GameState = {
    ballPos: {x: older.ballPos.x + (newer.ballPos.x - older.ballPos.x) * t,
              y: older.ballPos.y + (newer.ballPos.y - older.ballPos.y) * t},
    paddlesPos: {
      left: older.paddlesPos.left + (newer.paddlesPos.left - older.paddlesPos.left) * t,
      right: older.paddlesPos.right + (newer.paddlesPos.right - older.paddlesPos.right) * t
    }
  }

  drawBall(game, state);
  drawPaddles(game, state);
  game.loopRef.current = requestAnimationFrame(() => gameLoop(game, snapshotsRef));
}

export default function PingPong() {
  const {currentState} = useCurrentState();
  const [pausedText, setPausedText] = useState<string | null>(null);
  const {matchId, myDirection, closeGame, isControl} = useGame();

  const pressedKeys = useRef<Record<string, boolean>>({});
  const [isSelfPaused, setIsSelfPaused] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<number | null>(null);
  const worldDims: Dimensions = {width: 200, height: 100};
  const paddleDims: Dimensions = {width: 1, height: 20};
  const ballInfo: BallInfo = {color: "green", radius: 2};
  const {refetchUser} = useUser();
  const {countdown} = useCountdown();

  const {vsPlayer, setVsPlayer} = useVsPlayer();
  const [myScore, setMyScore] = useState(currentState ? currentState.myScore : 0);
  const [enemyScore, setEnemyScore] = useState(currentState? currentState.vsPlayerScore : 0);
  const dimsRef = useRef<Dimensions>({width: 0, height: 0});
  const snapshots = useRef<SnapShot[]>([]);




  // Current Game State useEffect
  useEffect(() => {
    setPausedText(null);
    if (!currentState) return;
    const state = currentState.matchState;
    if (state != "waiting_for_left" && state != "waiting_for_right" && state != "normal_pause_left" && state != "normal_pause_right") {
      setIsSelfPaused(false);
      return;
    }
    if (state == "waiting_for_left" && myDirection == "left")
        return;
    if (state == "waiting_for_right" && myDirection == "right")
        return;
    const pauseInfo = getPauseInfo(state, myDirection);
    setPausedText(pauseInfo.text);
    setIsSelfPaused(pauseInfo.isSelfPaused);
  }, [currentState?.matchState, myDirection]);


  // Control event handlers
  useEffect(() => {
    if (!isControl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isValidKey(e.key))
        return;
      if (e.repeat)
        return;
      if (pressedKeys.current[e.key])
        return;
      pressedKeys.current[e.key] = true;
      WebsocketService.send("key_down", {keyAction: {matchId, key: e.key}});
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isValidKey(e.key)) {
        pressedKeys.current[e.key] = false;
      WebsocketService.send("key_up", {keyAction: {matchId, key: e.key}});
      }

    };
    const handleWindowBlur = () => {
      for (const key in pressedKeys.current) {
        if (pressedKeys.current[key]) {
          pressedKeys.current[key] = false;
          WebsocketService.send("key_up", {keyAction: {matchId, key}});
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return (() => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);

    })
  }, [isControl]);

  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      const width = canvasRef.current.clientWidth;
      const height = Math.min(canvasRef.current.clientHeight, 1066);
      dimsRef.current = {width: width, height: height};
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    };

   const handleGameContinue = (event: WsDataIn) => {
      setPausedText(null);
      setIsSelfPaused(false);
    }

    const handleGameEvent =  (event: WsDataIn) => {
      const data = event.details.gameState;
      if (!data)
        throw new Error("Invalid data");
      snapshots.current.push({time: performance.now(), ...data});

      const limit = performance.now() - 200;
      snapshots.current = snapshots.current.filter(s => s.time >= limit); // only keep snapshots from the last 200 ms
      // ballPos.current = data.ballPos;
      // paddlesPos.current = data.paddlesPos;
    };


    const handleGameEnd = (event: WsDataIn) => {
      setPausedText(null);
      setIsSelfPaused(false);
    }



    const handleGameScore = (event: WsDataIn) => {
      const data = event.details.score;
      if (!data)
        throw new Error("Invalid data");
      if (myDirection == "left") {
        setMyScore(data.leftScore);
        setEnemyScore(data.rightScore);
      } else {
        setMyScore(data.rightScore);
        setEnemyScore(data.leftScore);
      }
    }
    WebsocketService.subscribe("game_event", handleGameEvent);
    WebsocketService.subscribe("game_end", handleGameEnd);
    WebsocketService.subscribe("game_score", handleGameScore);
    WebsocketService.subscribe("game_continue", handleGameContinue);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize)
      WebsocketService.unsubscribe("game_event");
      WebsocketService.unsubscribe("game_score");
      WebsocketService.unsubscribe("game_end", handleGameEnd);
      WebsocketService.unsubscribe("game_continue", handleGameContinue);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const width = canvas.clientWidth;
    const height = Math.min(canvas.clientHeight, 1066);
    dimsRef.current = {width, height};
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    const game: GameContext = { ctx, dimsRef, paddleDims, worldDims , ballInfo,loopRef, matchId, pressedKeys}; // Game constants
    gameLoop(game, snapshots);

    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, []); //



  // OnClick handlers
  const pauseGame = () => {
    WebsocketService.send("pause_game", {modGameInfo: {matchId}});
    refetchUser();
  }

  const endGame = () => {
    WebsocketService.send("end_game", {modGameInfo: {matchId}});
    closeGame();
    setVsPlayer(undefined);
    refetchUser();
    // setSelectedIndex(0);
  }

  const continueGame = () => {
    WebsocketService.send("continue_game", {modGameInfo: {matchId}});
  }


  return (
    <div className="relative w-full h-full px-6 py-8 flex flex-col items-center justify-center">
    {pausedText && (
      <Modal onClose={() => {}} absolute={true}>
        <h1>{pausedText}</h1>
        {/* <span>Remaining time: {countdown}</span> */}
        <CooldownBar countdown={countdown} />
        {
          (isSelfPaused && isControl) &&
            <button
            className="mt-2 p-2 rounded-full border border-white bg-[#43435d] hover:bg-[#666691] hover:cursor-pointer w-fit"
            onClick={continueGame}
            >
              Continue Game
            </button>
        }
      </Modal>
    )}
      <Control isControl={isControl}/>
      <div className="flex justify-between w-[90%] mb-2">
        {
          myDirection == "left" ?
          <>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-bold">You</h1>
            <h1 className="text-lg font-bold">{myScore}</h1>
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-bold">{vsPlayer?.username || "Opponent"}</h1>
            <h1 className="text-lg font-bold">{enemyScore}</h1>
          </div>
          </>
          :
        <>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-bold">{vsPlayer?.username || "Opponent"}</h1>
            <h1 className="text-lg font-bold">{enemyScore}</h1>
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-bold">You</h1>
            <h1 className="text-lg font-bold">{myScore}</h1>
          </div>
          </>
        }

      </div>
      <h1 className="mb-4 text-xl">First to score 6 goals wins!</h1>
      <div className="rounded-2xl flex flex-col justify-center w-[90%] h-[90%] border border-white px-2 mb-4">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      <div className="flex gap-3.5">
      <button
        disabled={!isControl}
        className={`rounded-xl p-4 text-xl font-bold text-white
                    transition transform duration-200 ease-in-out
                    ${isControl
                      ? 'bg-amber-600 hover:bg-amber-500 hover:scale-105 hover:shadow-lg cursor-pointer'
                      : 'bg-amber-400 cursor-not-allowed opacity-60 scale-100 shadow-none'}`}
        onClick={pauseGame}
      >
        Pause Game
      </button>

      <button
        disabled={!isControl}
        className={`rounded-xl p-4 text-xl font-bold text-white
                    transition transform duration-200 ease-in-out
                    ${isControl
                      ? 'bg-red-600 hover:bg-red-500 hover:scale-105 hover:shadow-lg cursor-pointer'
                      : 'bg-red-400 cursor-not-allowed opacity-60 scale-100 shadow-none'}`}
        onClick={endGame}
      >
        Quit Game
      </button>
      </div>

    </div>
  )
}
