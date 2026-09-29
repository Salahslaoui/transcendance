import { Dispatch, RefObject, SetStateAction, useEffect, useRef, useState } from "react";
import Modal from "../ui/modal";
import { Competitor } from "../Tournament/Round";
import { makeRequest } from "@/helpers/api";


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

type Bstruct = {
        Player1: string;
        Player2: string;
        ScoreP1: number;
        ScoreP2: number;
}

type PossibleWinners = "left" | "right";

type BallInfo = {
  color: string;
  radius: number;
};

type Players = {
  left: Competitor;
  right: Competitor;
}

type GameContext = {
  ctx: CanvasRenderingContext2D;
  dims: Dimensions;
  targetPoints: number;
  paddleDims: Dimensions;
  worldDims: Dimensions;
  ballInfo: BallInfo;
  players: Players;
  onWinner: (winner: Competitor) => void;
  setScore: Dispatch<SetStateAction<{left: number, right: number}>>;
  loopRef: RefObject<number | null>;
};

type GameState = {
  paddlePos: RefObject<PaddleObj>;
  paddleVelocity: RefObject<PaddleObj>;
  keysPressed: RefObject<Record<string, boolean>>;
  ballPos: RefObject<Vector>;
  ballVelocity: RefObject<Vector>;
  score: {left: number, right: number};
};





const MAX_ANGLE = Math.PI / 4;


async function UpdateBackend(data: Bstruct) {
  const response = await makeRequest("/game/tournament/set-data", {method: "POST", auth: true, data: data});
}
function applyKeyboard( {paddleDims, worldDims}:  GameContext ,{keysPressed, paddlePos, paddleVelocity}: GameState, delta: number) {
    const change = worldDims.height * 0.8 * delta;
    const pvFactor = 0.03
    if (keysPressed.current["ArrowUp"]) {
      paddleVelocity.current.right += worldDims.height * pvFactor * delta;
      paddlePos.current.right -= (change + paddleVelocity.current.right);
    };
    if (keysPressed.current["ArrowDown"]) {
      paddleVelocity.current.right += worldDims.height * pvFactor * delta;
      paddlePos.current.right += (change + paddleVelocity.current.right);
    }
    if (keysPressed.current["w"] || keysPressed.current["W"]) {
      paddleVelocity.current.left += worldDims.height * pvFactor * delta;
      paddlePos.current.left -= (change + paddleVelocity.current.left);
    }
    if (keysPressed.current["s"] || keysPressed.current["S"]) {
      paddleVelocity.current.left += worldDims.height * pvFactor * delta;
      paddlePos.current.left += (change + paddleVelocity.current.left);
    }

    if (paddlePos.current.left < 1) paddlePos.current.left = 1;
    if (paddlePos.current.right < 1) paddlePos.current.right = 1;

    if (paddlePos.current.left >= worldDims.height - paddleDims.height) paddlePos.current.left = worldDims.height - paddleDims.height - 1;
    if (paddlePos.current.right >= worldDims.height - paddleDims.height) paddlePos.current.right = worldDims.height - paddleDims.height - 1;
}


function scale(value: number, from: number, to: number) {
  return (value / from) * to;
}


function drawPaddles({ ctx, dims, paddleDims, worldDims}: GameContext, { paddlePos }: GameState) {
  ctx.fillStyle = "red";
  ctx.fillRect(0,
    scale(paddlePos.current.left, worldDims.height, dims.height),
    scale(paddleDims.width, worldDims.width, dims.width),
    scale(paddleDims.height, worldDims.height, dims.height));

  ctx.fillRect(
    dims.width - scale(paddleDims.width, worldDims.width, dims.width),
    scale(paddlePos.current.right, worldDims.height, dims.height),
    scale(paddleDims.width, worldDims.width, dims.width),
    scale(paddleDims.height, worldDims.height, dims.height)
  )
}


function drawBall({ ctx, ballInfo, worldDims, dims }: GameContext, { ballPos }: GameState) {
  ctx.beginPath();
  ctx.arc(
    scale(ballPos.current.x, worldDims.width, dims.width),
    scale(ballPos.current.y, worldDims.height, dims.height),
    scale(ballInfo.radius, worldDims.width, dims.width),
    0, Math.PI * 2);
  ctx.fillStyle = ballInfo.color;
  ctx.fill();
}


function checkCollision({x, y}: Vector, {paddleDims, ballInfo, worldDims}: GameContext, {paddlePos, ballPos, ballVelocity}: GameState) {
  const goingLeft = ballVelocity.current.x < 0 ? true : false;
  const compareAgainstY = goingLeft ? paddlePos.current.left : paddlePos.current.right;

  const withinPaddleY = (y >= compareAgainstY - ballInfo.radius && y <= compareAgainstY + paddleDims.height + ballInfo.radius);
  const withinPaddleX = (goingLeft ? x - ballInfo.radius <= paddleDims.width : x + ballInfo.radius >= worldDims.width - paddleDims.width);
  const withinPaddle = withinPaddleY && withinPaddleX;
  if (withinPaddle) {
    const deflectionAngle = MAX_ANGLE * (y - (compareAgainstY + (paddleDims.height / 2))) / (paddleDims.height / 2);
    const speed = Math.sqrt(ballVelocity.current.x ** 2 + ballVelocity.current.y ** 2);
    ballVelocity.current.x = (goingLeft ? 1 : -1) * speed * Math.cos(deflectionAngle);
    ballVelocity.current.y = speed * Math.sin(deflectionAngle);
  }
  return (withinPaddle);
}


