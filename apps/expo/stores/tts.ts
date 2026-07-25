import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { ReadiumLocator, TTSPlaybackState, TTSStateChangeEvent } from '~/modules/readium'

import { ZustandMMKVStorage } from './store'

const speedSchema = z.number().min(0.25).max(2.0).default(1.0)

export type ITTSStore = {
	ttsState: TTSPlaybackState
	utteranceLocator?: ReadiumLocator
	rangeLocator?: ReadiumLocator
	speechSpeed: number
	/**
	 * whether the reader should follow along with the TTS playback, i.e. navigate to
	 * the utterance locator as playback progresses
	 */
	followSpeech: boolean
	supportsTTS: boolean

	setFollowSpeech: (v: boolean) => void
	setSpeechSpeed: (speed: number) => void
	setSupportsTTS: (v: boolean) => void
	/**
	 * intake a {@link TTSStateChangeEvent} and update the store accordingly. will return
	 * a locator if the reader should navigate to a new location, otherwise null
	 */
	trackTTSStateChange: (event: TTSStateChangeEvent) => ReadiumLocator | null
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
			speechSpeed: 1.0,
			followSpeech: true,
			supportsTTS: false,
			setSpeechSpeed: (speed) => set({ speechSpeed: Math.min(2.0, Math.max(0.25, speed)) }),
			setFollowSpeech: (followSpeech) => set({ followSpeech }),
			setSupportsTTS: (supportsTTS) => set({ supportsTTS }),
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

				set(next)

				return navigateToLoc
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
				// validate persisted value falls within the allowed range
				return { speechSpeed: speedSchema.catch(1.0).parse(speechSpeed) }
			},
		},
	),
)

export { useTTSStore }
