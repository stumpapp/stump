import { Heading } from '@stump/components'
// import ServerUrlForm from '../components/ServerUrlForm'

// Used primarily for setting the correct base url for the api when the app is
// NOT running in a browser. I.e. when the app is running in Tauri.
// TODO: locale!
// TODO: finish this component after I gutted it to remove chakra
export default function OnBoardingScene() {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-4">
			<div className="flex shrink-0 items-center justify-center gap-4 px-2">
				<img src="/assets/favicon.png" width="120" height="120" />
				<Heading variant="gradient" size="2xl">
					Stump
				</Heading>
			</div>

			{/* <Alert status="info" rounded="md">
				<AlertIcon />
				Welcome to Stump! To get started, please enter the base URL of your Stump server below.
			</Alert> */}

			{/* <ServerUrlForm /> */}
		</div>
	)
}
