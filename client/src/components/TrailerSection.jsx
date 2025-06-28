import React, { useState, useRef, useEffect } from "react";
import { dummyTrailers } from "../assets/assets";
import ReactPlayer from "react-player";
import screenfull from "screenfull";
import { PlayCircleIcon } from "lucide-react";

const TrailerSection = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [pip, setPip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentTrailer, setCurrentTrailer] = useState(dummyTrailers[0])

  const playerRef = useRef(null);
  const playerWrapperRef = useRef(null);

  const toggleFullscreen = () => {
    if (screenfull.isEnabled) {
      screenfull.toggle(playerWrapperRef.current);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (!playerRef.current) return;

      switch (e.code) {
        case "Space":
          setIsPlaying((prev) => !prev);
          e.preventDefault();
          break;
        case "KeyM":
          setIsMuted((prev) => !prev);
          break;
        case "ArrowRight":
          playerRef.current.seekTo(playerRef.current.getCurrentTime() + 5);
          break;
        case "ArrowLeft":
          playerRef.current.seekTo(playerRef.current.getCurrentTime() - 5);
          break;
        case "KeyF":
          toggleFullscreen();
          break;
        case "KeyP":
          setPip((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const showControls = !isPlaying || isHovered;

  return (
    <div className="relative px-6 md:px-16 lg:px-24 xl:px-44 py-20 overflow-hidden">
      {/* Background Blurred Video */}
      {isPlaying && (
        <div className="absolute inset-0 z-0 flex justify-center items-center overflow-hidden pointer-events-none">
          <div className="w-full aspect-video relative">
            <ReactPlayer
              url={currentTrailer.videoUrl}
              playing
              muted
              loop
              controls={false}
              width="100%"
              height="100%"
              className="absolute top-0 left-0 scale-125 blur-2xl brightness-[0.3]"
            />
          </div>
        </div>
      )}

      {/* Foreground Player */}
      <div className="relative z-10">
        <p className="text-gray-300 font-medium text-lg max-w-[960px]">
          Trailers
        </p>

        <div
          ref={playerWrapperRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative mt-6 w-full max-w-6xl mx-auto aspect-video rounded-xl overflow-hidden bg-black"
        >
          <ReactPlayer
            ref={playerRef}
            url={currentTrailer.videoUrl}
            playing={isPlaying}
            muted={isMuted}
            volume={volume}
            pip={pip}
            controls={false}
            width="100%"
            height="100%"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Custom Controls */}
          {showControls && (
            <div className="absolute bottom-0 left-0 w-full h-[10px] sm:h-[35px] bg-white/10 backdrop-blur border-t border-white/20 bg-opacity-50 p-3 text-white flex items-center justify-between gap-4 text-sm transition-opacity duration-300">
              <button onClick={() => setIsPlaying((prev) => !prev)}>
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>

              <button
                className=" hidden sm:block"
                onClick={() => setIsMuted((prev) => !prev)}
              >
                {isMuted ? "🔇 Unmute" : "🔊 Mute"}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className=" w-15 sm:w-24 hidden sm:block"
              />

              <button onClick={toggleFullscreen}>⛶ Fullscreen</button>
              <button onClick={() => setPip((prev) => !prev)}>📺 PiP</button>
            </div>
          )}
        </div>
      </div>
      <div className=" group grid grid-cols-4 gap-4 md:gap-8 mt-8 max-w-3xl mx-auto ">
        {dummyTrailers.map((trailer) => {
            return (
                <div key={trailer.image}  className=" relative group-hover:not-hover:opacity-50 hover:-translate-y-1 duration-300 transition max-sm:h-full sm:max-h-60 cursor-pointer"
                onClick={() => {setCurrentTrailer(trailer)}}
                >
                    <img src={trailer.image} alt="trailer" className=" rounded-lg sm:w-full sm:h-full object-cover brightness-75" />
                    <PlayCircleIcon strokeWidth={1.6} className=" absolute max-sm:top-5 max-sm:left-1/2 sm:top-1/2 sm:left-1/2 w-5 md:h-12 transform -translate-x-1/2 -translate-y-1/2 "/>
                </div> 
            )
          
        })}
      </div>
    </div>
  );
};

export default TrailerSection;
