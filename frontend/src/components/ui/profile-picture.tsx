import DefaultPfp from "@/assets/default.svg";

interface ProfilePictureProps {
  height: string;
  width: string;
  img?: string;
  showOnline?: boolean;
}

export default function ProfilePicture({ height, width, img, showOnline }: ProfilePictureProps) {
  return (
    <div
      className="relative bg-purple-300 rounded-full m-1"
      style={{ height, width }}
    >
      
      <img
        src={img ?? DefaultPfp.src}
        alt="Profile"
        className="w-full h-full object-cover rounded-full"
      />
    {showOnline &&
        <div className="absolute w-3 h-3 top-0 bg-green-500 rounded-full border-2 border-white"></div>
      }
    </div>
  );
}
