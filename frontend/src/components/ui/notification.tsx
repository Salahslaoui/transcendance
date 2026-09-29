"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle } from "lucide-react";

type ButtonConfig = {
  bg: string;
  content: string;
  onClick?: () => void;
  closeAfterClick?: boolean;
};



export type NotificationProps = {
  message: string;
  type?: "success" | "error" | "info";
  buttons?: ButtonConfig[];
  duration?: number;
  onClose?: () => void;
}

export default function Notification({ message, type = "info", duration = 3000, buttons = [], onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  const closeNotification = () => setIsVisible(false); 
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="flex flex-col w-96 rounded-xl bg-[#43435d] shadow-lg pb-3"
          initial={{ opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "100%" }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          <div className="relative px-5 pt-4">
            <button
              onClick={() => setIsVisible(false)}
              className="absolute top-2 right-2 text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex gap-3 mt-1">
              {type === "success" && <CheckCircle className="w-5 h-5 text-green-500" />}
              {type === "error" && <X className="w-5 h-5 text-red-500" />}
              {type === "info" && <CheckCircle className="w-5 h-5 text-blue-500" />}
              <h1 className="font-semibold text-base whitespace-nowrap text-white">
                {message}
              </h1>
            </div>
          </div>
          <div className="flex justify-center gap-3.5 mt-2">
            {buttons.map((button, index) => (
              <button
              key={index}
              className={`${button.bg} px-2 py-1 rounded-xl`}
              onClick={() => {
                button.onClick?.();
                button.closeAfterClick && setIsVisible(false);
              }}>
                <h1 className="text-center">{button.content}</h1>
              </button>
            ))
            }
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
