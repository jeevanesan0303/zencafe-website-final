
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  ChefHat,
  DoorOpen,
  Gamepad2,
  Gift,
  Home,
  Images,
  MapPin,
  Menu as MenuIcon,
  Sparkles,
  UserPlus,
  UtensilsCrossed,
  X,
} from 'lucide-react'

import Header from './components/Header'
import PremiumFooter from './components/PremiumFooter'
import { useSiteTheme } from './theme'

import {
  readGameConfig,
  fetchGameConfig,
  subscribeGameConfig,
  DEFAULT_SCRATCH_COUNT,
  MIN_SCRATCH_COUNT,
  MAX_SCRATCH_COUNT,
  type GameConfig,
  type GamePrize,
} from './data/gameStore'

import './index.css'
import './games.css'



const SCRATCH_WIDTH = 480
const SCRATCH_HEIGHT = 280

// Reveal only after 70% of the coating has been erased.
const REVEAL_COVERAGE = 0.7
const MIN_POINTER_MOVEMENT = 1.5
const SCRATCH_BRUSH_SIZE = 36

const cards = [
  {
    image: '/assets/games/zen-sakura-card.png',
    position: '50% 50%',
    color: '#d97f76',
    rgb: '217 127 118',
  },
  {
    image: '/assets/games/zen-sakura-card.png',
    position: '50% 50%',
    color: '#de6d61',
    rgb: '222 109 97',
  },
  {
    image: '/assets/games/zen-sakura-card.png',
    position: '50% 50%',
    color: '#f6b64f',
    rgb: '246 182 79',
  },
  {
    image: '/assets/games/zen-sakura-card.png',
    position: '50% 50%',
    color: '#ff627c',
    rgb: '255 98 124',
  },
  {
    image: '/assets/games/zen-sakura-card.png',
    position: '50% 50%',
    color: '#e99e96',
    rgb: '233 158 150',
  },
]

const floatingItems = [
  {
    emoji: 'ðŸŽ²',
    x: 12,
    y: 17,
    size: 30,
    delay: -2,
  },
  {
    emoji: 'ðŸŽ®',
    x: 91,
    y: 37,
    size: 34,
    delay: -6,
  },
  {
    emoji: 'âœ¨',
    x: 6,
    y: 61,
    size: 23,
    delay: -3,
  },
  {
    emoji: 'ðŸŽ²',
    x: 87,
    y: 67,
    size: 32,
    delay: -8,
  },
  {
    emoji: 'ðŸ•¹ï¸',
    x: 8,
    y: 87,
    size: 26,
    delay: -5,
  },
  {
    emoji: 'ðŸ‘¾',
    x: 92,
    y: 91,
    size: 25,
    delay: -10,
  },
]

const confettiColors = [
  '#eba59e',
  '#e58e86',
  '#ffd279',
  '#e89890',
  '#ecada7',
  '#ffffff',
]

type Point = {
  x: number
  y: number
}

type GameResult =
  | {
      kind: 'win'
      offer: GamePrize
    }
  | {
      kind: 'lose'
    }

type GamePhase =
  | 'intro'
  | 'spread'
  | 'choose'
  | 'centering'
  | 'flipping'
  | 'scratch'
  | 'revealed'

type ScratchCardProps = {
  result: GameResult
  enabled: boolean
  revealed: boolean
  requiredScratches: number
  onReveal: () => void
}

/* =========================================================
   GAME CONFIGURATION
========================================================= */

function getRequiredScratches(
  config: GameConfig
): number {
  const count = config.scratchCount

  if (
    !Number.isInteger(count) ||
    count < MIN_SCRATCH_COUNT ||
    count > MAX_SCRATCH_COUNT
  ) {
    return DEFAULT_SCRATCH_COUNT
  }

  return count
}

/*
   Preserve the admin-defined winning cards.

   A card with a configured prize wins.
   A card without a prize loses.
*/

function createResult(
  cardIndex: number,
  config: GameConfig
): GameResult {
  const cardId = cardIndex + 1

  const selectedCard = config.cards.find(
    card => card.cardId === cardId
  )

  if (
    !config.enabled ||
    !selectedCard?.prize
  ) {
    return {
      kind: 'lose',
    }
  }

  return {
    kind: 'win',
    offer: {
      ...selectedCard.prize,
    },
  }
}

