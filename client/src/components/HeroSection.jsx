import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, CalendarIcon, ClockIcon, ChevronLeft, ChevronRight, StarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import timeFormat from "../lib/timeFormat";

const SLIDE_INTERVAL = 5000;

const HeroSection = () => {
  const navigate = useNavigate();
  const { shows } = useAppContext();
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef(null);

  const total = shows.length;

  const goTo = useCallback(
    (index) => {
      if (animating || total === 0) return;
      setAnimating(true);
      setCurrent((index + total) % total);
      setTimeout(() => setAnimating(false), 600);
    },
    [animating, total]
  );

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-advance
  useEffect(() => {
    if (total === 0) return;
    timerRef.current = setInterval(next, SLIDE_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [next, total]);

  // Pause on hover
  const pauseTimer = () => clearInterval(timerRef.current);
  const resumeTimer = () => {
    timerRef.current = setInterval(next, SLIDE_INTERVAL);
  };

  if (total === 0) {
    // Fallback static slide when shows not loaded yet
    return (
      <div className="hero-section hero-fallback">
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1 className="hero-title">Welcome to QuickShow</h1>
          <p className="hero-description">Book your favourite movies instantly.</p>
          <button className="hero-btn" onClick={() => navigate("/movies")}>
            Explore Movies <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  const show = shows[current];
  const movie = show.movie ?? show;
  const bg =  movie.poster_path;
  const genres = movie.genres?.slice(0, 3).join(" | ");
  const year = movie.release_date?.split("-")[0];

  return (
    <div
      className="hero-section"
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
    >
      {/* Slides */}
      {shows.map((s, i) => {
        return (
          <div
            key={s._id ?? i}
            className={`hero-slide ${i === current ? "hero-slide--active" : ""}`}
            style={{ backgroundImage: `url(${bg})` }}
            aria-hidden={i !== current}
          />
        );
      })}

      {/* Dark gradient overlay */}
      <div className="hero-overlay" />

      {/* Content */}
      <div className={`hero-content ${animating ? "hero-content--fade" : ""}`}>
        {movie.vote_average && (
          <span className="hero-badge">
            <StarIcon className="w-3.5 h-3.5 fill-current text-yellow-400" />
            {movie.vote_average.toFixed(1)}
          </span>
        )}

        <h1 className="hero-title">{movie.title}</h1>

        <div className="hero-meta">
          {genres && <span>{genres}</span>}
          {year && (
            <span className="hero-meta-item">
              <CalendarIcon className="w-4 h-4" />
              {year}
            </span>
          )}
          {movie.runtime && (
            <span className="hero-meta-item">
              <ClockIcon className="w-4 h-4" />
              {timeFormat(movie.runtime)}
            </span>
          )}
        </div>

        {movie.overview && (
          <p className="hero-description">{movie.overview}</p>
        )}

        <div className="hero-actions">
          <button
            className="hero-btn"
            onClick={() => navigate(`/movies/${show._id}`)}
          >
            Book Tickets <ArrowRight className="w-5 h-5" />
          </button>
          <button
            className="hero-btn hero-btn--ghost"
            onClick={() => navigate("/movies")}
          >
            All Movies
          </button>
        </div>
      </div>

      {/* Prev / Next */}
      <button className="hero-nav hero-nav--prev" onClick={prev} aria-label="Previous">
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button className="hero-nav hero-nav--next" onClick={next} aria-label="Next">
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots */}
      <div className="hero-dots">
        {shows.map((_, i) => (
          <button
            key={i}
            className={`hero-dot ${i === current ? "hero-dot--active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="hero-progress">
        <div
          key={current}
          className="hero-progress-bar"
          style={{ animationDuration: `${SLIDE_INTERVAL}ms` }}
        />
      </div>
    </div>
  );
};

export default HeroSection;
