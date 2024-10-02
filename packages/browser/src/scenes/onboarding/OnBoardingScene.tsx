// Used primarily for setting the correct base url for the api when the app is
// NOT running in a browser. I.e. when the app is running in Tauri.

import { ConfiguredServersList } from '@/components/savedServer'

export default function OnBoardingScene() {
	return <ConfiguredServersList />
}
