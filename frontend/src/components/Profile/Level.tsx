import React, { useEffect, useState } from 'react'
import Api from '@/helpers/axios';
import { useUser } from '@/contexts/user-provider';

interface Level {
	user_id: number;
	xpToNextLevel: number;
	xpProgress: number;
	level: number;
	xp: number;
}

interface LevelProps {
	userId?: number;
}

export default function Level({ userId }: LevelProps) {
	const { user } = useUser();
	const [level, setLevel] = useState<Level | null>(null);

	useEffect(() => {
		const fetchLevel = async() => {
			try {
				const targetUserId = userId ?? user?.id;
				if (!targetUserId)
					return;
				const response = await Api.get(`/user/levels/users/${targetUserId}`);
				if (response.data && response.data.data) {
					setLevel(response.data.data);
				}
			} catch (err) {
				console.error("Error fetching level data:", err);
			}
		}
		fetchLevel();
	}, [userId, user?.id]);
	if (!level)
		return null;
	return (
		<div className="w-full mt-3">
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-gray-300">Level</span>
					<span className="px-2.5 py-0.5 rounded-full bg-blue-500 text-white text-sm font-bold shadow-lg">
						{level.level}
					</span>
				</div>
				<span className="text-xs text-gray-400">{level.xp} / {level.xpToNextLevel} XP</span>
			</div>
			<div className="relative w-full h-2.5 bg-gray-700 rounded-full overflow-hidden shadow-inner">
				<div
					className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-500 ease-out shadow-lg"
					style={{ width: `${level.xpProgress}%` }}
				>
					<div className="absolute inset-0 bg-white/20 animate-pulse"></div>
				</div>
			</div>
		</div>
	);
}
