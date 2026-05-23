export type Subscription = { remove: () => void }

export type VolumeEventName = 'onVolumeUp' | 'onVolumeDown'

export interface NativeVolumeListenerModule {
	/**
	 * Start intercepting volume button presses
	 */
	startListening(): void
	/**
	 * Stop intercepting volume button presses and restore native behavior
	 */
	stopListening(): void
	addListener(eventName: VolumeEventName, listener: () => void): Subscription
}
