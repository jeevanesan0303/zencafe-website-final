
import { getAdminAuthHeaders } from '../admin-auth'

/* =========================================================
   ZEN CAFÉ — SCRATCH GAME STORE

   - Five selectable cards.
   - Exactly two configured winning cards.
   - Reveal after 75% coating removal.
   - scratchCount represents global completed plays.
   - The backend determines every result.
   - No customer registration required.
========================================================= */

export type GamePrize = {
  productId: string
  title: string
  detail: string
  emoji: string
}

export type GameCardConfig = {
  cardId: number
  prize: GamePrize | null
}

export type GameConfig = {
  enabled: boolean
  scratchCount: number
  cards: GameCardConfig[]
}

export type ScratchSession = {
  success: true
  sessionId: string
  cardId: number
  expiresAt: string
  resumed: boolean
}

export type ScratchCompletion = {
  success: true
  completed: true
  sessionId: string
  isWinner: boolean
  prize: GamePrize | null
  duplicate?: boolean
}

export type ScratchStats = {
  success: true
  totalPlays: number
  scratchCount: number
  progress: number
  remaining: number
  nextMilestone: number
  updatedAt: string | null
}

/* ===================== CONSTANTS ===================== */

export const GAME_CONFIG_KEY =
  'zen-cafe-scratch-game-v1'

export const GAME_CONFIG_EVENT =
  'zen-cafe-scratch-game-change'

export const DEFAULT_SCRATCH_COUNT = 25
export const MIN_SCRATCH_COUNT = 1
export const MAX_SCRATCH_COUNT = 100

export const TOTAL_GAME_CARDS = 5
export const REQUIRED_WINNING_CARDS = 2

export const DEFAULT_REQUIRED_ATTEMPTS =
  DEFAULT_SCRATCH_COUNT

export const MIN_REQUIRED_ATTEMPTS =
  MIN_SCRATCH_COUNT

export const MAX_REQUIRED_ATTEMPTS =
  MAX_SCRATCH_COUNT

const GAME_SETTINGS_ENDPOINT =
  '/api/games/settings'

const SCRATCH_START_ENDPOINT =
  '/api/games/scratch/start'

const SCRATCH_COMPLETE_ENDPOINT =
  '/api/games/scratch/complete'

const SCRATCH_STATS_ENDPOINT =
  '/api/games/scratch/stats'

/* ===================== DEFAULT CONFIG ===================== */

export const DEFAULT_GAME_CONFIG: GameConfig = {
  enabled: true,
  scratchCount: DEFAULT_SCRATCH_COUNT,
  cards: [
    {
      cardId: 1,
      prize: {
        productId: 'demo-iced-coffee',
        title: 'Iced Coffee',
        detail: 'A cool Zen Café treat.',
        emoji: '🧋',
      },
    },
    {
      cardId: 2,
      prize: null,
    },
    {
      cardId: 3,
      prize: null,
    },
    {
      cardId: 4,
      prize: {
        productId: 'demo-burger',
        title: 'Zen Burger',
        detail: 'A delicious little surprise.',
        emoji: '🍔',
      },
    },
    {
      cardId: 5,
      prize: null,
    },
  ],
}

/* ===================== INTERNAL TYPES ===================== */

type UnknownRecord = Record<string, unknown>

type ApiConfigResult = {
  config: GameConfig | null
  scratchCountPresent: boolean
}

function isRecord(
  value: unknown
): value is UnknownRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isValidScratchCount(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_SCRATCH_COUNT &&
    value <= MAX_SCRATCH_COUNT
  )
}

function isValidCardId(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= TOTAL_GAME_CARDS
  )
}

function isValidPrize(
  value: unknown
): value is GamePrize {
  return (
    isRecord(value) &&
    typeof value.productId === 'string' &&
    Boolean(value.productId.trim()) &&
    typeof value.title === 'string' &&
    Boolean(value.title.trim()) &&
    typeof value.detail === 'string' &&
    typeof value.emoji === 'string'
  )
}

function isValidSessionId(
  value: unknown
): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

function isNonNegativeInteger(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  )
}

/* ===================== NORMALIZATION ===================== */

export function normalizeScratchCount(
  value: unknown
): number {
  return isValidScratchCount(value)
    ? value
    : DEFAULT_SCRATCH_COUNT
}

export function normalizeRequiredAttempts(
  value: unknown
): number {
  return normalizeScratchCount(value)
}