/* =========================================================
   BACKGROUND
========================================================= */


function WinCelebration() {
  return (
    <div
      className="zg-celebration"
      aria-hidden="true"
    >
      <div className="zg-celebration-glow" />

      {Array.from(
        { length: 64 },
        (_, index) => {
          const style = {
            left:
              `${(index * 37 + 11) % 100}%`,
            width:
              `${6 + (index % 5)}px`,
            height:
              `${9 + (index % 7)}px`,
            backgroundColor:
              confettiColors[
                index %
                  confettiColors.length
              ],
            borderRadius:
              index % 3 === 0
                ? '50%'
                : '2px',
            animationDelay:
              `${(index % 12) * 0.055}s`,
            animationDuration:
              `${2.6 + (index % 6) * 0.22}s`,
            '--drift':
              `${((index * 29) % 220) - 110}px`,
            '--spin':
              `${
                index % 2 === 0
                  ? 720
                  : -720
              }deg`,
          } as CSSProperties

          return (
            <span
              key={index}
              className="zg-confetti"
              style={style}
            />
          )
        }
      )}
    </div>
  )
}

/* =========================================================
   SCRATCH CARD

   CORRECTED INTERACTION

   - One card.
   - One continuous scratch surface.
   - Mouse and touch supported.
   - No customer-facing scratch count.
   - No progress bar.
   - No "clear card" button.
   - Each valid mouse/touch gesture counts once.
   - Keyboard scratch actions count once each.
   - Reveal requires admin scratch count AND 70% coverage.
========================================================= */

