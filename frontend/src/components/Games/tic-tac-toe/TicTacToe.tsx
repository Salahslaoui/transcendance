import { useUser } from '@/contexts/user-provider';
import { motion } from 'framer-motion';
import { Users, Globe, Loader2, UserRoundSearch, Undo2, Crown, Sparkle, Timer, MapPinXInside, Swords, AlertTriangle } from 'lucide-react';
import React, { useEffect, useRef, useState} from 'react';
import Api from "@/helpers/axios";
import WebsocketService, { WsDataIn, XOMatchChange } from '@/services/ws';
import { GameMode, Player, TicTacToeProps, Winner, XOPlayer, XOPlayers } from './types';
import { GameBoard } from './GameBoard';
import { MatchDashBoard } from './MatchDashBoard';
import { toast } from 'react-toastify';
import { narrowToastError } from '@/components/Chat/chat-utils';

export const WinToast = () => {
  return (
			(
			<div className="flex absolute w-full h-full items-center overflow-hidden">
				<Crown className="absolute right-2.5 h-30 w-30 text-yellow-500 transform rotate-12 opacity-15" />
				<Crown className="h-8 w-8 text-yellow-500" />
				<div className="ml-3">
				<p className="text-l text-white">
					You won the game, congratulations!
				</p>
				</div>
			</div>
	)
  );
};

export const FullCellToast = () => {
  return (
			(
			<div className="flex absolute w-full h-full items-center overflow-hidden">
				<MapPinXInside className="absolute right-2.5 h-30 w-30 text-purple-500 opacity-15" />
				<MapPinXInside className="h-8 w-8 text-purple-500" />
				<div className="ml-3">
				<p className="text-l text-white">
					Hey this spot is taken!
				</p>
				</div>
			</div>
	)
  );
};

export const WaitToast = () => {
  return (
			(
			<div className="flex absolute w-full h-full items-center overflow-hidden">
				<Timer className="absolute right-2.5 h-30 w-30 text-blue-500 opacity-15" />
				<Timer className="h-8 w-8 text-blue-500" />
				<div className="ml-3">
				<p className="text-l text-white">
					Wait for your turn!
				</p>
				</div>
			</div>
	)
  );
};

export const leaveLobby = async () => {
	try {
		 await Api.post('/xo/lobby/leave');
	}
	catch(e) {narrowToastError(e)}
}

const GameWarning = () => {
	return (
	<div className="relative overflow-hidden flex w-full max-w-md items-start gap-3 rounded-lg bg-slate-800 p-4 shadow-sm">
		<AlertTriangle className="absolute -right-6 -bottom-6 h-32 w-32 text-red-600 opacity-30 rotate-12 pointer-events-none" />
		<div className="relative z-10">
			<AlertTriangle className="h-10 w-10 text-red-600" />
		</div>
		<div className="flex flex-col gap-1 relative z-10">
			<h1 className="text-l font-semibold text-red-500">
				Warning
			</h1>
			<p className="text-l text-slate-200">
				Switching tabs/pages will cause you to lose the game when it starts, as you have a timer to make your next move, focus on winning the game.
			</p>
		</div>
	</div>
	);
}

