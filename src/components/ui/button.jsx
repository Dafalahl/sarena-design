// ini template button 3D

import { Quicksand } from "next/font/google";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function Button({
  label,
  icon: Icon,
  onClick,
  iconSize = 18,
  scale = 75,
}) {
  return (
    <div
      className="relative inline-flex"
      style={{ transform: `scale(${scale / 100})` }}
    >
      {/* Rectangle bawah (shadow) */}
      <div
        className="absolute rounded-[15px] inset-0"
        style={{
          backgroundColor: "#9B9A9A",
          height: "62px",
          top: "6px",
        }}
      />

      {/* Rectangle atas (tombol utama) */}
      <button
        onClick={onClick}
        className={`${quicksand.className} relative flex items-center justify-center gap-2 font-bold transition-transform active:translate-y-1.5 whitespace-nowrap`}
        style={{
          backgroundColor: "#FFFEFE",
          borderRadius: "15px",
          border: "0.3px solid #000",
          padding: "0px 24px",
          height: "62px",
          color: "#000",
        }}
      >
        {label}
        {Icon && <Icon size={iconSize} />}
      </button>
    </div>
  );
}