function ScratchCard({
  result,
  enabled,
  revealed,
  requiredScratches,
  onReveal,
}: ScratchCardProps) {
  const canvasRef =
    useRef<HTMLCanvasElement>(null)

  const activePointerRef =
    useRef<number | null>(null)

  const previousPointRef =
    useRef<Point | null>(null)

  const keyboardRowRef = useRef(0)
  const scratchGesturesRef = useRef(0)
  const gestureMovedRef = useRef(false)
  const [scratchGestures, setScratchGestures] = useState(0)
  const initialAlphaRef = useRef<Uint8ClampedArray | null>(null)

  const completedRef =
    useRef(false)

  const revealTimerRef =
    useRef<number | null>(null)

  const onRevealRef =
    useRef(onReveal)

  const [finishing, setFinishing] =
    useState(false)

  const [
    canvasUnavailable,
    setCanvasUnavailable,
  ] = useState(false)

  /*
     Keep callback current without
     restarting the scratch surface.
  */

  useEffect(() => {
    onRevealRef.current = onReveal
  }, [onReveal])

  /* -------------------------------------------------------
     DRAW SCRATCH COATING
  ------------------------------------------------------- */

  const drawCoating = useCallback(() => {
    const canvas = canvasRef.current

    if (!canvas) return

    const context =
      canvas.getContext('2d')

    if (!context) {
      setCanvasUnavailable(true)
      return
    }

    setCanvasUnavailable(false)

    context.globalCompositeOperation =
      'source-over'

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    )

    const gradient =
      context.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height
      )

    gradient.addColorStop(
      0,
      '#a8615a'
    )

    gradient.addColorStop(
      0.3,
      '#dd9e98'
    )

    gradient.addColorStop(
      0.55,
      '#f6d6d2'
    )

    gradient.addColorStop(
      1,
      '#b06861'
    )

    context.fillStyle = gradient

    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    )

    /*
       Decorative pattern.
    */

    for (
      let y = 12;
      y < canvas.height;
      y += 22
    ) {
      for (
        let x = 12;
        x < canvas.width;
        x += 22
      ) {
        context.beginPath()

        context.arc(
          x,
          y,
          1.2,
          0,
          Math.PI * 2
        )

        context.fillStyle =
          'rgba(78, 36, 32, 0.14)'

        context.fill()
      }
    }

    /*
       Inner border.
    */

    context.strokeStyle =
      'rgba(255,255,255,0.5)'

    context.lineWidth = 1

    context.strokeRect(
      18,
      18,
      canvas.width - 36,
      canvas.height - 36
    )

    context.textAlign = 'center'
    context.fillStyle = '#472b28'

    context.font =
      '600 14px system-ui'

    context.fillText(
      'ZEN CAFÃ‰ Â· PLAY CORNER',
      canvas.width / 2,
      63
    )

    context.font =
      '34px Georgia'

    context.fillText(
      'Scratch & discover',
      canvas.width / 2,
      124
    )

    context.font =
      '600 17px system-ui'

    context.fillText(
      'SCRATCH HERE',
      canvas.width / 2,
      166
    )

    context.font =
      '14px system-ui'

    context.fillText(
      'Your surprise is waiting',
      canvas.width / 2,
      196
    )

    context.font =
      '22px Georgia'

    context.fillText(
      'âœ¦',
      canvas.width / 2,
      237
    )
  }, [])

  /* -------------------------------------------------------
     INITIALIZE SCRATCH ROUND
  ------------------------------------------------------- */

  useEffect(() => {
    keyboardRowRef.current = 0
    scratchGesturesRef.current = 0
    gestureMovedRef.current = false
    setScratchGestures(0)
    initialAlphaRef.current = null

    completedRef.current = false

    activePointerRef.current = null

    previousPointRef.current = null

    drawCoating()
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (canvas && context) {
      initialAlphaRef.current = context.getImageData(
        0, 0, canvas.width, canvas.height
      ).data
    }

    return () => {
      if (
        revealTimerRef.current !== null
      ) {
        window.clearTimeout(
          revealTimerRef.current
        )

        revealTimerRef.current = null
      }
    }
  }, [drawCoating])

  /* -------------------------------------------------------
     POINTER COORDINATES

     Works with:
     - Mouse
     - Touchscreen
     - Apple Pencil / stylus
  ------------------------------------------------------- */

  const getPointerPoint = (
    event:
      ReactPointerEvent<HTMLCanvasElement>
  ): Point | null => {
    const canvas = canvasRef.current

    if (!canvas) return null

    const rect =
      canvas.getBoundingClientRect()

    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return null
    }

    const x =
      (
        (event.clientX - rect.left) /
        rect.width
      ) * canvas.width

    const y =
      (
        (event.clientY - rect.top) /
        rect.height
      ) * canvas.height

    return {
      x: Math.max(
        0,
        Math.min(canvas.width, x)
      ),

      y: Math.max(
        0,
        Math.min(canvas.height, y)
      ),
    }
  }

  

  const finishGame = () => {
    if (completedRef.current) {
      return
    }

    completedRef.current = true

    activePointerRef.current = null

    previousPointRef.current = null

    setFinishing(true)

    const canvas = canvasRef.current

    const context =
      canvas?.getContext('2d')

    if (canvas && context) {
      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      )
    }

    if (
      revealTimerRef.current !== null
    ) {
      window.clearTimeout(
        revealTimerRef.current
      )
    }

    revealTimerRef.current =
      window.setTimeout(() => {
        revealTimerRef.current = null

        onRevealRef.current()
      }, 350)
  }

  

  const checkCoverage = () => {
    const canvas = canvasRef.current
    const initial = initialAlphaRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !initial || completedRef.current) return
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let original = 0
    let removed = 0
    for (let i = 3; i < initial.length; i += 4) {
      original += initial[i]
      removed += Math.max(0, initial[i] - pixels[i])
    }
    if (
      original > 0 &&
      removed / original >= REVEAL_COVERAGE &&
      scratchGesturesRef.current >= requiredScratches
    ) {
      finishGame()
    }
  }

  const drawScratchStroke = (from: Point, to: Point) => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return
    context.save()
    context.globalCompositeOperation = 'destination-out'
    context.strokeStyle = '#000'
    context.lineWidth = SCRATCH_BRUSH_SIZE
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(from.x, from.y)
    context.lineTo(to.x, to.y)
    context.stroke()
    context.restore()
  }

  const processScratchMovement = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    if (!enabled || revealed || finishing || completedRef.current) return
    const point = getPointerPoint(event)
    if (!point) return
    const previous = previousPointRef.current
    if (!previous) {
      previousPointRef.current = point
      return
    }
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < MIN_POINTER_MOVEMENT) return
    drawScratchStroke(previous, point)
    gestureMovedRef.current = true
    previousPointRef.current = point
    checkCoverage()
  }

  /* -------------------------------------------------------
     START SCRATCHING
  ------------------------------------------------------- */

  const startScratching = (
    event:
      ReactPointerEvent<HTMLCanvasElement>
  ) => {
    if (
      !enabled ||
      revealed ||
      finishing ||
      completedRef.current ||
      canvasUnavailable ||
      !event.isPrimary ||
      activePointerRef.current !== null
    ) {
      return
    }

    /*
       Ignore secondary mouse buttons.
       Touch and pen input remain allowed.
    */

    if (
      event.pointerType === 'mouse' &&
      event.button !== 0
    ) {
      return
    }

    const point =
      getPointerPoint(event)

    if (!point) return

    event.preventDefault()

    activePointerRef.current =
      event.pointerId

    gestureMovedRef.current = false

    previousPointRef.current =
      point

    try {
      event.currentTarget
        .setPointerCapture(
          event.pointerId
        )
    } catch {
      /*
         Continue without pointer
         capture if unavailable.
      */
    }
  }

  

  const moveScratching = (
    event:
      ReactPointerEvent<HTMLCanvasElement>
  ) => {
    if (
      activePointerRef.current !==
        event.pointerId ||
      completedRef.current
    ) {
      return
    }

    event.preventDefault()

    processScratchMovement(event)
  }

  /* -------------------------------------------------------
     STOP POINTER

     Count one valid gesture when the user releases.
     A click/tap without movement does not count.
  ------------------------------------------------------- */

  const stopScratching = (
    event:
      ReactPointerEvent<HTMLCanvasElement>
  ) => {
    if (
      activePointerRef.current !==
      event.pointerId
    ) {
      return
    }

    if (
      event.type === 'pointerup' &&
      !completedRef.current
    ) {
      processScratchMovement(event)
    }

    const countGesture =
      event.type === 'pointerup' &&
      gestureMovedRef.current &&
      !completedRef.current

    activePointerRef.current = null
    previousPointRef.current = null
    gestureMovedRef.current = false

    if (countGesture) {
      scratchGesturesRef.current += 1
      setScratchGestures(scratchGesturesRef.current)
      checkCoverage()
    }

    try {
      if (
        event.currentTarget
          .hasPointerCapture(
            event.pointerId
          )
      ) {
        event.currentTarget
          .releasePointerCapture(
            event.pointerId
          )
      }
    } catch {
      /*
         Capture may already
         have been released.
      */
    }
  }

  /* -------------------------------------------------------
     KEYBOARD ACCESSIBILITY

     The keyboard button is visually
     hidden, but remains available
     to keyboard users.
  ------------------------------------------------------- */

  const keyboardScratch = () => {
    if (!enabled || revealed || finishing || completedRef.current || canvasUnavailable) return
    const canvas = canvasRef.current
    if (!canvas) return
    // Each activation erases a new horizontal band using the same brush
    // and the same 70% area check as mouse/touch input.
    const step = SCRATCH_BRUSH_SIZE * 0.8
    const rowCount = Math.ceil(canvas.height / step)
    const y = Math.min(canvas.height - 1, keyboardRowRef.current * step + step / 2)
    drawScratchStroke({ x: 0, y }, { x: canvas.width, y })
    keyboardRowRef.current = (keyboardRowRef.current + 1) % rowCount
    scratchGesturesRef.current += 1
    setScratchGestures(scratchGesturesRef.current)
    checkCoverage()
  }

  const won =
    result.kind === 'win'

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <div className="zg-scratch-area">
      <div
        className={[
          'zg-ticket',
          revealed
            ? 'is-revealed'
            : '',
          revealed
            ? won
              ? 'is-win'
              : 'is-lose'
            : '',
        ].join(' ')}
      >
        {/* RESULT */}

        {revealed ? (
          <div className="zg-prize">
            <span
              className="zg-prize-emoji"
              aria-hidden="true"
            >
              {won
                ? result.offer.emoji
                : 'ðŸ¥º'}
            </span>

            <span className="zg-eyebrow">
              {won
                ? 'YOU WON!'
                : 'NOT THIS TIME'}
            </span>

            <h3>
              {won
                ? result.offer.title
                : 'Good Luck Next Time!'}
            </h3>

            <p>
              {won
                ? result.offer.detail
                : 'Your next little surprise is waiting.'}
            </p>

            <span className="zg-demo-badge">
              {won
                ? 'Demo reward'
                : 'Another chance awaits'}
            </span>
          </div>
        ) : (
          <div
            className="zg-mystery"
            aria-hidden="true"
          >
            <Sparkles size={28} />

            <strong>
              {finishing
                ? 'Your surprise is ready!'
                : 'Keep scratching'}
            </strong>

            <span>
              {finishing
                ? 'Revealing your little surpriseâ€¦'
                : 'A little surprise is waiting for you'}
            </span>
          </div>
        )}

        {/* SCRATCH SURFACE */}

        {!revealed && (
          <canvas
            ref={canvasRef}
            width={SCRATCH_WIDTH}
            height={SCRATCH_HEIGHT}
            className="zg-scratch-canvas"
            aria-label="Scratch the card to reveal your surprise"
            role="img"
            style={{
              touchAction: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',

              pointerEvents:
                enabled &&
                !finishing &&
                !canvasUnavailable
                  ? 'auto'
                  : 'none',

              opacity:
                finishing ? 0 : 1,

              transition:
                'opacity 0.35s ease',

              cursor:
                enabled
                  ? 'crosshair'
                  : 'default',
            }}
            onPointerDown={
              startScratching
            }
            onPointerMove={
              moveScratching
            }
            onPointerUp={
              stopScratching
            }
            onPointerCancel={
              stopScratching
            }
            onLostPointerCapture={
              stopScratching
            }
            onContextMenu={event =>
              event.preventDefault()
            }
            onDragStart={event =>
              event.preventDefault()
            }
          />
        )}
      </div>

      {/* CUSTOMER INSTRUCTIONS */}

      {!revealed && (
        <div className="zg-scratch-help">
          <p aria-live="polite">
            {canvasUnavailable
              ? 'Scratch surface unavailable. Please reload.'
              : finishing
                ? 'Revealing your surpriseâ€¦'
                : `Scratch the card ${requiredScratches} times and clear 70% to reveal (${Math.min(scratchGestures, requiredScratches)}/${requiredScratches}).`}
          </p>

          {/* KEYBOARD-ONLY CONTROL */}

          <button
            type="button"
            onClick={keyboardScratch}
            disabled={
              !enabled ||
              finishing ||
              canvasUnavailable
            }
            aria-label="Scratch the card using the keyboard"
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip:
                'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            Scratch card
          </button>
        </div>
      )}
    </div>
  )
}

