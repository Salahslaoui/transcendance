import { ArrowRight } from "lucide-react";
import { FaHistory } from "react-icons/fa";

const MatchRecord = ({
  player1,
  player2,
  result,
  date,
  score,
}: {
  player1: string;
  player2: string;
  result: "Win" | "Loss" | "Draw";
  date: string;
  score: string;
}) => {
  const resultColor =
    result === "Win"
      ? "text-green-500"
      : result === "Loss"
      ? "text-red-500"
      : "text-yellow-500";

  return (
    <div className="flex items-center gap-4 px-6 py-3 hover:bg-gray-800/30 transition-colors">
      {/* Players */}
      <div className="flex items-center gap-2 text-sm sm:text-base font-medium text-white">
        <span>{player1}</span>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <span>{player2}</span>
      </div>

      <span className="text-xs text-gray-400 hidden sm:block">{date}</span>
      <div className="flex-1"></div>
      <span className="text-sm font-semibold text-white">{score}</span>
      <span className={`text-sm font-bold min-w-[50px] ${resultColor}`}>{result}</span>
    </div>
  );
};



export default function MatchHistory() {
  const matches = [
    { player1: "PlayerA", player2: "PlayerB", result: "Win" as const, date: "03/08/2025", score: "11 - 7" },
    { player1: "PlayerC", player2: "PlayerD", result: "Loss" as const, date: "02/08/2025", score: "9 - 11" },
    { player1: "PlayerE", player2: "PlayerF", result: "Draw" as const, date: "01/08/2025", score: "10 - 10" },
    { player1: "PlayerE", player2: "PlayerF", result: "Draw" as const, date: "01/08/2025", score: "10 - 10" },
    { player1: "PlayerE", player2: "PlayerF", result: "Draw" as const, date: "01/08/2025", score: "10 - 10" },
    { player1: "PlayerE", player2: "PlayerF", result: "Draw" as const, date: "01/08/2025", score: "10 - 10" },
    { player1: "PlayerE", player2: "PlayerF", result: "Draw" as const, date: "01/08/2025", score: "10 - 10" },
    { player1: "PlayerE", player2: "PlayerF", result: "Draw" as const, date: "01/08/2025", score: "10 - 10" },
    { player1: "PlayerE", player2: "PlayerF", result: "Draw" as const, date: "01/08/2025", score: "10 - 10" },
  ];

  return (
    <div className="flex flex-col w-full h-full rounded-xl bg-[#0D0D12] border border-gray-800/30 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/30">
        <FaHistory/>
        <h2 className="text-xl font-bold text-white">Match History</h2>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-none">
        <div className="flex flex-col">
          {matches.map((match, index) => (
            <div
              key={index}
              className={index < matches.length - 1 ? 'border-b border-gray-800/20' : ''}
            >
              <MatchRecord {...match} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
