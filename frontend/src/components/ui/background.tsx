export default function Background() {
  return (
    <div className="fixed inset-0 min-h-screen w-full bg-[#0D0D12] -z-10">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-50">
          <svg width="100%" height="100%">
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>
    </div>
  );
}