export function getRequiredScratchAttempts(
  config: GameConfig
): number {
  return normalizeScratchCount(
    config.scratchCount
  )
}

/* ===================== VALIDATION ===================== */

export function isValidGameConfig(
  value: unknown
): value is GameConfig {
  if (!isRecord(value)) {
    return false
  }

  if (
    typeof value.enabled !== 'boolean' ||
    !isValidScratchCount(value.scratchCount) ||
    !Array.isArray(value.cards) ||
    value.cards.length !== TOTAL_GAME_CARDS
  ) {
    return false
  }

  const cardIds = new Set<number>()
  let winningCards = 0

  for (const item of value.cards) {
    if (!isRecord(item)) {
      return false
    }

    const cardId = item.cardId

    if (
      !isValidCardId(cardId) ||
      cardIds.has(cardId)
    ) {
      return false
    }

    cardIds.add(cardId)

    if (item.prize === null) {
      continue
    }

    if (!isValidPrize(item.prize)) {
      return false
    }

    winningCards += 1
  }

  return (
    cardIds.size === TOTAL_GAME_CARDS &&
    winningCards === REQUIRED_WINNING_CARDS
  )
}

export function normalizeGameConfig(
  value: unknown
): GameConfig | null {
  if (!isRecord(value)) {
    return null
  }

  const candidate: unknown = {
    ...value,
    scratchCount:
      value.scratchCount === undefined
        ? DEFAULT_SCRATCH_COUNT
        : value.scratchCount,
  }

  if (!isValidGameConfig(candidate)) {
    return null
  }

  return {
    enabled: candidate.enabled,
    scratchCount: candidate.scratchCount,
    cards: candidate.cards
      .map(card => ({
        cardId: card.cardId,
        prize:
          card.prize === null
            ? null
            : {
                productId: card.prize.productId,
                title: card.prize.title,
                detail: card.prize.detail,
                emoji: card.prize.emoji,
              },
      }))
      .sort((a, b) => a.cardId - b.cardId),
  }
}

/* ===================== CONFIG COMPARISON ===================== */

function sameGameConfig(
  first: GameConfig,
  second: GameConfig
): boolean {
  if (
    first.enabled !== second.enabled ||
    first.scratchCount !== second.scratchCount ||
    first.cards.length !== second.cards.length
  ) {
    return false
  }

  return first.cards.every(card => {
    const other = second.cards.find(
      item => item.cardId === card.cardId
    )

    if (!other) {
      return false
    }

    if (
      card.prize === null ||
      other.prize === null
    ) {
      return (
        card.prize === null &&
        other.prize === null
      )
    }

    return (
      card.prize.productId ===
        other.prize.productId &&
      card.prize.title ===
        other.prize.title &&
      card.prize.detail ===
        other.prize.detail &&
      card.prize.emoji ===
        other.prize.emoji
    )
  })
}

/* ===================== LOCAL CONFIG CACHE ===================== */

function notifyGameConfigChange(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new Event(GAME_CONFIG_EVENT)
  )
}

function persistGameConfig(
  config: GameConfig
): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      GAME_CONFIG_KEY,
      JSON.stringify(config)
    )
  } catch (error) {
    console.warn(
      'Unable to cache game configuration:',
      error
    )
  }

  notifyGameConfigChange()
}

export function readGameConfig(): GameConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_GAME_CONFIG
  }

  try {
    const stored = window.localStorage.getItem(
      GAME_CONFIG_KEY
    )

    if (stored) {
      const parsed: unknown = JSON.parse(stored)
      const config = normalizeGameConfig(parsed)

      if (config) {
        return config
      }
    }
  } catch (error) {
    console.warn(
      'Unable to read cached game settings:',
      error
    )
  }

  return DEFAULT_GAME_CONFIG
}

/* ===================== API RESPONSE ===================== */

function getRawApiConfig(
  response: unknown
): unknown {
  if (!isRecord(response)) {
    return null
  }

  if (response.config !== undefined) {
    return response.config
  }

  return response
}

function parseApiConfig(
  response: unknown,
  requireScratchCount: boolean
): ApiConfigResult {
  const rawConfig = getRawApiConfig(response)

  if (!isRecord(rawConfig)) {
    return {
      config: null,
      scratchCountPresent: false,
    }
  }

  const scratchCountPresent =
    Object.prototype.hasOwnProperty.call(
      rawConfig,
      'scratchCount'
    )

  if (
    requireScratchCount &&
    !scratchCountPresent
  ) {
    return {
      config: null,
      scratchCountPresent: false,
    }
  }

  return {
    config: normalizeGameConfig(rawConfig),
    scratchCountPresent,
  }
}

