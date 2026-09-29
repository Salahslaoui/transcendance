import { GiTicTacToe, GiPingPongBat } from "react-icons/gi";


interface StateProps {
    matchData: string;
    pingpong: number;
    tictactoe: number;
}


export default function State({ matchData, pingpong, tictactoe }: StateProps) {
    return (
        <>
            <div className=" backdrop-blur-xl border border-gray-800 rounded-xl shadow-lg px-7 py-5 flex flex-col items-center min-w-[200px] hover:bg-gray-800/30 transition-colors  transition-all duration-30cursor-pointer">
              <span className="text-blue-500 font-bold text-sm mb-2 tracking-wide">{matchData}</span>
              <div className="text-white text-center flex gap-3 text-lg font-bold">
                <span className="drop-shadow"> <GiPingPongBat className="inline-block mr-0.5 text-red-500 text-xl" /> {pingpong}</span>
                <span className="text-gray-400 font-normal">|</span>
                <span className="drop-shadow"> <GiTicTacToe className="inline-block mr-0.5 text-purple-500 text-xl" /> {tictactoe}</span>
              </div>
            </div>
        </>
    )
}
