import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QUIZ_QUESTIONS, computeSpiritBird } from '../../data/spiritBirds';
import type { SpiritBirdDef } from '../../data/spiritBirds';
import { fetchBirdPhoto } from '../../api/inaturalist';
import './SpiritBirdPage.css';

const BIOMES = ['coastal', 'mountain', 'desert', 'forest'] as const;
type Biome = typeof BIOMES[number];
type Phase = 'intro' | 'scene' | 'computing' | 'reveal';

const SCENE_AUDIO: Record<Biome, string> = {
  coastal:  '/audio/spirit-coastal.mp3',
  mountain: '/audio/spirit-mountain.mp3',
  desert:   '/audio/spirit-desert.mp3',
  forest:   '/audio/spirit-forest.mp3',
};

interface Props {
  onComplete: (code: string, photoUrl: string | null) => void;
}

// ── Biome video + parallax background ────────────────────────────────────────
function BiomeBackground({
  biome,
  active,
  preload,
}: {
  biome: Biome;
  active: boolean;
  preload: boolean;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Resume playback when becoming active (needed if browser paused hidden video)
  useEffect(() => {
    if (active && videoRef.current && !videoFailed) {
      videoRef.current.play().catch(() => setVideoFailed(true));
    }
  }, [active, videoFailed]);

  return (
    <div
      className={`sb-biome-bg sb-biome-bg--${biome}${active ? ' sb-biome-bg--active' : ''}`}
      aria-hidden="true"
    >
      {/* Parallax layers — always present as visual base / fallback */}
      <div className="sb-pl sb-pl--sky" />
      <div className="sb-pl sb-pl--ground" />
      <div className="sb-pl sb-pl--mid" />
      <div className="sb-pl sb-pl--near" />

      {/* Video overlays parallax when available */}
      {!videoFailed && (
        <video
          ref={videoRef}
          className={`sb-biome-video${videoFailed ? ' sb-biome-video--hidden' : ''}`}
          src={`/video/biome-${biome}.mp4`}
          autoPlay
          muted
          loop
          playsInline
          preload={preload ? 'auto' : 'metadata'}
          onError={() => setVideoFailed(true)}
        />
      )}

      {/* Readability overlay: dark vignette + bottom gradient */}
      <div className="sb-biome-overlay" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function SpiritBirdPage({ onComplete }: Props) {
  const [phase, setPhase]                   = useState<Phase>('intro');
  const [sceneIdx, setSceneIdx]             = useState(0);
  const [answers, setAnswers]               = useState<number[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showPrompt, setShowPrompt]         = useState(false);
  const [showChoices, setShowChoices]       = useState(false);
  const [pulseChoices, setPulseChoices]     = useState(false);
  const [result, setResult]                 = useState<SpiritBirdDef | null>(null);
  const [photoUrl, setPhotoUrl]             = useState<string | null>(null);
  const [revealStage, setRevealStage]       = useState(0);
  const [exiting, setExiting]               = useState(false);
  const [sharing, setSharing]               = useState(false);

  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const promptTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const choicesTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQ    = QUIZ_QUESTIONS[sceneIdx];
  const currentBiome: Biome | null = phase === 'scene' ? currentQ?.biome as Biome : null;

  // ── Audio ──────────────────────────────────────────────────────────────────

  const stopAudio = useCallback((fade = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    audioRef.current = null;
    if (fade) {
      const tick = setInterval(() => {
        if (audio.volume > 0.03) {
          audio.volume = Math.max(0, audio.volume - 0.025);
        } else {
          audio.pause();
          clearInterval(tick);
        }
      }, 60);
    } else {
      audio.pause();
      audio.src = '';
    }
  }, []);

  const playAudio = useCallback((src: string) => {
    stopAudio(false);
    const audio = new Audio(src);
    audio.loop   = true;
    audio.volume = 0;
    audioRef.current = audio;
    audio.play().catch(() => {/* file not found — silently skip */});
    const tick = setInterval(() => {
      if (!audioRef.current || audioRef.current !== audio) { clearInterval(tick); return; }
      if (audio.volume < 0.28) { audio.volume = Math.min(0.28, audio.volume + 0.015); }
      else clearInterval(tick);
    }, 80);
  }, [stopAudio]);

  useEffect(() => () => stopAudio(false), [stopAudio]);

  // ── Scene setup ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'scene') return;

    promptTimer.current  && clearTimeout(promptTimer.current);
    choicesTimer.current && clearTimeout(choicesTimer.current);
    pulseTimer.current   && clearTimeout(pulseTimer.current);
    setShowPrompt(false);
    setShowChoices(false);
    setPulseChoices(false);
    setSelectedChoice(null);

    const src = SCENE_AUDIO[currentQ.biome as Biome];
    if (src) playAudio(src);

    promptTimer.current  = setTimeout(() => setShowPrompt(true),  1800);
    choicesTimer.current = setTimeout(() => setShowChoices(true), 3000);
    pulseTimer.current   = setTimeout(() => setPulseChoices(true), 11000);

    return () => {
      promptTimer.current  && clearTimeout(promptTimer.current);
      choicesTimer.current && clearTimeout(choicesTimer.current);
      pulseTimer.current   && clearTimeout(pulseTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sceneIdx]);

  // ── Computing phase ────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'computing') return;

    const bird = computeSpiritBird(answers);
    setResult(bird);
    fetchBirdPhoto(bird.sciName).then(url => setPhotoUrl(url)).catch(() => setPhotoUrl(null));

    const timer = setTimeout(() => {
      setPhase('reveal');
      setTimeout(() => setRevealStage(1), 400);
      setTimeout(() => setRevealStage(2), 2200);
    }, 2800);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChoiceSelect = (idx: number) => {
    if (selectedChoice !== null) return;
    setSelectedChoice(idx);
    stopAudio(true);

    const next = [...answers, idx];
    setTimeout(() => {
      if (next.length >= QUIZ_QUESTIONS.length) {
        setAnswers(next);
        setPhase('computing');
      } else {
        setAnswers(next);
        setSceneIdx((s) => s + 1);
      }
    }, 950);
  };

  const handleBeginJourney = () => {
    if (!result) return;
    setExiting(true);
    setTimeout(() => onComplete(result.speciesCode, photoUrl), 700);
  };

  // ── Share spirit bird ──────────────────────────────────────────────────────

  const handleShare = async () => {
    if (!result || sharing) return;
    setSharing(true);

    // Declare canvas outside try so it's accessible in the share step
    const canvas = document.createElement('canvas');
    canvas.width  = 1080;
    canvas.height = 1920;

    try {
      const ctx = canvas.getContext('2d')!;

      // Dark background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
      bgGrad.addColorStop(0,   '#07070e');
      bgGrad.addColorStop(0.5, '#0e0e1a');
      bgGrad.addColorStop(1,   '#07070e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Radial glow behind photo
      const glowGrad = ctx.createRadialGradient(540, 760, 0, 540, 760, 520);
      glowGrad.addColorStop(0,   hexToRgba(result.glowColor, 0.35));
      glowGrad.addColorStop(0.6, hexToRgba(result.glowColor, 0.12));
      glowGrad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 400, 1080, 800);

      // Bird photo in circle
      if (photoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = () => rej(new Error('img load failed'));
            img.src = photoUrl;
          });
          const cx = 540, cy = 760, r = 300;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
          ctx.restore();

          // Halo ring
          ctx.beginPath();
          ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
          ctx.strokeStyle = hexToRgba(result.glowColor, 0.55);
          ctx.lineWidth = 4;
          ctx.stroke();
        } catch { /* no photo — canvas shows glow only */ }
      }

      // "Spirit Bird" badge pill
      ctx.fillStyle = hexToRgba(result.glowColor, 0.2);
      roundRect(ctx, 340, 1110, 400, 52, 26);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(result.glowColor, 0.5);
      ctx.lineWidth = 1.5;
      roundRect(ctx, 340, 1110, 400, 52, 26);
      ctx.stroke();
      ctx.fillStyle = hexToRgba(result.glowColor, 0.9);
      ctx.font = 'bold 22px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('✦  SPIRIT BIRD', 540, 1143);

      // Bird name
      ctx.fillStyle = 'rgba(248, 240, 215, 0.98)';
      ctx.font = 'bold 80px Georgia';
      ctx.textAlign = 'center';
      wrapText(ctx, result.comName, 540, 1240, 900, 92);

      // Personality body
      const personalityRest = getPersonalityBody(result.personality);
      ctx.fillStyle = 'rgba(220, 208, 182, 0.78)';
      ctx.font = '32px Georgia';
      ctx.textAlign = 'center';
      wrapText(ctx, personalityRest, 540, 1390, 880, 46);

      // BirdDex branding
      ctx.fillStyle = 'rgba(180, 168, 140, 0.45)';
      ctx.font = '26px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('BirdDex', 540, 1860);
    } catch { /* canvas drawing failed — share plain text below */ }

    const title = `My Spirit Bird is the ${result.comName}`;
    const text  = getPersonalityBody(result.personality);

    try {
      await new Promise<void>((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) { resolve(); return; }
          const file = new File([blob], `spirit-bird-${result.speciesCode}.jpg`, { type: 'image/jpeg' });
          try {
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({ files: [file], title, text });
            } else if (navigator.share) {
              await navigator.share({ title, text });
            } else {
              const a = document.createElement('a');
              a.href = canvas.toDataURL('image/jpeg', 0.92);
              a.download = file.name;
              a.click();
            }
          } catch { /* user cancelled */ }
          resolve();
        }, 'image/jpeg', 0.92);
      });
    } catch { /* share failed */ }

    setSharing(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const content = (
    <motion.div
      className="sb-root"
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.7 }}
    >
      {/* ── Persistent video/parallax backgrounds ── */}
      <div className="sb-backgrounds">
        {BIOMES.map((biome) => (
          <BiomeBackground
            key={biome}
            biome={biome}
            active={currentBiome === biome}
            preload={phase === 'scene'}
          />
        ))}
      </div>

      {/* ── Screens ── */}
      <AnimatePresence mode="wait">

        {/* Intro */}
        {phase === 'intro' && (
          <motion.div
            key="intro"
            className="sb-screen sb-screen--intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            onClick={() => setPhase('scene')}
          >
            <div className="sb-drifting-feather" aria-hidden="true"><FeatherSVG /></div>

            <div className="sb-intro-text">
              <motion.p
                className="sb-intro-line1"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 1.1 }}
              >
                Every birder has a Spirit Bird —<br />a bird whose nature mirrors their own.
              </motion.p>
              <motion.p
                className="sb-intro-line2"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.3, duration: 1 }}
              >
                Close your eyes. Take a breath.
              </motion.p>
              <motion.p
                className="sb-intro-tap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.9, duration: 0.9 }}
              >
                When you're ready, tap to begin.
              </motion.p>
            </div>
          </motion.div>
        )}

        {/* Scene */}
        {phase === 'scene' && (
          <motion.div
            key={`scene-${sceneIdx}`}
            className="sb-screen sb-screen--scene"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            {/* Progress dots */}
            <div className="sb-progress" aria-label={`Question ${sceneIdx + 1} of ${QUIZ_QUESTIONS.length}`}>
              {QUIZ_QUESTIONS.map((_, i) => (
                <div key={i} className={`sb-progress-dot${i <= sceneIdx ? ' sb-progress-dot--done' : ''}`} />
              ))}
            </div>

            {/* Question + choices */}
            <div className="sb-scene-content">
              <AnimatePresence>
                {showPrompt && (
                  <motion.p
                    key="prompt"
                    className="sb-prompt"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                  >
                    {currentQ.prompt}
                  </motion.p>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showChoices && (
                  <motion.div
                    key="choices"
                    className="sb-choices"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {currentQ.choices.map((choice, i) => (
                      <motion.button
                        key={i}
                        className={[
                          'sb-choice',
                          selectedChoice === i                             ? 'sb-choice--selected' : '',
                          selectedChoice !== null && selectedChoice !== i ? 'sb-choice--faded'    : '',
                          pulseChoices && selectedChoice === null         ? 'sb-choice--pulse'    : '',
                        ].filter(Boolean).join(' ')}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.18, duration: 0.5 }}
                        onClick={() => handleChoiceSelect(i)}
                        disabled={selectedChoice !== null}
                      >
                        {choice.text}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Computing */}
        {phase === 'computing' && (
          <motion.div
            key="computing"
            className="sb-screen sb-screen--computing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
          >
            <div className="sb-drifting-feather sb-drifting-feather--computing" aria-hidden="true">
              <FeatherSVG />
            </div>
            <motion.p
              className="sb-computing-label"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 1.1 }}
            >
              Your Spirit Bird is taking form…
            </motion.p>
          </motion.div>
        )}

        {/* Reveal */}
        {phase === 'reveal' && result && (
          <motion.div
            key="reveal"
            className="sb-screen sb-screen--reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
          >
            <div
              className="sb-reveal-glow"
              style={{ '--sb-glow': result.glowColor } as React.CSSProperties}
              aria-hidden="true"
            />

            <div className="sb-reveal-body">
              {revealStage >= 1 && (
                <motion.div
                  className="sb-reveal-photo-wrap"
                  initial={{ scale: 0.22, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 90, damping: 16, delay: 0.1 }}
                >
                  {photoUrl ? (
                    <img className="sb-reveal-photo" src={photoUrl} alt={result.comName} />
                  ) : (
                    <div className="sb-reveal-photo-placeholder"><FeatherSVG /></div>
                  )}
                  <div
                    className="sb-reveal-halo"
                    style={{ '--sb-glow': result.glowColor } as React.CSSProperties}
                    aria-hidden="true"
                  />
                </motion.div>
              )}

              {revealStage >= 1 && (
                <motion.div
                  className="sb-reveal-badge"
                  style={{ '--sb-glow': result.glowColor } as React.CSSProperties}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.7 }}
                >
                  ✦ Your Spirit Bird
                </motion.div>
              )}

              {revealStage >= 1 && (
                <motion.h1
                  className="sb-reveal-name"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.9 }}
                >
                  {result.comName}
                </motion.h1>
              )}

              {revealStage >= 2 && (
                <>
                  <motion.p
                    className="sb-reveal-personality"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 1 }}
                  >
                    {getPersonalityBody(result.personality)}
                  </motion.p>

                  <motion.div
                    className="sb-reveal-actions"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.8 }}
                  >
                    <button className="sb-reveal-share" onClick={handleShare} disabled={sharing}>
                      <ShareIcon />
                      {sharing ? 'Sharing…' : 'Share'}
                    </button>
                    <button className="sb-reveal-cta" onClick={handleBeginJourney}>
                      Begin your journey →
                    </button>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );

  return createPortal(content, document.body);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip the redundant "Your Spirit Bird is the [Name]." opener from the personality
 *  so it doesn't duplicate the already-displayed bird name heading. */
function getPersonalityBody(personality: string): string {
  // Matches "Your Spirit Bird is the <Name>." or "Your Spirit Bird is <Name>."
  const match = personality.match(/^Your Spirit Bird is (?:the )?[^.]+\.\s*/i);
  if (match) return personality.slice(match[0].length).trim();
  return personality;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
}

function FeatherSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
      <path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