function extractGameConfig(
  response: unknown
): GameConfig | null {
  return parseApiConfig(
    response,
    false
  ).config
}

/* ===================== API ERRORS ===================== */

export class ScratchApiError extends Error {
  readonly status: number
  readonly retryAfterSeconds?: number

  constructor(
    message: string,
    status: number,
    retryAfterSeconds?: number
  ) {
    super(message)

    this.name = 'ScratchApiError'
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

function getApiErrorMessage(
  data: unknown,
  fallback: string
): string {
  if (isRecord(data)) {
    if (
      typeof data.error === 'string' &&
      data.error.trim()
    ) {
      return data.error
    }

    if (
      typeof data.message === 'string' &&
      data.message.trim()
    ) {
      return data.message
    }
  }

  return fallback
}

async function readApiError(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data: unknown = await response.json()

    return getApiErrorMessage(
      data,
      fallback
    )
  } catch {
    return fallback
  }
}

function describeMismatch(
  expected: GameConfig,
  actual: GameConfig
): string {
  if (
    expected.scratchCount !==
    actual.scratchCount
  ) {
    return (
      'The Games API did not preserve scratchCount. ' +
      `Requested: ${expected.scratchCount}. ` +
      `Returned: ${actual.scratchCount}. ` +
      'Update the backend /api/games/settings ' +
      'handler to store and return scratchCount.'
    )
  }

  if (expected.enabled !== actual.enabled) {
    return (
      'The Games API did not preserve ' +
      'the game enabled/disabled setting.'
    )
  }

  return (
    'The Games API did not preserve all ' +
    'winning-card and prize settings.'
  )
}

/* ===================== FETCH CONFIG ===================== */

export async function fetchGameConfig():
  Promise<GameConfig> {
  try {
    const response = await fetch(
      GAME_SETTINGS_ENDPOINT,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        credentials: 'same-origin',
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      throw new Error(
        `Unable to fetch game settings (${response.status}).`
      )
    }

    const data: unknown = await response.json()
    const config = extractGameConfig(data)

    if (!config) {
      throw new Error(
        'The Games API returned invalid settings.'
      )
    }

    persistGameConfig(config)

    return config
  } catch (error) {
    console.warn(
      'Unable to fetch live game settings:',
      error
    )

    return readGameConfig()
  }
}

/* ===================== SAVE CONFIG ===================== */

export async function saveGameConfig(
  config: GameConfig
): Promise<void> {
  if (!isValidGameConfig(config)) {
    throw new Error(
      'Invalid game settings. Exactly two of ' +
      'the five cards must have valid prizes. ' +
      'The required completed plays must be between ' +
      `${MIN_SCRATCH_COUNT} and ${MAX_SCRATCH_COUNT}.`
    )
  }

  const requestedConfig =
    normalizeGameConfig(config)

  if (!requestedConfig) {
    throw new Error(
      'Unable to normalize game settings.'
    )
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...getAdminAuthHeaders(),
  }

  let response: Response

  try {
    response = await fetch(
      GAME_SETTINGS_ENDPOINT,
      {
        method: 'PUT',
        headers,
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify(requestedConfig),
      }
    )
  } catch {
    throw new Error(
      'Unable to connect to the Games API. ' +
      'Check your connection and try again.'
    )
  }

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        `Unable to save game settings (${response.status}).`
      )
    )
  }

  const responseText = await response.text()

  if (responseText.trim()) {
    let responseData: unknown

    try {
      responseData = JSON.parse(responseText)
    } catch {
      throw new Error(
        'The Games API returned invalid JSON ' +
        'after the save request.'
      )
    }

    if (isRecord(responseData)) {
      const hasConfig =
        responseData.config !== undefined ||
        (
          responseData.enabled !== undefined &&
          responseData.cards !== undefined
        )

      if (hasConfig) {
        const parsed = parseApiConfig(
          responseData,
          true
        )

        if (!parsed.scratchCountPresent) {
          throw new Error(
            'The Games API omitted scratchCount ' +
            'from its save response. The backend ' +
            'must return the saved scratchCount.'
          )
        }

        if (!parsed.config) {
          throw new Error(
            'The Games API returned invalid ' +
            'saved game settings.'
          )
        }

        if (
          !sameGameConfig(
            requestedConfig,
            parsed.config
          )
        ) {
          throw new Error(
            describeMismatch(
              requestedConfig,
              parsed.config
            )
          )
        }
      }
    }
  }

  /* ===================== VERIFY SAVE ===================== */

  let verifyResponse: Response

  try {
    verifyResponse = await fetch(
      GAME_SETTINGS_ENDPOINT,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...getAdminAuthHeaders(),
        },
        credentials: 'same-origin',
        cache: 'no-store',
      }
    )
  } catch {
    throw new Error(
      'The save request was accepted, but the ' +
      'saved settings could not be verified. ' +
      'Reload the admin settings before retrying.'
    )
  }

  if (!verifyResponse.ok) {
    throw new Error(
      'The save request was accepted, but ' +
      `verification failed (${verifyResponse.status}).`
    )
  }

  let verifyData: unknown

  try {
    verifyData = await verifyResponse.json()
  } catch {
    throw new Error(
      'The Games API returned invalid JSON ' +
      'during save verification.'
    )
  }

  const verified = parseApiConfig(
    verifyData,
    true
  )

  if (!verified.scratchCountPresent) {
    throw new Error(
      'The Games API is not returning scratchCount. ' +
      'Update /api/games/settings to read, store, ' +
      'and return the saved scratchCount.'
    )
  }

  if (!verified.config) {
    throw new Error(
      'The Games API returned invalid game ' +
      'settings during save verification.'
    )
  }

  if (
    !sameGameConfig(
      requestedConfig,
      verified.config
    )
  ) {
    throw new Error(
      describeMismatch(
        requestedConfig,
        verified.config
      )
    )
  }

  persistGameConfig(verified.config)
}

