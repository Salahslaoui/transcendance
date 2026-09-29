import ProgressBar from "@ramonak/react-progress-bar";



export default function CooldownBar({countdown, max = 10,}: {countdown: number, max?: number;}) {
  const progress = (countdown / max) * 100;

  return (
    <div className="w-full mt-2">
      <ProgressBar
        completed={progress}
        maxCompleted={100}
        height="12px"
        bgColor="linear-gradient(to right, #ef4444, #22c55e)"
        baseBgColor="#2b2b3d"
        borderRadius="9999px"
        isLabelVisible={false}
        transitionDuration="0.5s"
      />

      <div className="text-center text-sm text-gray-300 mt-1">
        {countdown}s remaining
      </div>
    </div>
  );
}