function updateScoreAndEnd(game: GameContext, state: GameState, player: "left" | "right") {
  switch(player) {
    case "left":
      if (state.score.left == game.targetPoints - 1) {
        UpdateBackend({Player1: game.players.left.name, Player2: game.players.right.name, ScoreP1: state.score.left + 1, ScoreP2: state.score.right});
        game.onWinner(game.players.left);
      }
      game.setScore(prev => {
        return {
          left: prev.left + 1,
          right: prev.right
        }
      });
      break;
    case "right":
      if (state.score.right == game.targetPoints - 1) {

        UpdateBackend({Player1: game.players.left.name, Player2: game.players.right.name, ScoreP1: state.score.left, ScoreP2: state.score.right + 1});

        game.onWinner(game.players.right);
      }
        game.setScore(prev => {
        return {
          left: prev.left,
          right: prev.right + 1
        }
      });
      break;
  }
}


function setBallPosition(game: GameContext, state: GameState, delta: number) {
  const { worldDims } = game;
  const { ballPos, ballVelocity } = state;

  let newBallX = ballPos.current.x + ballVelocity.current.x * delta;
  let newBallY = ballPos.current.y + ballVelocity.current.y * delta;

  let scored = false;

  if (newBallX < 0) {
    updateScoreAndEnd(game, state, "right");
    scored = true;
  } else if (newBallX >= worldDims.width) {
    updateScoreAndEnd(game, state, "left");
    scored = true;
  }

  if (scored) {
    ballPos.current = { x: worldDims.width / 2, y: worldDims.height / 2 };
    ballVelocity.current = { x: (Math.random() > 0.5 ? 1 : -1) * 50, y: 50 }; // random serve direction
    return false;
  }

  if (!checkCollision({ x: newBallX, y: newBallY }, game, state)) {
    if (newBallY - game.ballInfo.radius < 0) {
      ballVelocity.current.y *= -1;
      newBallY = game.ballInfo.radius + 1;
    } else if (newBallY + game.ballInfo.radius >= worldDims.height) {
      ballVelocity.current.y *= -1;
      newBallY = worldDims.height - game.ballInfo.radius - 1;
    }
  }

  ballPos.current.x = newBallX;
  ballPos.current.y = newBallY;
  return false;
}



function gameLoop(game: GameContext, state: GameState, lastTime: number) {
  const now = performance.now();
  const delta = (now - lastTime) / 1000;

  game.ctx.clearRect(0, 0, game.dims.width, game.dims.height);
  applyKeyboard(game, state, delta);
  if (setBallPosition(game, state, delta))
    return;
  drawBall(game, state);
  drawPaddles(game, state);

  game.loopRef.current = requestAnimationFrame(() => gameLoop(game, state, now));
}


function resetPaddleVelocity(keyUp: string, paddleVelocity: RefObject<PaddleObj>) {
  if (keyUp === "ArrowUp" || keyUp === "ArrowDown") {
    paddleVelocity.current.right = 0;
  } else if (keyUp === "w" || keyUp === "W" || keyUp === "s" || keyUp === "S") {
    paddleVelocity.current.left = 0;
  }
}


export default function LocalPingPong({players, onWinner}: {players: Players, onWinner: (winner: Competitor) => void}) {

  const ballInfo: BallInfo = {color: "green", radius: 2};
  const targetPoints = 6;
  const paddleDims: Dimensions = {width: 1, height: 20};
  const worldDims: Dimensions = {width: 200, height: 100};

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paddlePos = useRef<PaddleObj>({ left: worldDims.height / 2, right: worldDims.height / 2 });
  const paddleVelocity = useRef<PaddleObj>({left: 0, right: 0});
  const ballPos = useRef<Vector>({ x: worldDims.width / 2, y: worldDims.height / 2 });
  const ballVelocity = useRef<Vector>({ x: 50, y: 50 });
  const loopRef = useRef<number | null>(null);
  const keysPressed = useRef<Record<string, boolean>>({});
  const [score, setScore] = useState<{left: number, right: number}>({left: 0, right: 0});


  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    let dims = { width: canvas.width, height: canvas.height };
    const handleKeyDown = (e: KeyboardEvent) => (keysPressed.current[e.key] = true);
    const handleKeyUp = (e: KeyboardEvent) => {keysPressed.current[e.key] = false; resetPaddleVelocity(e.key, paddleVelocity);};
    const handleResize = () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; dims = { width: canvas.width, height: canvas.height }; };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", handleResize);

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    const game: GameContext = { ctx, dims, targetPoints, paddleDims, worldDims , ballInfo, onWinner, setScore, players ,loopRef }; // Game constants
    const state: GameState = { paddlePos, paddleVelocity, keysPressed, ballPos, ballVelocity, score }; // Game variables

    gameLoop(game, state, performance.now());

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  });

return (
  <>
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="flex justify-between w-[90%] mb-4">
        <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-bold">{players.left.name}</h1>
            <h1 className="text-lg font-bold">{score.left}</h1>
        </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-bold">{players.right.name}</h1>
            <h1 className="text-lg font-bold">{score.right}</h1>
        </div>

      </div>

      <div className="rounded-2xl flex flex-col justify-center w-[90%] h-[90%] border border-white px-2">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  </>
);

}
