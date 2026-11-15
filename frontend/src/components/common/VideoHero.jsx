import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";

/**
 * Premium Hero Video Component for Vyapar Sangam
 * Features:
 * - Dynamic resolution: points to the project introduction film asset `/video.mp4/intro.mp4.mp4`
 *   with fallback to admin-configured settings video URL.
 * - Responsive 16:9 aspect ratio for desktop, tablet, and mobile.
 * - Interactive scrubbable progress bar with live timestamp display (mm:ss / mm:ss).
 * - Full controls: Play/Pause, Mute/Unmute, Fullscreen toggle.
 * - Touch-friendly and auto-hiding controls for distraction-free viewing.
 * - Starts paused with sound muted by default (respects browser autoplay policies).
 */
export default function VideoHero({ videoUrl, src, posterUrl, poster, isAdmin }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);
  const hideControlsTimerRef = useRef(null);

  // Default path for the introduction video added to the project
  const DEFAULT_VIDEO_PATH = "/video.mp4/intro.mp4.mp4";
  const resolvedSrc = videoUrl || src || DEFAULT_VIDEO_PATH;
  const resolvedPoster = posterUrl || poster;

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);

  // Format seconds to mm:ss
  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds || isNaN(timeInSeconds)) return "00:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video.play().then(() => {
        setPlaying(true);
      }).catch((err) => {
        console.warn("Playback error:", err);
      });
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  // Toggle Mute
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  // Listen to fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Video time update handler
  const handleTimeUpdate = () => {
    if (isSeeking) return;
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.duration) {
      setProgress((video.currentTime / video.duration) * 100);
    }
  };

  // Video loaded metadata
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
  };

  // Video ended handler
  const handleEnded = () => {
    setPlaying(false);
    setProgress(100);
    setControlsVisible(true);
  };

  // Seek functionality on progress bar
  const seekToPosition = (clientX) => {
    const bar = progressBarRef.current;
    const video = videoRef.current;
    if (!bar || !video || !video.duration) return;

    const rect = bar.getBoundingClientRect();
    const clickPosition = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = clickPosition * video.duration;

    video.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(clickPosition * 100);
  };

  const handleProgressBarClick = (e) => {
    seekToPosition(e.clientX);
  };

  const handleTouchSeek = (e) => {
    if (e.touches && e.touches[0]) {
      seekToPosition(e.touches[0].clientX);
    }
  };

  // Auto-hide controls timer
  const scheduleHideControls = useCallback(() => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    setControlsVisible(true);
    if (playing) {
      hideControlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [playing]);

  const handleMouseMove = () => {
    scheduleHideControls();
  };

  const handleMouseLeave = () => {
    if (playing && !isSeeking) {
      setControlsVisible(false);
    }
  };

  useEffect(() => {
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black overflow-hidden group rounded-lg border border-border/40 shadow-2xl select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={scheduleHideControls}
    >
      {/* HTML5 Native Video */}
      <video
        ref={videoRef}
        src={resolvedSrc}
        poster={resolvedPoster || undefined}
        className="w-full h-full object-cover cursor-pointer"
        playsInline
        preload="metadata"
        muted={muted}
        controls={false}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Subtle Dark Ambient Gradient Overlays */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
          !playing || controlsVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Large Center Play / Pause Floating Button */}
      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play video"
          className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/25 flex items-center justify-center text-white transition-all duration-300 hover:scale-110 shadow-xl cursor-pointer group/btn"
        >
          <Play size={26} className="text-white ml-1.5 transition-transform group-hover/btn:scale-105" />
        </button>
      )}

      {/* Video Controls Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 p-3 sm:p-5 flex flex-col gap-2.5 transition-opacity duration-300 ${
          controlsVisible || !playing ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Interactive Scrubbable Progress Bar */}
        <div
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          onTouchStart={handleTouchSeek}
          onTouchMove={handleTouchSeek}
          className="w-full h-2.5 py-1 flex items-center cursor-pointer group/progress relative"
          role="slider"
          aria-label="Video playback progress"
          aria-valuenow={Math.round(progress)}
          aria-valuemin="0"
          aria-valuemax="100"
          tabIndex={0}
        >
          {/* Progress Background Track */}
          <div className="w-full h-1.5 group-hover/progress:h-2 bg-white/25 rounded-full overflow-hidden transition-all relative">
            {/* Active Played Progress */}
            <div
              className="h-full bg-accent transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Scrubber Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border border-accent opacity-0 group-hover/progress:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `calc(${progress}% - 7px)` }}
          />
        </div>

        {/* Buttons and Timestamps Row */}
        <div className="flex items-center justify-between">
          {/* Left Actions: Play/Pause, Mute/Unmute, Timestamp */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play / Pause Toggle */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause video" : "Play video"}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur flex items-center justify-center transition-colors cursor-pointer"
            >
              {playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
            </button>

            {/* Mute / Unmute Toggle */}
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute video" : "Mute video"}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur flex items-center justify-center transition-colors cursor-pointer"
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {/* Live Playback Time / Duration */}
            <span className="font-mono text-[11px] sm:text-xs text-white/80 select-none tracking-wider ml-1">
              {formatTime(currentTime)} <span className="text-white/40">/</span> {formatTime(duration)}
            </span>
          </div>

          {/* Right Actions: Fullscreen */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur flex items-center justify-center transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
