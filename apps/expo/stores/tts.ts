import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { ReadiumLocator, TTSPlaybackState, TTSStateChangeEvent } from '~/modules/readium'

import { ZustandMMKVStorage } from './store'

const speedSchema = z.union([z.literal(0.5), z.literal(1), z.literal(1.5), z.literal(2)])
type TTSSpeed = z.infer<typeof speedSchema>

const isSpeed = (val: unknown): val is TTSSpeed => speedSchema.safeParse(val).success

const toSpeed = (val: unknown): TTSSpeed => {
	const result = speedSchema.safeParse(val)
	if (!result.success) {
		const nearest = [0.5, 1, 1.5, 2].reduce((prev, curr) =>
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

	setSpeechSpeed: (speed: number) => void
	/**
	 * intake a {@link TTSStateChangeEvent} and update the store accordingly. will return
	 * a locator if the reader should navigate to a new location, otherwise null
	 */
	trackTTSStateChange: (event: TTSStateChangeEvent) => void

	resetTTSState: () => void
}

// i hate when the naming works out this way wrt abbreviations

const useTTSSTore = create<ITTSStore>()(
	persist(
		(set, get) => ({
			ttsState: 'stopped',
			speechSpeed: 1,
			followSpeech: true,
			setSpeechSpeed: (speed) => set({ speechSpeed: toSpeed(speed) }),
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

			resetTTSState: () => {
				set({
					ttsState: 'stopped',
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

export { useTTSSTore }