/* =========================================================
   MAIN GAME EXPERIENCE
========================================================= */

function GamesExperience() {
  const theme = useSiteTheme()

  const [
    gameConfig,
    setGameConfig,
  ] = useState<GameConfig>(
    () => readGameConfig()
  )

  const [
    roundScratchCount,
    setRoundScratchCount,
  ] = useState<number>(
    () =>
      getRequiredScratches(
        readGameConfig()
      )
  )

  const [
    phase,
    setPhase,
  ] = useState<GamePhase>('intro')

  const [
    selected,
    setSelected,
  ] = useState<number | null>(null)

  const [
    result,
    setResult,
  ] = useState<GameResult | null>(null)

  const [
    round,
    setRound,
  ] = useState(0)

  const selectionLock =
    useRef(false)

  const scratchBackRef =
    useRef<HTMLDivElement>(null)

  const replayRef =
    useRef<HTMLButtonElement>(null)

  const revealed =
    phase === 'revealed'

  const scratchEnabled =
    phase === 'scratch'

  const flipped =
    phase === 'flipping' ||
    phase === 'scratch' ||
    revealed

  const won =
    revealed &&
    result?.kind === 'win'

  const lost =
    revealed &&
    result?.kind === 'lose'

  /* -------------------------------------------------------
     LOAD GAME CONFIGURATION
  ------------------------------------------------------- */

  useEffect(() => {
    let mounted = true

    fetchGameConfig()
      .then(config => {
        if (mounted) {
          setGameConfig(config)
        }
      })
      .catch(error => {
        console.warn(
          'Unable to load game configuration:',
          error
        )
      })

    const unsubscribe =
      subscribeGameConfig(() => {
        if (!mounted) return

        setGameConfig(
          readGameConfig()
        )
      })

    return () => {
      mounted = false

      unsubscribe()
    }
  }, [])

  /* -------------------------------------------------------
     CARD ANIMATION TIMING
  ------------------------------------------------------- */

  useEffect(() => {
    const reducedMotion =
      typeof window.matchMedia ===
        'function' &&
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches

    const transitions: Partial<
      Record<
        GamePhase,
        {
          next: GamePhase
          delay: number
        }
      >
    > = {
      intro: {
        next: 'spread',
        delay: 900,
      },

      spread: {
        next: 'choose',
        delay: 1100,
      },

      centering: {
        next: 'flipping',
        delay: 950,
      },

      flipping: {
        next: 'scratch',
        delay: 1050,
      },
    }

    const transition =
      transitions[phase]

    if (!transition) return

    const timer =
      window.setTimeout(
        () => {
          setPhase(
            transition.next
          )
        },
        reducedMotion
          ? 40
          : transition.delay
      )

    return () => {
      window.clearTimeout(timer)
    }
  }, [phase])

  /* -------------------------------------------------------
     ACCESSIBILITY FOCUS
  ------------------------------------------------------- */

  useEffect(() => {
    if (phase === 'scratch') {
      scratchBackRef.current
        ?.querySelector<HTMLButtonElement>(
          '.zg-scratch-help button'
        )
        ?.focus({
          preventScroll: true,
        })
    }

    if (phase === 'revealed') {
      replayRef.current?.focus({
        preventScroll: true,
      })
    }
  }, [phase])

  /* -------------------------------------------------------
     SELECT CARD
  ------------------------------------------------------- */

  const chooseCard = (
    index: number
  ) => {
    if (
      phase !== 'choose' ||
      selectionLock.current ||
      !gameConfig.enabled
    ) {
      return
    }

    selectionLock.current =
      true

    const selectedResult =
      createResult(
        index,
        gameConfig
      )

    /*
       Freeze the scratch requirement
       for the current game round.
    */

    setRoundScratchCount(
      getRequiredScratches(
        gameConfig
      )
    )

    setResult(
      selectedResult
    )

    setSelected(index)

    setPhase(
      'centering'
    )
  }

  /* -------------------------------------------------------
     RESET GAME
  ------------------------------------------------------- */

  const resetGame = () => {
    selectionLock.current =
      false

    setSelected(null)

    setResult(null)

    setRound(
      current => current + 1
    )

    setPhase('intro')
  }

  /* -------------------------------------------------------
     REVEAL RESULT
  ------------------------------------------------------- */

  const revealResult = () => {
    setPhase(current =>
      current === 'scratch'
        ? 'revealed'
        : current
    )
  }

  const choosing =
    phase === 'spread' ||
    phase === 'choose'

  const message =
    !gameConfig.enabled &&
    phase === 'choose'
      ? 'The game is temporarily unavailable.'
      : phase === 'intro'
        ? 'Your little adventure beginsâ€¦'
        : choosing
          ? 'Choose your winning card'
          : phase === 'centering'
            ? 'Your choice. Your moment.'
            : phase === 'flipping'
              ? 'Something is waiting for you.'
              : phase === 'scratch'
                ? 'Scratch & discover your little surprise.'
                : won
                  ? 'A little win. A big celebration.'
                  : 'Your next lucky moment awaits.'

  /* -------------------------------------------------------
     PAGE
  ------------------------------------------------------- */

  return (
    <div className="zen-games-layout"><Header />
    <main
      className="zg-page"
      data-theme={theme}
    >
      <div className="zg-paper-decoration" aria-hidden="true" />

      {/* MAIN CONTENT */}

      <div className="zg-container">
        {/* HERO */}

        <section className="zg-hero">
          <div className="zg-hero-copy">
          <div className="zg-hero-badge">
            <Gamepad2 size={15} />

            <span>
              ZEN CAFÃ‰ Â· PLAY CORNER
            </span>

            <i aria-hidden="true" />
          </div>

          <h1>
            A little play.

            <br />

            <em>
              A little Zen.
            </em>
          </h1>

          <p>
            Take a break. Choose a card.
            Let your little surprise unfold.
          </p>

          <div className="zg-how-it-works">
            <span>
              Choose a card
            </span>

            <i aria-hidden="true" />

            <span>
              Scratch
            </span>

            <i aria-hidden="true" />

            <span>
              Discover
            </span>
          </div>

          {!gameConfig.enabled && (
            <p
              role="status"
              style={{
                marginTop: 20,
                textAlign: 'center',
                color: 'var(--accent)',
                fontWeight: 600,
              }}
            >
              The scratch card game is
              temporarily unavailable.
              Please check back later.
            </p>
          )}
          <a href="#game" className="zg-hero-cta">Letâ€™s play <Gamepad2 size={18} /></a>
          <p className="zg-hero-disclaimer">Just for fun Â· Demo rewards only</p>
          </div>
        </section>
        <div className="zg-step-cards" aria-label="How to play"><div><b>01</b><span>Choose your card<small>Follow your feeling.</small></span></div><div><b>02</b><span>Scratch to reveal<small>Use your finger or mouse.</small></span></div><div><b>03</b><span>Enjoy the surprise<small>A little moment of Zen.</small></span></div></div>

        {/* GAME SHELL */}

        <section
          id="game"
          className={[
            'zg-game-shell',
            `phase-${phase}`,
            won
              ? 'result-win'
              : '',
            lost
              ? 'result-lose'
              : '',
          ].join(' ')}
        >
          <div
            className="zg-table-neon"
            aria-hidden="true"
          >
            <span />
            <span />
          </div>

          {won && (
            <WinCelebration
              key={`celebration-${round}`}
            />
          )}

          {/* GAME HEADING */}

          <div className="zg-game-heading">
            <span className="zg-eyebrow">
              A MOMENT OF LUCK
            </span>

            <h2
              role="status"
              aria-live="polite"
            >
              {choosing &&
              gameConfig.enabled ? (
                <>
                  Choose your{' '}

                  <em>
                    winning card
                  </em>
                </>
              ) : (
                message
              )}
            </h2>

            <div
              className="zg-heading-line"
              aria-hidden="true"
            >
              <span />

              <b>
                âœ¦
              </b>

              <span />
            </div>
          </div>

          {/* FIVE CARDS */}

          <div className="zg-deal-stage">
            <div
              className="zg-table-glow"
              aria-hidden="true"
            />

            <div
              className="zg-table-floor"
              aria-hidden="true"
            />

            {cards.map(
              (card, index) => {
                const isSelected =
                  selected === index

                if (
                  selected !== null &&
                  !isSelected &&
                  phase !== 'centering'
                ) {
                  return null
                }

                const showBack =
                  isSelected &&
                  flipped

                const canChoose =
                  phase === 'choose' &&
                  gameConfig.enabled

                const cardStyle = {
                  '--card-color':
                    card.color,
                  '--card-rgb':
                    card.rgb,
                } as CSSProperties

                return (
                  <article
                    key={`${round}-${index}`}
                    style={cardStyle}
                    className={[
                      'zg-deal-card',
                      `zg-position-${index}`,
                      index === 2
                        ? 'is-intro-card'
                        : '',
                      isSelected
                        ? 'is-chosen'
                        : '',
                      selected !== null &&
                      !isSelected
                        ? 'is-leaving'
                        : '',
                    ].join(' ')}
                    aria-hidden={
                      phase === 'intro'
                        ? index !== 2
                        : selected !== null &&
                          !isSelected
                    }
                  >
                    <div
                      className="zg-card-ground-glow"
                      aria-hidden="true"
                    />

                    <div
                      className={[
                        'zg-deal-flipper',
                        showBack
                          ? 'is-turned'
                          : '',
                      ].join(' ')}
                    >
                      {/* CARD FRONT */}

                      <button
                        type="button"
                        className="zg-deal-front"
                        disabled={
                          !canChoose
                        }
                        tabIndex={
                          canChoose
                            ? 0
                            : -1
                        }
                        aria-hidden={
                          showBack
                        }
                        aria-label={
                          `Choose mystery card ${index + 1}`
                        }
                        onClick={() =>
                          chooseCard(
                            index
                          )
                        }
                      >
                        <span className="zg-photo">
                          <span
                            className="zg-photo-fallback"
                            aria-hidden="true"
                          >
                            âœ¦
                          </span>

                          <img
                            src={
                              card.image
                            }
                            alt=""
                            draggable={
                              false
                            }
                            style={{
                              objectPosition:
                                card.position,
                            }}
                            onError={
                              event => {
                                event.currentTarget.style.display =
                                  'none'
                              }
                            }
                          />
                        </span>
                      </button>

                      {/* CARD BACK */}

                      <div
                        ref={
                          isSelected
                            ? scratchBackRef
                            : undefined
                        }
                        className="zg-deal-back"
                        aria-hidden={
                          !scratchEnabled &&
                          !revealed
                        }
                      >
                        {isSelected &&
                          result && (
                            <>
                              <span
                                className="zg-back-emblem"
                                aria-hidden="true"
                              >
                                {revealed &&
                                !won
                                  ? 'â™¡'
                                  : 'âœ¦'}
                              </span>

                              <span className="zg-eyebrow">
                                {revealed
                                  ? won
                                    ? 'LUCK LOOKS GOOD ON YOU'
                                    : 'ANOTHER CHANCE AWAITS'
                                  : 'YOUR LITTLE ZEN SURPRISE'}
                              </span>

                              <h3>
                                {revealed
                                  ? won
                                    ? 'Lucky you!'
                                    : 'Good Luck Next Time!'
                                  : 'Scratch & discover.'}
                              </h3>

                              <ScratchCard
                                key={`scratch-${round}`}
                                result={
                                  result
                                }
                                enabled={
                                  scratchEnabled
                                }
                                revealed={
                                  revealed
                                }
                                requiredScratches={
                                  roundScratchCount
                                }
                                onReveal={
                                  revealResult
                                }
                              />

                              <span className="zg-back-signature">
                                with love,
                                Zen CafÃ©
                              </span>
                            </>
                          )}
                      </div>
                    </div>
                  </article>
                )
              }
            )}
          </div>

          {/* RESULT CAPTION */}

          <div className="zg-stage-caption">
            {scratchEnabled && (
              <p>
                Scratch the card to
                discover your little
                surprise.
              </p>
            )}

            {revealed &&
              result && (
                <div
                  className={[
                    'zg-result-message',
                    result.kind ===
                    'win'
                      ? 'is-win'
                      : 'is-lose',
                  ].join(' ')}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span
                    className="zg-result-reaction"
                    aria-hidden="true"
                  >
                    {result.kind ===
                    'win'
                      ? 'ðŸ¥³'
                      : 'ðŸ¥º'}
                  </span>

                  <strong>
                    {result.kind ===
                    'win'
                      ? `Hooray! You won ${result.offer.title.toLowerCase()}!`
                      : 'Good Luck Next Time!'}
                  </strong>

                  <p>
                    {result.kind ===
                    'win'
                      ? 'A little luck. A lovely reason to smile.'
                      : 'Your next lucky moment could be one card away.'}
                  </p>

                  <span className="zg-result-note">
                    {result.kind ===
                    'win'
                      ? 'Demo reward â€” not a redeemable voucher.'
                      : 'Demo game â€” a fresh chance awaits each round.'}
                  </span>

                  <button
                    ref={replayRef}
                    type="button"
                    className="zg-reset"
                    onClick={
                      resetGame
                    }
                  >
                    {result.kind ===
                    'win'
                      ? 'Play again â†»'
                      : 'Try my luck again â†»'}
                  </button>
                </div>
              )}
          </div>
        </section>

      </div>
    </main><PremiumFooter /></div>
  )
}

/* =========================================================
   REACT ENTRY
========================================================= */

const rootElement =
  document.getElementById('root')

if (!rootElement) {
  throw new Error(
    'games.html must contain <div id="root"></div>'
  )
}

createRoot(rootElement).render(
  React.createElement(
    GamesExperience
  )
)
