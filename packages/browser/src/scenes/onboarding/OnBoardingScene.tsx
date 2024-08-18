import ServerUrlForm from '@/components/ServerUrlForm'

// Used primarily for setting the correct base url for the api when the app is
// NOT running in a browser. I.e. when the app is running in Tauri.
// TODO: locale!
export default function OnBoardingScene() {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-4">
			<div className="text-left sm:max-w-md md:max-w-lg">
				<h1 className="text-4xl font-semibold text-foreground">Configure your connection</h1>
				<p className="mt-1.5 text-base text-foreground-subtle">
					To get started with the Stump desktop app, please enter the base URL of your Stump server
					below
				</p>

				<div className="text-unset mt-3 w-full">
					<ServerUrlForm />
				</div>
			</div>
		</div>
	)
}