/* =========================================================
   SECURE SCRATCH API

   - Same-origin Cloudflare Worker requests.
   - HttpOnly guest cookie managed by the browser.
   - No local winner calculation.
   - No local global counter.
   - No customer registration.
========================================================= */

async function requestScratchApi(
  endpoint: string,
  options: RequestInit = {}
): Promise<UnknownRecord> {
  const headers = new Headers(options.headers)

  headers.set(
    'Accept',
    'application/json'
  )

  if (options.body !== undefined) {
    headers.set(
      'Content-Type',
      'application/json'
    )
  }

  let response: Response

  try {
    response = await fetch(
      endpoint,
      {
        ...options,
        headers,
        credentials: 'same-origin',
        cache: 'no-store',
      }
    )
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw error
    }

    throw new ScratchApiError(
      'Unable to connect to the scratch game. ' +
      'Please check your connection and try again.',
      0
    )
  }

  let data: unknown

  try {
    data = await response.json()
  } catch {
    throw new ScratchApiError(
      'The scratch game returned an invalid response.',
      response.status
    )
  }

  if (
    !response.ok ||
    !isRecord(data) ||
    data.success !== true
  ) {
    const retryAfterSeconds =
      isRecord(data) &&
      typeof data.retryAfterSeconds === 'number' &&
      Number.isFinite(data.retryAfterSeconds)
        ? Math.max(
            0,
            Math.ceil(data.retryAfterSeconds)
          )
        : undefined

    throw new ScratchApiError(
      getApiErrorMessage(
        data,
        `Scratch game request failed (${response.status}).`
      ),
      response.status,
      retryAfterSeconds
    )
  }

  return data
}

/* ===================== START GAME ===================== */

export async function startScratchGame(
  cardId: number,
  signal?: AbortSignal
): Promise<ScratchSession> {
  if (!isValidCardId(cardId)) {
    throw new ScratchApiError(
      'Please select a valid scratch card.',
      400
    )
  }

  const data = await requestScratchApi(
    SCRATCH_START_ENDPOINT,
    {
      method: 'POST',
      body: JSON.stringify({
        cardId,
      }),
      signal,
    }
  )

  if (
    !isValidSessionId(data.sessionId) ||
    !isValidCardId(data.cardId) ||
    typeof data.expiresAt !== 'string' ||
    !Number.isFinite(
      Date.parse(data.expiresAt)
    ) ||
    typeof data.resumed !== 'boolean'
  ) {
    throw new ScratchApiError(
      'The server returned an invalid scratch session.',
      502
    )
  }

  return {
    success: true,
    sessionId: data.sessionId,
    cardId: data.cardId,
    expiresAt: data.expiresAt,
    resumed: data.resumed,
  }
}

/* ===================== COMPLETE GAME ===================== */

