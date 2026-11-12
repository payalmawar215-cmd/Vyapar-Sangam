import { useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, Clapperboard } from "lucide-react";

// Hero intro-video component. The video URL is managed by the admin in Settings —
// until it is set, a polished branded placeholder is shown.
export default function VideoHero({ videoUrl, posterUrl, isAdmin }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const fullscreen = () => {
    const v = videoRef.current;
    if (v?.requestFullscreen) v.requestFullscreen();
  };

  if (videoUrl) {
    return (
      <div className="relative w-full aspect-video bg-black overflow-hidden group">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl || undefined}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="absolute bottom-5 right-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <button
            onClick={togglePlay}
            aria-label={playing ? "Pause video" : "Play video"}
            className="w-10 h-10 rounded-full bg-black/60 text-white backdrop-blur flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute video" : "Mute video"}
            className="w-10 h-10 rounded-full bg-black/60 text-white backdrop-blur flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <button
            onClick={fullscreen}
            aria-label="Fullscreen"
            className="w-10 h-10 rounded-full bg-black/60 text-white backdrop-blur flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-foreground overflow-hidden flex items-center justify-center">
      {posterUrl && (
        <img src={posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,10,0.85), rgba(10,10,10,0.35))" }} />
      <div className="relative text-center px-6">
        <div className="w-16 h-16 mx-auto rounded-full border border-white/30 flex items-center justify-center mb-6">
          <Clapperboard size={22} className="text-white/80" strokeWidth={1.25} />
        </div>
        <p className="font-display text-2xl md:text-3xl font-light text-white">Introduction film coming soon</p>
        <p className="font-body text-xs tracking-label uppercase text-white/50 mt-3">
          {isAdmin ? "Upload your video from Settings" : "The Vyapar Sangam story will play here"}
        </p>
      </div>
    </div>
  );
}
