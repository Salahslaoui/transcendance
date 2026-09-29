import { X } from "lucide-react";

export type ModalProps = {
    onClose: () => void;
    absolute?: boolean;
    children?: React.ReactNode;
};

export default function Modal({ onClose, absolute, children }: ModalProps) {
  return (
    <div className={`${absolute ? "absolute" : "fixed"} inset-0 z-50 flex items-center justify-center`}>
      <div className="absolute inset-0 bg-black opacity-50"></div>

      <div
        className="relative z-10 bg-[#262634] p-6 rounded-xl shadow-xl w-[90%] max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-3 hover:text-red-600 text-xl"
        >
          <X/>
        </button>
        {children}
      </div>
    </div>
  );
}