export default function TicTacToe(props: TicTacToeProps) {
	const {setLaunchedGame} = props;
	const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
	const [nextPlayer, setNextPlayer] = useState<"X" | "O" | null>(null);
	const [winner, setWinner] = useState<Winner>(null);
	const [gameMode, setGameMode] = useState<GameMode>(null);
	const [remoteMode, setRemoteMode] = useState<GameMode>(null);
	const [players, setPlayers] = useState<XOPlayers>({'X': null, 'O': null});
	const [loading, setLoading] = useState<boolean>(true);
	const {user: me} = useUser();
	const winningCombinations = [
		[0, 1, 2], [3, 4, 5], [6, 7, 8],
		[0, 3, 6], [1, 4, 7], [2, 5, 8],
		[0, 4, 8], [2, 4, 6]
	];

	const resetGame = () => {
		setBoard(Array(9).fill(null));
		setWinner(null);
	};

	useEffect(() => {
		const assignPlayers = (event: WsDataIn) => {
			const newGameInfo = event.details.xoGameStartInfo;
			if (!newGameInfo)
				return;
			const comingPlayers: XOPlayers | undefined = newGameInfo.players;
			if (comingPlayers){
				setPlayers(comingPlayers);
				setNextPlayer(newGameInfo.role);
			}
		}
		const endGame = (event: WsDataIn) => {
			const winnerPlayer: XOPlayer | undefined = event.details.winner;
			if (me && winnerPlayer){
				setWinner(winnerPlayer.role);
				setNextPlayer(null);
				if (me.id === winnerPlayer.id)
					toast(WinToast, {hideProgressBar: true});
			}
		}
		const handleUpdateGame = (event: WsDataIn) => {
			const gameUpdate: XOMatchChange | undefined = event.details.xoMatch;
			if (gameUpdate)
				updateGame(gameUpdate);
		}
		const assignOpponent = async () => {
			try {
				const response = await Api.get('/xo/lobby/vs');
				if (response.data.players) {
					const players: XOPlayers = response.data.players;
					if (players)
						setPlayers(players);
					resetGame();
					setNextPlayer(response.data.role);
				}
			} catch (error) {
			}
		};
		const checkIfInGame = async () => {
			const response = await Api.get("/user/info/me");
			const user = response.data.details.user;
			if (user && user.game_state === "in_game"){
				toast.error('Player already in a game!');
				setLaunchedGame(null);
			}
		}
		checkIfInGame();
		WebsocketService.subscribe("xo_game_start", assignPlayers);
		WebsocketService.subscribe("xo_game_end", endGame);
		WebsocketService.subscribe("xo_board_change", handleUpdateGame);
		WebsocketService.subscribe("xo_lobby_update", assignOpponent);
		return () => {
			WebsocketService.unsubscribe("xo_game_start", assignPlayers);
			WebsocketService.unsubscribe("xo_game_end", endGame);
			WebsocketService.unsubscribe("xo_board_change", handleUpdateGame);
			WebsocketService.unsubscribe("xo_lobby_update", assignOpponent);
		}
	}, []);

	useEffect(() => {
		return () => {
			leaveLobby();
		}
	}, []);

	useEffect(() => {
		const joinLobby = async () => {
			try {
				const response = await Api.post('/xo/lobby/join');
				if (!response.data.success)
					setLaunchedGame(null);
			}
			catch(e) {narrowToastError(e); setLaunchedGame(null)}
		}
		if (gameMode === 'matchmake') {
			joinLobby();
		}
	}, [gameMode]);


	useEffect(() => {
		if (me)
			setLoading(false);
	}, [me])

	const updateGame = (gameUpdate: XOMatchChange) => {
		const newWinner: XOPlayer | null = gameUpdate.winner;
		const nextTurn: "X" | "O" | null = gameUpdate.nextTurn;
		const newBoard: Player[] = gameUpdate.board;
		if (newBoard) setBoard(newBoard);
		if (newWinner === null) {
			if (nextTurn === null){
				setBoard(newBoard);
				setNextPlayer(null);
				setWinner('Draw');
			}
			else{
				setBoard(newBoard);
				setNextPlayer(nextTurn)
			}
		} else if (newWinner != undefined) {
			if (newWinner.id === me?.id)
				toast(WinToast, {hideProgressBar: true});
			setBoard(newBoard);
			setNextPlayer(null);
			setWinner(newWinner.role);
		}
	}

	if (loading)
		return	<motion.div
					  className="w-13 h-13"
					  animate={{ rotate: 360 }}
					  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
					>
					  <Loader2 className="w-13 h-13" />
				</motion.div>

	const handleClick = async (index: number) => {
		if (winner || !nextPlayer) return;
		try {
			const response = await Api.post('/xo/game/board', {index});
			const gameUpdate: XOMatchChange = response.data;
			updateGame(gameUpdate);
		}
		catch(e: any){
			const { code, error } = e.response.data;
			if (code === 'NOT_YOUR_TURN')
				toast(WaitToast, {hideProgressBar: true});
			else if (code === 'INVALID_MOVE')
				toast(FullCellToast, {hideProgressBar: true});
			else
				narrowToastError(error)
		}

	};

	const GameModeModal = () => {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
				<div className="bg-[#0f172a] border border-slate-700 w-full max-w-lg rounded-2xl p-8 relative overflow-hidden flex flex-col">
				<button className='self-start bg-slate-600 mb-4 rounded-2xl p-1 hover:bg-slate-600/40 duration-250' onClick={() => {setLaunchedGame(null)}}><Undo2/></button>
				<button
					onClick={() => setGameMode('matchmake')}
					className="group relative flex flex-col items-center justify-center p-6 h-40 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-yellow-500 hover:bg-yellow-500/10 transition-all duration-300"
				>
					<Swords className="w-12 h-12 text-slate-400 group-hover:text-yellow-400 mb-4 transition-colors" />
					<span className="text-xl font-bold">Launch matchmaking</span>
					<span className="text-xs text-slate-500 mt-1">Find opponent</span>
				</button>
				</div>
			</div>
		);
	};


	return (
		<div className="flex justify-center items-center gap-10 min-h-screen bg-[#0d0d12] p-10 relative">
			{gameMode === null && remoteMode === null && <GameModeModal />}
			<div className={`absolute top-10 left-10 transition-all duration-500 ${gameMode === null ? 'blur-md' : 'blur-0'}`}>
				<GameWarning/>
			</div>
			<div className={`flex justify-center items-center gap-20 transition-all duration-500 ${gameMode === null ? 'blur-md' : 'blur-0'}`}>
				<MatchDashBoard players={players} setPlayers={setPlayers} winner={winner} nextPlayer={nextPlayer} resetGame={resetGame} setRemoteMode={setRemoteMode} setGameMode={setGameMode} setNextPlayer={setNextPlayer}/>
				<GameBoard board={board} winner={winner} winningCombinations={winningCombinations} handleClick={handleClick} gameMode={gameMode}/>
			</div>
		</div>
	);
}
