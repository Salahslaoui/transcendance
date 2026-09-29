"use client";

import { FaArrowRight, FaArrowLeft  } from "react-icons/fa";
import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/user-provider';
import PingPongTable from "@/assets/ping-pong-table.png";
import XO from "@/assets/tic-tac-toe.png";

function Sliders() {
	const [currentSlide, setCurrentSlide] = useState(0);
	const images = [
	{
		src: PingPongTable.src,
		alt: "Ping Pong Game"
	},
    {
		src: XO.src,
		alt: "Tic Tac Toe"
	}
  ];

	useEffect(() => {
		const interval = setInterval(() => {
      		setCurrentSlide((prev) => (prev + 1) % images.length);
    	}, 3000);
    return () => clearInterval(interval);
	}, [images.length, currentSlide]);


	const goToPrev = () => {
    	setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);
	};

	const goToNext = () => {
    	setCurrentSlide((prev) => (prev + 1) % images.length);
	};

	return (
	<div className="relative w-[350px] md:w-[500px] h-[220px] md:h-[300px] overflow-hidden group rounded-2xl">
    	<div className="relative h-full w-full">
    	{images.map((image, index) => (
        	<div
        	key={index}
        	className={`absolute inset-0 transition-opacity duration-700 ${
            	index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
        	<img
              src={image.src}
              alt={image.alt}
              className="h-full w-full object-cover"
            />
        	</div>
        ))}
    	</div>
    	<button
    	onClick={goToPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
        aria-label="Previous slide"
    	>
		<FaArrowLeft/>
    	</button>
    	<button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
        aria-label="Next slide"
      >
			<FaArrowRight/>
    	</button>
	</div>
  );
}

export default function WelcomeCard() {
	const [loading, setLoading] = useState(true);
	const { user } = useUser();

	useEffect(() => {
		if (user) setLoading(false);
	}, [user]);

	if (loading) return <h1>Loading...</h1>;

  return (
	<div className="dashboard-card items-center w-full h-full flex flex-col justify-center">
    		<span className="text-2xl  text-gray-400">Welcome back,</span>
    		<span className="text-4xl font-bold text-white">
          		{user?.username}
        	</span>

			<span className="text-2xl text-gray-400">Glad to see you again!</span>
			<span className="text-2xl text-gray-400">Ready to play?</span>
    </div>
  );
}
