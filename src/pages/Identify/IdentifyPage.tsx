import { useEffect, useRef, useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useBirdStore } from '../../store/useBirdStore';
import { useBirdCollection } from '../../hooks/useBirdCollection';
import { CaughtAnimation } from '../../components/CaughtAnimation/CaughtAnimation';
import { fetchBirdPhoto } from '../../api/inaturalist';
import { identifyBySound, identifyByPhoto, type IdentifyMatch } from '../../api/identify';
import { getBirdContent } from '../../services/birdContent';
import { getPositionOnce, formatCoordsLabel } from '../../utils/gps';
import { getRarityTier, RARITY_META } from '../../utils/rarity';
import type { BirdWithMeta, BirdContent } from '../../types/bird';
import './IdentifyPage.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type TopScreen = 'home' | 'sound' | 'photo';

// ── Root page ─────────────────────────────────────────────────────────────────

export function IdentifyPage() {
  const [screen, setScreen] = useState<TopScreen>('home');
  const [confirmMatch, setConfirmMatch] = useState<IdentifyMatch | null>(null);
  const [caughtBird, setCaughtBird] = useState<BirdWithMeta | null>(null);
  const [caughtTotal, setCaughtTotal] = useState(0);
  const [postLog, setPostLog] = useState(false);

  const { spotBird, updateSpottedEntry, allBirds, spottedBirds } = useBirdStore();
  const { totalSpotted, totalBirds } = useBirdCollection();

  const handleMatch = (match: IdentifyMatch) => setConfirmMatch(match);

  const handleLogConfirm = (notes: string) => {
    if (!confirmMatch) return;

    const foundBird = allBirds.find(
      (b) => b.sciName.toLowerCase() === confirmMatch.scientificName.toLowerCase(),
    );

    const speciesCode =
      foundBird?.speciesCode ??
      'identify-' + confirmMatch.scientificName.toLowerCase().replace(/[\s()]/g, '-');

    const alreadySpotted = !!spottedBirds[speciesCode];
    const newTotal = totalSpotted + (alreadySpotted ? 0 : 1);
    setCaughtTotal(newTotal);

    spotBird(speciesCode, { spottedAt: new Date().toISOString(), notes: notes || undefined });

    getPositionOnce(5000).then((pos) => {
      if (pos) {
        updateSpottedEntry(speciesCode, {
          locationName: formatCoordsLabel(pos.coords.latitude, pos.coords.longitude),
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
      }
    });

    const birdForAnim: BirdWithMeta = {
      ...(foundBird ?? {
        speciesCode,
        comName: confirmMatch.commonName,
        sciName: confirmMatch.scientificName,
        order: '',
        familyComName: '',
        familySciName: '',
        taxonOrder: 0,
        category: 'species',
      }),
      photoUrl: confirmMatch.photoUrl ?? null,
      photoStatus: confirmMatch.photoUrl ? 'loaded' : 'idle',
      isSpotted: true,
    };

    setConfirmMatch(null);
    setCaughtBird(birdForAnim);
  };

  return (
    <div className="identify-root">
      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <HomeScreen
            key="home"
            onSelectPhoto={() => setScreen('photo')}
          />
        )}
        {screen === 'sound' && (
          <SoundFlow key="sound" onBack={() => setScreen('home')} onMatch={handleMatch} />
        )}
        {screen === 'photo' && (
          <PhotoFlow key="photo" onBack={() => setScreen('home')} onMatch={handleMatch} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmMatch && (
          <LogConfirmModal
            match={confirmMatch}
            onConfirm={handleLogConfirm}
            onCancel={() => setConfirmMatch(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {caughtBird && (
          <CaughtAnimation
            bird={caughtBird}
            totalSpotted={caughtTotal}
            totalBirds={totalBirds}
            onDismiss={() => {
              setCaughtBird(null);
              setPostLog(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {postLog && (
          <PostLogSheet
            onIdentifyAnother={() => {
              setPostLog(false);
              setScreen('home');
            }}
            onViewCollection={() => setPostLog(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Home screen — two method cards ───────────────────────────────────────────

function HomeScreen({
  onSelectPhoto,
}: {
  onSelectPhoto: () => void;
}) {
  return (
    <motion.div
      className="identify-home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="identify-home-header">
        <h1 className="identify-home-title">Identify</h1>
        <p className="identify-home-subtitle">What did you hear or see?</p>
      </div>

      <div className="identify-cards">
        <div className="identify-method-card identify-method-card--disabled" aria-disabled="true">
          <div className="identify-method-icon identify-method-icon--sound">
            <MicIcon size={28} />
          </div>
          <div className="identify-method-text">
            <span className="identify-method-name">What's singing?</span>
            <span className="identify-method-sub">Record bird sounds nearby</span>
          </div>
          <span className="identify-coming-soon-badge">Coming Soon</span>
        </div>

        <button className="identify-method-card" onClick={onSelectPhoto}>
          <div className="identify-method-icon identify-method-icon--photo">
            <CameraIcon size={28} />
          </div>
          <div className="identify-method-text">
            <span className="identify-method-name">What's that bird?</span>
            <span className="identify-method-sub">Snap or upload a photo</span>
          </div>
          <ChevronIcon />
        </button>
      </div>

      <p className="identify-home-hint">
        Powered by Claude AI vision
      </p>
    </motion.div>
  );
}

// ── Sound flow ────────────────────────────────────────────────────────────────

type SoundState = 'requesting' | 'recording' | 'analyzing' | 'results' | 'empty' | 'mic-denied' | 'error';

function SoundFlow({
  onBack,
  onMatch,
}: {
  onBack: () => void;
  onMatch: (m: IdentifyMatch) => void;
}) {
  const [state, setState] = useState<SoundState>('requesting');
  const [countdown, setCountdown] = useState(10);
  const [results, setResults] = useState<IdentifyMatch[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    getPositionOnce(8000).then((pos) => {
      if (pos) setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  const drawSpectrogram = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufLen = analyser.frequencyBinCount; // 128
    const dataArray = new Uint8Array(bufLen);
    analyser.getByteFrequencyData(dataArray);

    const W = canvas.width;
    const H = canvas.height;

    // Slight fade-trail effect
    ctx.fillStyle = 'rgba(245, 240, 230, 0.18)';
    ctx.fillRect(0, 0, W, H);

    const barW = Math.max(1, Math.floor(W / bufLen));

    for (let i = 0; i < bufLen; i++) {
      const v = dataArray[i] / 255;
      const h = v * H * 0.94;

      // Color: tan (quiet) → amber (medium) → forest-green (loud)
      let r: number, g: number, b: number;
      if (v < 0.25) {
        const t = v / 0.25;
        r = Math.round(180 + t * 30); g = Math.round(155 + t * 20); b = Math.round(110 - t * 30);
      } else if (v < 0.6) {
        const t = (v - 0.25) / 0.35;
        r = Math.round(210 - t * 100); g = Math.round(175 - t * 50); b = Math.round(80 - t * 50);
      } else {
        const t = (v - 0.6) / 0.4;
        r = Math.round(110 - t * 40); g = Math.round(125 + t * 43); b = Math.round(30 + t * 14);
      }

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(i * barW, H - h, barW - 1, h);
    }

    rafRef.current = requestAnimationFrame(drawSpectrogram);
  }, []);

  const sizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  };

  const startRecording = async () => {
    stoppedRef.current = false;

    // Check if getUserMedia is available at all
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error('[BirdDex] navigator.mediaDevices.getUserMedia not available. Is the page served over HTTPS or localhost?');
      setErrorMsg('Microphone API not available. This feature requires HTTPS or localhost. Please access the app via https:// or directly on localhost:5173.');
      setState('error');
      return;
    }

    try {
      console.log('[BirdDex] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      console.log('[BirdDex] Microphone access granted. Tracks:', stream.getAudioTracks().map(t => t.label));
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Pick the best supported MIME type — Safari needs audio/mp4
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
        MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' :
        '';

      console.log('[BirdDex] MediaRecorder MIME type selected:', mimeType || '(browser default)');
      console.log('[BirdDex] MIME type support — webm/opus:', MediaRecorder.isTypeSupported('audio/webm;codecs=opus'), 'webm:', MediaRecorder.isTypeSupported('audio/webm'), 'mp4:', MediaRecorder.isTypeSupported('audio/mp4'));

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      console.log('[BirdDex] MediaRecorder created. State:', recorder.state, 'MIME:', recorder.mimeType);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        console.log('[BirdDex] Recording stopped. Blob size:', blob.size, 'type:', blob.type);
        await runAnalysis(blob);
      };

      recorder.start(250); // collect in 250ms chunks
      console.log('[BirdDex] Recording started.');
      setState('recording');
      sizeCanvas();

      // Countdown
      let secs = 10;
      setCountdown(secs);
      countdownTimerRef.current = setInterval(() => {
        secs -= 1;
        setCountdown(secs);
        if (secs <= 0) stopRecording();
      }, 1000);

      drawSpectrogram();
    } catch (err: unknown) {
      const domErr = err as DOMException;
      console.error('[BirdDex] getUserMedia error:', domErr.name, domErr.message, err);

      if (domErr.name === 'NotAllowedError' || domErr.name === 'PermissionDeniedError') {
        setState('mic-denied');
      } else if (domErr.name === 'NotFoundError') {
        setErrorMsg('No microphone found on this device. Please connect a microphone and try again.');
        setState('error');
      } else if (domErr.name === 'NotReadableError' || domErr.name === 'AbortError') {
        setErrorMsg(`Microphone is in use by another app (${domErr.name}). Close other apps using the mic and try again.`);
        setState('error');
      } else if (domErr.name === 'SecurityError') {
        setErrorMsg('Microphone access blocked by browser security policy. The app must be accessed via HTTPS or localhost.');
        setState('error');
      } else {
        setErrorMsg(`Could not access microphone (${domErr.name || 'Unknown error'}: ${domErr.message || String(err)}). Check console for details.`);
        setState('error');
      }
    }
  };

  const stopRecording = () => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    cancelAnimationFrame(rafRef.current);
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setState('analyzing');
  };

  const runAnalysis = async (blob: Blob) => {
    try {
      const matches = await identifyBySound(blob, coords?.lat, coords?.lng);
      if (matches.length === 0) {
        setState('empty');
        return;
      }
      const withPhotos = await Promise.all(
        matches.map(async (m) => ({ ...m, photoUrl: await fetchBirdPhoto(m.scientificName) })),
      );
      setResults(withPhotos);
      setState('results');
    } catch {
      setErrorMsg(
        "Couldn't reach the sound analysis server. Make sure the BirdNET server is running (see server/README.md).",
      );
      setState('error');
    }
  };

  const reset = () => {
    setResults([]);
    setErrorMsg('');
    setCountdown(10);
    stoppedRef.current = false;
    setState('requesting');
  };

  return (
    <motion.div
      className="identify-flow"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -40, opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="identify-flow-header">
        <button className="identify-back-btn" onClick={onBack}>
          <BackIcon /> Back
        </button>
        <h2 className="identify-flow-title">Sound ID</h2>
      </div>

      {state === 'requesting' && (
        <div className="identify-permission">
          <div className="identify-permission-icon identify-permission-icon--sound">
            <MicIcon size={36} />
          </div>
          <h3 className="identify-permission-title">Ready to listen</h3>
          <p className="identify-permission-desc">
            BirdDex will record for 10 seconds and match the sounds against thousands of bird call
            recordings. Works best outdoors, away from traffic noise.
          </p>
          <button className="identify-start-btn" onClick={startRecording}>
            <MicIcon size={16} /> Start Recording
          </button>
        </div>
      )}

      {(state === 'recording' || state === 'analyzing') && (
        <div className="identify-recording">
          <div
            className={`identify-spectrogram-wrap${state === 'analyzing' ? ' identify-spectrogram-wrap--frozen' : ''}`}
          >
            <canvas ref={canvasRef} className="identify-spectrogram" />
            {state === 'analyzing' && <div className="identify-spectrogram-pulse" />}
          </div>

          {state === 'recording' ? (
            <>
              <div className="identify-countdown">
                <div
                  className="identify-countdown-ring"
                  style={{ '--progress': `${(countdown / 10) * 100}%` } as React.CSSProperties}
                >
                  <span className="identify-countdown-num">{countdown}</span>
                </div>
                <span className="identify-countdown-label">seconds left</span>
              </div>
              <p className="identify-recording-hint">Listening for bird calls…</p>
              <button className="identify-stop-btn" onClick={stopRecording}>
                Stop Early &amp; Analyze
              </button>
            </>
          ) : (
            <div className="identify-analyzing-state">
              <p className="identify-analyzing-text">Checking the field guide…</p>
            </div>
          )}
        </div>
      )}

      {state === 'results' && (
        <IdentifyResultsList results={results} source="sound" onSelectMatch={onMatch} onTryAgain={reset} />
      )}
      {state === 'empty' && (
        <EmptyState
          message="I didn't catch any bird calls. Try getting closer or recording in a quieter spot."
          onTryAgain={reset}
        />
      )}
      {state === 'error' && <EmptyState message={errorMsg} onTryAgain={reset} />}
      {state === 'mic-denied' && <MicDeniedHelp onTryAgain={startRecording} />}
    </motion.div>
  );
}

// ── Photo flow ────────────────────────────────────────────────────────────────

type PhotoState = 'picker' | 'previewing' | 'analyzing' | 'results' | 'empty' | 'error';

function PhotoFlow({
  onBack,
  onMatch,
}: {
  onBack: () => void;
  onMatch: (m: IdentifyMatch) => void;
}) {
  const [state, setState] = useState<PhotoState>('picker');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [results, setResults] = useState<IdentifyMatch[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPositionOnce(8000).then((pos) => {
      if (pos) setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setState('previewing');
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setState('analyzing');
    try {
      const matches = await identifyByPhoto(selectedFile, coords?.lat, coords?.lng);
      if (matches.length === 0) {
        setState('empty');
        return;
      }
      const withPhotos = await Promise.all(
        matches.map(async (m) => ({ ...m, photoUrl: await fetchBirdPhoto(m.scientificName) })),
      );
      setResults(withPhotos);
      setState('results');
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Something went wrong. Please try again.';
      const isCredit = msg.toLowerCase().includes('credit') || msg.toLowerCase().includes('billing') || msg.toLowerCase().includes('quota');
      const envHint = isCredit
        ? ' If this persists, check that your API key in the .env file has sufficient credits.'
        : ' If this persists, verify your VITE_ANTHROPIC_API_KEY in the .env file.';
      setErrorMsg(msg + envHint);
      setState('error');
    }
  };

  const reset = () => {
    setResults([]);
    setPreviewUrl(null);
    setSelectedFile(null);
    setErrorMsg('');
    setState('picker');
  };

  return (
    <motion.div
      className="identify-flow"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -40, opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="identify-flow-header">
        <button className="identify-back-btn" onClick={onBack}>
          <BackIcon /> Back
        </button>
        <h2 className="identify-flow-title">Photo ID</h2>
      </div>

      {state === 'picker' && (
        <div className="identify-permission">
          <div className="identify-permission-icon identify-permission-icon--photo">
            <CameraIcon size={36} />
          </div>
          <h3 className="identify-permission-title">Photo identification</h3>
          <p className="identify-permission-desc">
            Take a clear photo with the bird centered in the frame for best results. Works with
            most bird photos — the clearer the better.
          </p>
          <div className="identify-photo-options">
            <button
              className="identify-photo-btn identify-photo-btn--camera"
              onClick={() => cameraRef.current?.click()}
            >
              <CameraIcon size={16} /> Take a photo
            </button>
            <button
              className="identify-photo-btn identify-photo-btn--gallery"
              onClick={() => galleryRef.current?.click()}
            >
              <GalleryIcon /> Choose from library
            </button>
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="identify-hidden-input"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="identify-hidden-input"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
        </div>
      )}

      {state === 'previewing' && previewUrl && (
        <div className="identify-preview">
          <div className="identify-preview-img-wrap">
            <img src={previewUrl} alt="Selected photo" className="identify-preview-img" />
          </div>
          <div className="identify-preview-actions">
            <button className="identify-analyze-btn" onClick={handleAnalyze}>
              <SearchIcon /> Identify this bird
            </button>
            <button className="identify-retake-btn" onClick={reset}>
              Try a different photo
            </button>
          </div>
        </div>
      )}

      {state === 'analyzing' && (
        <div className="identify-analyzing">
          <div className="identify-analyzing-feather">
            <FeatherPulse />
          </div>
          <p className="identify-analyzing-text">Consulting the field guide…</p>
          <p className="identify-analyzing-sub">This takes just a moment</p>
        </div>
      )}

      {state === 'results' && (
        <IdentifyResultsList results={results} source="photo" onSelectMatch={onMatch} onTryAgain={reset} />
      )}
      {state === 'empty' && (
        <EmptyState
          message="I couldn't spot a bird in this photo. Try getting a clearer shot with the bird centered in the frame."
          onTryAgain={reset}
        />
      )}
      {state === 'error' && <EmptyState message={errorMsg} onTryAgain={reset} />}
    </motion.div>
  );
}

// ── Shared results list ───────────────────────────────────────────────────────

function IdentifyResultsList({
  results,
  source,
  onSelectMatch,
  onTryAgain,
}: {
  results: IdentifyMatch[];
  source: 'sound' | 'photo';
  onSelectMatch: (m: IdentifyMatch) => void;
  onTryAgain: () => void;
}) {
  const hasLowConfidence = results.every((r) => r.confidence < 50);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="identify-results">
      <div className="identify-results-header">
        <h3 className="identify-results-title">
          {source === 'sound' ? 'Birds I heard' : 'Possible matches'}
        </h3>
        {hasLowConfidence && (
          <p className="identify-results-note">
            This is a tough one — here are my best guesses. Does any look right?
          </p>
        )}
        <p className="identify-results-hint">Tap a card to see the full field guide entry</p>
      </div>

      <div className="identify-results-list">
        {results.map((match, i) => (
          <IdentifyMatchCard
            key={`${match.scientificName}-${i}`}
            match={match}
            rank={i + 1}
            isExpanded={expandedIndex === i}
            onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
            onSelect={() => onSelectMatch(match)}
          />
        ))}
      </div>

      <div className="identify-results-footer">
        <button className="identify-try-again-btn" onClick={onTryAgain}>
          {source === 'sound' ? 'Record again' : 'Try another photo'}
        </button>
      </div>
    </div>
  );
}

const IUCN_COLORS: Record<string, string> = {
  LC: '#4A6A32', NT: '#9A7500', VU: '#C06010', EN: '#B02020', CR: '#660000',
};

function IdentifyMatchCard({
  match,
  rank,
  isExpanded,
  onToggle,
  onSelect,
}: {
  match: IdentifyMatch;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const { allBirds } = useBirdStore();
  const [content, setContent] = useState<BirdContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const localBird = allBirds.find(
    (b) => b.sciName.toLowerCase() === match.scientificName.toLowerCase(),
  );
  const rarity = getRarityTier(localBird?.likelihoodScore);
  const rarityInfo = RARITY_META[rarity];

  // Confidence color: low=amber, high=green
  const confColor =
    match.confidence >= 70 ? '#4A6A32' : match.confidence >= 40 ? '#9A7500' : '#8B2020';

  useEffect(() => {
    if (isExpanded && localBird && !content && !loadingContent) {
      setLoadingContent(true);
      getBirdContent(localBird.speciesCode).then((c) => {
        setContent(c);
        setLoadingContent(false);
      });
    }
  }, [isExpanded, localBird, content, loadingContent]);

  return (
    <div
      className={`identify-match-card${isExpanded ? ' identify-match-card--expanded' : ''}`}
      onClick={onToggle}
    >
      {/* Top row: photo + summary info */}
      <div className="identify-match-top">
        <div className="identify-match-photo-col">
          {match.photoUrl ? (
            <img src={match.photoUrl} alt={match.commonName} className="identify-match-photo" />
          ) : (
            <div className="identify-match-photo-fallback">
              <FeatherSmallIcon />
            </div>
          )}
          <div className="identify-match-rank">#{rank}</div>
        </div>

        <div className="identify-match-info">
          <div className="identify-match-top-row">
            <div className="identify-match-names">
              <h4 className="identify-match-name">{match.commonName}</h4>
              <p className="identify-match-sci">{match.scientificName}</p>
            </div>
            <div
              className="identify-match-rarity"
              style={{ '--rarity-color': rarityInfo.color, '--rarity-bg': rarityInfo.bg } as React.CSSProperties}
            >
              {rarityInfo.label}
            </div>
          </div>

          <div className="identify-match-confidence">
            <div className="identify-match-conf-track">
              <div
                className="identify-match-conf-fill"
                style={{ width: `${match.confidence}%`, background: confColor }}
              />
            </div>
            <span className="identify-match-conf-pct" style={{ color: confColor }}>
              {Math.round(match.confidence)}%
            </span>
          </div>

          {match.funFact && <p className="identify-match-fact">{match.funFact}</p>}

          <div className="identify-match-bottom-row">
            <div className="identify-match-tap-hint">
              {isExpanded ? '▲ Hide field guide' : '▼ See field guide'}
            </div>
            {!isExpanded && (
              <button
                className="identify-this-is-it-btn"
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
              >
                <CheckmarkIcon /> This is it!
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded field guide panel */}
      {isExpanded && (
        <div className="identify-match-guide" onClick={(e) => e.stopPropagation()}>
          {loadingContent && !content && (
            <p className="identify-match-guide-loading">Loading field guide…</p>
          )}
          {content && (
            <>
              <p className="identify-match-guide-desc">{content.description}</p>

              <div className="identify-match-guide-stats">
                <div className="identify-match-guide-stat">
                  <span className="identify-match-guide-stat-val">{content.sizeComparison}</span>
                  <span className="identify-match-guide-stat-sub">{content.length}</span>
                </div>
                <div className="identify-match-guide-stat">
                  <span className="identify-match-guide-stat-label">Wingspan</span>
                  <span className="identify-match-guide-stat-sub">{content.wingspan}</span>
                </div>
                <div className="identify-match-guide-stat">
                  <span className="identify-match-guide-stat-label">Weight</span>
                  <span className="identify-match-guide-stat-sub">{content.weight}</span>
                </div>
                <div className="identify-match-guide-stat" title={content.conservationStatus}>
                  <span className="identify-match-guide-stat-label">Status</span>
                  <span
                    className="identify-match-guide-iucn"
                    style={{ color: IUCN_COLORS[content.conservationStatus] ?? '#4A6A32' }}
                  >
                    {content.conservationStatus}
                  </span>
                </div>
              </div>

              <div className="identify-match-guide-two-col">
                <div>
                  <div className="identify-match-guide-section-label">Habitat</div>
                  <p className="identify-match-guide-section-text">{content.habitat}</p>
                </div>
                <div>
                  <div className="identify-match-guide-section-label">Diet</div>
                  <p className="identify-match-guide-section-text">{content.diet}</p>
                </div>
              </div>

              <div className="identify-match-guide-section-label">Field Notes</div>
              <ul className="identify-match-guide-facts">
                {content.funFacts.slice(0, 2).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </>
          )}
          {!content && !loadingContent && (
            <div className="identify-match-guide-basic">
              {match.funFact && (
                <p className="identify-match-guide-desc" style={{ fontStyle: 'italic' }}>
                  {match.funFact}
                </p>
              )}
              {localBird && (localBird.familyComName || localBird.order) && (
                <p className="identify-match-guide-loading" style={{ marginTop: match.funFact ? 8 : 0 }}>
                  {[localBird.familyComName && `Family: ${localBird.familyComName}`, localBird.order && `Order: ${localBird.order}`].filter(Boolean).join(' · ')}
                </p>
              )}
              {!match.funFact && !localBird && (
                <p className="identify-match-guide-loading">
                  {match.commonName} — {match.scientificName}
                </p>
              )}
            </div>
          )}
          <button
            className="identify-this-is-it-btn identify-this-is-it-btn--wide"
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
          >
            <CheckmarkIcon /> This is it!
          </button>
        </div>
      )}
    </div>
  );
}

// ── Mic permission denied help ────────────────────────────────────────────────

function MicDeniedHelp({ onTryAgain }: { onTryAgain: () => void }) {
  return (
    <div className="identify-mic-denied">
      <div className="identify-mic-denied-icon">
        <MicOffIcon />
      </div>
      <h3 className="identify-mic-denied-title">Microphone access needed</h3>
      <p className="identify-mic-denied-desc">
        To identify birds by sound, BirdDex needs microphone access. It looks like permission was
        denied. Here's how to re-enable it:
      </p>
      <div className="identify-mic-denied-steps">
        <div className="identify-mic-denied-platform">
          <strong>Safari on iPhone</strong>
          <ol>
            <li>Tap the <strong>aA</strong> button in Safari's address bar</li>
            <li>Tap <strong>Website Settings</strong></li>
            <li>Set <strong>Microphone</strong> to <em>Allow</em></li>
            <li>Reload the page</li>
          </ol>
        </div>
        <div className="identify-mic-denied-platform">
          <strong>Chrome / Android</strong>
          <ol>
            <li>Tap the <strong>lock icon</strong> in the address bar</li>
            <li>Tap <strong>Permissions</strong></li>
            <li>Set <strong>Microphone</strong> to <em>Allow</em></li>
          </ol>
        </div>
        <div className="identify-mic-denied-platform">
          <strong>Firefox</strong>
          <ol>
            <li>Click the <strong>lock icon</strong> in the address bar</li>
            <li>Clear the blocked microphone permission</li>
            <li>Reload and click Allow when prompted</li>
          </ol>
        </div>
      </div>
      <button className="identify-start-btn" style={{ marginTop: '8px' }} onClick={onTryAgain}>
        <MicIcon size={16} /> Try again
      </button>
    </div>
  );
}

// ── Empty / error state ───────────────────────────────────────────────────────

function EmptyState({ message, onTryAgain }: { message: string; onTryAgain: () => void }) {
  return (
    <div className="identify-empty">
      <div className="identify-empty-icon">
        <FeatherSmallIcon />
      </div>
      <p className="identify-empty-msg">{message}</p>
      <button className="identify-try-again-btn" onClick={onTryAgain}>
        Try again
      </button>
    </div>
  );
}

// ── Log confirm modal ─────────────────────────────────────────────────────────

function LogConfirmModal({
  match,
  onConfirm,
  onCancel,
}: {
  match: IdentifyMatch;
  onConfirm: (notes: string) => void;
  onCancel: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [locationLabel, setLocationLabel] = useState('Getting location…');

  useEffect(() => {
    getPositionOnce(5000).then((pos) => {
      setLocationLabel(
        pos
          ? formatCoordsLabel(pos.coords.latitude, pos.coords.longitude)
          : 'Location unavailable',
      );
    });
  }, []);

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return createPortal(
    <motion.div
      className="log-confirm-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="log-confirm-sheet"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="log-confirm-header">
          {match.photoUrl && (
            <img src={match.photoUrl} alt={match.commonName} className="log-confirm-photo" />
          )}
          <div className="log-confirm-bird">
            <h3 className="log-confirm-name">{match.commonName}</h3>
            <p className="log-confirm-sci">{match.scientificName}</p>
          </div>
        </div>

        <div className="log-confirm-meta">
          <div className="log-confirm-row">
            <CalIcon />
            <span>{dateStr}</span>
          </div>
          <div className="log-confirm-row">
            <PinIcon />
            <span>{locationLabel}</span>
          </div>
        </div>

        <textarea
          className="log-confirm-textarea"
          placeholder="Add a note about this sighting… (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="log-confirm-actions">
          <button className="log-confirm-log-btn" onClick={() => onConfirm(notes)}>
            <CheckmarkIcon /> Log sighting
          </button>
          <button className="log-confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

// ── Post-log sheet ────────────────────────────────────────────────────────────

function PostLogSheet({
  onIdentifyAnother,
  onViewCollection,
}: {
  onIdentifyAnother: () => void;
  onViewCollection: () => void;
}) {
  return createPortal(
    <motion.div
      className="post-log-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="post-log-sheet"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
      >
        <p className="post-log-label">Sighting logged!</p>
        <p className="post-log-sub">What would you like to do next?</p>
        <div className="post-log-actions">
          <button className="post-log-btn post-log-btn--primary" onClick={onIdentifyAnother}>
            <MicIcon size={15} /> Identify another bird
          </button>
          <NavLink
            to="/collection"
            className="post-log-btn post-log-btn--secondary"
            onClick={onViewCollection}
          >
            View in My Birds →
          </NavLink>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

// ── Animated feather for photo analyzing state ────────────────────────────────

function FeatherPulse() {
  return (
    <svg
      className="identify-feather-pulse"
      viewBox="0 0 24 24"
      fill="none"
      width="64"
      height="64"
      aria-hidden="true"
    >
      <path
        d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5 19C5 19 8 13 12 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function MicOffIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 11a7 7 0 0014 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 18v3M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MicIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 11a7 7 0 0014 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 18v3M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M21 15l-5-5L5 21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="identify-chevron">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckmarkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7l3.5 3.5 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function FeatherSmallIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
      <path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M7 1C4.79 1 3 2.79 3 5c0 3.5 4 8 4 8s4-4.5 4-8c0-2.21-1.79-4-4-4z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7" cy="5" r="1.4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function CalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 6h11M4.5 1v2M9.5 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