export async function completeScratchGame(
  sessionId: string,
  signal?: AbortSignal
): Promise<ScratchCompletion> {
  if (!isValidSessionId(sessionId)) {
    throw new ScratchApiError(
      'Your scratch session is invalid. ' +
      'Please start again.',
      400
    )
  }

  const data = await requestScratchApi(
    SCRATCH_COMPLETE_ENDPOINT,
    {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
      }),
      signal,
    }
  )

  if (
    data.completed !== true ||
    data.sessionId !== sessionId ||
    typeof data.isWinner !== 'boolean'
  ) {
    throw new ScratchApiError(
      'The server returned an invalid game result.',
      502
    )
  }

  let prize: GamePrize | null = null

  if (data.isWinner) {
    if (!isValidPrize(data.prize)) {
      throw new ScratchApiError(
        'The server returned an invalid reward.',
        502
      )
    }

    prize = {
      productId: data.prize.productId,
      title: data.prize.title,
      detail: data.prize.detail,
      emoji: data.prize.emoji,
    }
  } else if (data.prize !== null) {
    throw new ScratchApiError(
      'The server returned an inconsistent game result.',
      502
    )
  }

  return {
    success: true,
    completed: true,
    sessionId,
    isWinner: data.isWinner,
    prize,
    duplicate: data.duplicate === true,
  }
}

/* ===================== ADMIN GLOBAL STATISTICS ===================== */

export async function fetchScratchStats(
  signal?: AbortSignal
): Promise<ScratchStats> {
  const data = await requestScratchApi(
    SCRATCH_STATS_ENDPOINT,
    {
      method: 'GET',
      headers: {
        ...getAdminAuthHeaders(),
      },
      signal,
    }
  )

  if (
    !isNonNegativeInteger(data.totalPlays) ||
    !isValidScratchCount(data.scratchCount) ||
    !isNonNegativeInteger(data.progress) ||
    !isNonNegativeInteger(data.remaining) ||
    !isNonNegativeInteger(data.nextMilestone)
  ) {
    throw new ScratchApiError(
      'The server returned invalid scratch statistics.',
      502
    )
  }

  const expectedProgress =
    data.totalPlays % data.scratchCount

  const expectedRemaining =
    data.scratchCount - expectedProgress

  if (
    data.progress !== expectedProgress ||
    data.remaining !== expectedRemaining ||
    data.nextMilestone !==
      data.totalPlays + expectedRemaining
  ) {
    throw new ScratchApiError(
      'The server returned inconsistent scratch statistics.',
      502
    )
  }

  return {
    success: true,
    totalPlays: data.totalPlays,
    scratchCount: data.scratchCount,
    progress: data.progress,
    remaining: data.remaining,
    nextMilestone: data.nextMilestone,
    updatedAt:
      typeof data.updatedAt === 'string'
        ? data.updatedAt
        : null,
  }
}

/* ===================== ERROR FORMATTING ===================== */

export function getScratchErrorMessage(
  error: unknown
): string {
  if (error instanceof ScratchApiError) {
    if (error.status === 429) {
      if (
        typeof error.retryAfterSeconds === 'number' &&
        error.retryAfterSeconds > 0
      ) {
        const minutes = Math.max(
          1,
          Math.ceil(
            error.retryAfterSeconds / 60
          )
        )

        return (
          `Please wait ${minutes} ` +
          `${minutes === 1 ? 'minute' : 'minutes'} ` +
          'before playing again.'
        )
      }

      return error.message
    }

    if (error.status === 410) {
      return (
        'Your scratch session has expired. ' +
        'Please start a new game.'
      )
    }

    if (error.status === 403) {
      return (
        'The scratch game is temporarily unavailable. ' +
        'Please check back later.'
      )
    }

    if (error.status === 401) {
      return error.message
    }

    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return (
    'Something went wrong. ' +
    'Please try again.'
  )
}

/* ===================== SUBSCRIPTIONS ===================== */

export function subscribeGameConfig(
  callback: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const onStorageChange = (
    event: StorageEvent
  ) => {
    if (
      event.key === GAME_CONFIG_KEY ||
      event.key === null
    ) {
      callback()
    }
  }

  window.addEventListener(
    'storage',
    onStorageChange
  )

  window.addEventListener(
    GAME_CONFIG_EVENT,
    callback
  )

  return () => {
    window.removeEventListener(
      'storage',
      onStorageChange
    )

    window.removeEventListener(
      GAME_CONFIG_EVENT,
      callback
    )
  }
}
