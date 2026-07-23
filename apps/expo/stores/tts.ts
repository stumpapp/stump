import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { ReadiumLocator, TTSPlaybackState, TTSStateChangeEvent } from '~/modules/readium'

import { ZustandMMKVStorage } from './store'

export const SPEEDS = [0.5, 1, 1.25, 1.5, 2] as const

const speedSchema = z.union([
	z.literal(0.5),
	z.literal(1),
	z.literal(1.25),
	z.literal(1.5),
	z.literal(2),
])
type TTSSpeed = z.infer<typeof speedSchema>

const isSpeed = (val: unknown): val is TTSSpeed => speedSchema.safeParse(val).success

/**
 * will return a valid {@link TTSSpeed} value in a somewhat opinionated-but-rational way:
 * - if is already a speed, return it
 * - if not, and is a number, return the nearest speed (e.g., 1.3 -> 1.25)
 * - otherwise just return 1
 */
const toSpeed = (val: unknown): TTSSpeed => {
	const result = speedSchema.safeParse(val)
	if (!result.success) {
		const nearest = SPEEDS.reduce((prev, curr) =>
			Math.abs(curr - (typeof val === 'number' ? val : 1)) <
			Math.abs(prev - (typeof val === 'number' ? val : 1))
				? curr
				: prev,
		)
		return isSpeed(nearest) ? nearest : 1
	}
	return result.data
}

export type ITTSStore = {
	ttsState: TTSPlaybackState
	utteranceLocator?: ReadiumLocator
	rangeLocator?: ReadiumLocator
	speechSpeed: TTSSpeed
	/**
	 * whether the reader should follow along with the TTS playback, i.e. navigate to
	 * the utterance locator as playback progresses
	 */
	followSpeech: boolean
	supportsTTS: boolean

	setSpeechSpeed: (speed: number) => void
	setSupportsTTS: (v: boolean) => void
	/**
	 * intake a {@link TTSStateChangeEvent} and update the store accordingly. will return
	 * a locator if the reader should navigate to a new location, otherwise null
	 */
	trackTTSStateChange: (event: TTSStateChangeEvent) => ReadiumLocator | null
	/**
	 * will return the next preset speed relative the current, circling back to the min when
	 * at the max
	 */
	cycleTTSSpeed: () => TTSSpeed
	/**
	 * a shallow reset of the store, will not clear persistent values like speechSpeed and only
	 * clear values which will be reinitialized on book load
	 */
	resetTTSState: () => void
}

// i hate when the naming works out this way wrt abbreviations

const useTTSStore = create<ITTSStore>()(
	persist(
		(set, get) => ({
			ttsState: 'stopped',
			speechSpeed: 1,
			followSpeech: true,
			supportsTTS: false,
			setSpeechSpeed: (speed) => set({ speechSpeed: toSpeed(speed) }),
			setSupportsTTS: (v) => set({ supportsTTS: v }),
			trackTTSStateChange: (event) => {
				const next = {
					ttsState: event.state,
					utteranceLocator: event.utteranceLocator,
					rangeLocator: event.rangeLocator,
				}
				const shouldFollow = get().followSpeech

				const navigateToLoc =
					shouldFollow && next.ttsState === 'playing'
						? (event.rangeLocator ?? event.utteranceLocator ?? null)
						: null

				set({
					ttsState: event.state,
					utteranceLocator: event.utteranceLocator,
					rangeLocator: event.rangeLocator,
				})

				return navigateToLoc
			},

			cycleTTSSpeed: () => {
				const current = get().speechSpeed
				const idx = SPEEDS.indexOf(current)
				const next = SPEEDS[(idx + 1) % SPEEDS.length] ?? SPEEDS[0]
				set({ speechSpeed: next })
				return next
			},

			resetTTSState: () => {
				set({
					ttsState: 'stopped',
					supportsTTS: false,
					followSpeech: true,
					utteranceLocator: undefined,
					rangeLocator: undefined,
				})
			},
		}),
		{
			name: 'tts-storage',
			storage: createJSONStorage(() => ZustandMMKVStorage),
			partialize: (state) => {
				// TODO: persist followSpeech?
				const { speechSpeed } = state
				return { speechSpeed }
			},
		},
	),
)

export { useTTSStore }
