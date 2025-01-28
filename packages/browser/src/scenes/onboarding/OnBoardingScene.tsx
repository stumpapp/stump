// Used primarily for setting the correct base url for the api when the app is
// NOT running in a browser. I.e. when the app is running in Tauri.

import { ConfiguredServersList } from '@/components/savedServer'

export default function OnBoardingScene() {
	return (
		<div data-tauri-drag-region className="flex h-screen w-screen items-center bg-background">
			<div className="w-screen shrink-0">
				<div className="mx-auto flex h-full w-full max-w-sm flex-col justify-start gap-6 sm:max-w-md md:max-w-xl">
					<ConfiguredServersList />
				</div>
			</div>
		</div>
	)
}
