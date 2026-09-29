"use client"

import { makeRequest } from "@/helpers/api";
import round from "./Round"
import { useEffect, useState } from "react";

function Tournament ({ onClose }: { onClose: () => void }) {

    const [loading, setLoading] = useState(true);
    const [scores, setScores] = useState<any>(null);

    useEffect(() => {
        async function fetchScores() {
            const response = await makeRequest("/game/tournament/get-data", {method: "GET", auth: true});
            if (response.success)
                setScores(response.details || null);

            setLoading(false);
        }
        fetchScores();
    }, []);

    return (
        <div className="mt-2.5 w-full h-full fixed top-0 left-0 z-50 backdrop-blur-md bg-white/10 flex items-center justify-center" onClick={onClose}>
            <div className="w-[80%] h-[70%] bg-black rounded-xl shadow-2xl p-6 flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-center bg-black min-h-[10%] text-2xl px-4 py-4 border-b-2 border-purple-500 flex-none">
                    <span className="text-5xl font-black text-purple-400 mr-2 drop-shadow-lg">T</span><span className="font-bold text-white">ournament Scores</span>
                </div>

                <div className="flex-1 overflow-y-auto mt-4 p-2 text-white scrollbar-hide [&::-webkit-scrollbar]:hidden">
                    {loading && <p className="text-center text-lg">Loading...</p>}

                    {!loading && scores && (
                            <div className="whitespace-pre-wrap text-lg">
                                {scores.map((scores: string[], index: number) => (
                                    <li key={index} className="bg-black p-4 rounded-lg border-l-4 border-cyan-400 hover:scale-105 transition-transform">
                                            <span className="text-xl font-bold text-cyan-300">{index + 1}</span>
                                        <div className="flex justify-center items-center">
                                            <span className="text-lg font-semibold text-white tracking-wide leading-relaxed">{scores}</span>
                                        </div>
                                    </li>
                                ))}
                            </div>
                    )}

                    { !loading && !scores && (
                        <p className="text-center text-lg text-red-400">No Scores yet</p>
                    )
                    }
                </div>
            </div>
        </div>
    );
}

export default Tournament