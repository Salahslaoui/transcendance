import { X, Circle } from "lucide-react";
import { GameBoardInterface } from "./types";

export const GameBoard = (props: GameBoardInterface) => {
	const {board, winner, winningCombinations, handleClick, gameMode} = props;
	return (
			<div className="grid grid-cols-3 gap-2 w-fit bg-white ">
				{board.map((cell, index) => {
					let isWinningCell = false;
					if (winner && winner !== 'Draw') {
						const winningCombo = winningCombinations.find(([a, b, c]) =>
							board[a] === winner && board[b] === winner && board[c] === winner
						);
						if (winningCombo?.includes(index)) isWinningCell = true;
					}

					return (
						<button
							key={index}
							onClick={async () => {await handleClick(index)}}
							disabled={!!cell || !!winner || !gameMode}
							className={`
								w-50 h-50 flex items-center justify-center transition-all duration-200 bg-[#0d0d12]
								${cell
									? 'cursor-default'
									: 'cursor-pointer'
								}
							${isWinningCell ? 'rounded-sm ring-2 ring-yellow-500 shadow-[inset_0_0_40px_rgba(255,255,0,0.5)]' : ''
							}
							`}
						>
							{cell === 'X' ? <X className='w-25 h-25 text-cyan-400'/> : cell === 'O' ? <Circle className='w-20 h-20 text-fuchsia-500'/> : null}
						</button>
					);
				})}
			</div>
	)
}
