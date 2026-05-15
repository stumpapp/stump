import 'react-device-frameset/styles/marvel-devices.min.css'

import Feedback from './Feedback'
import Hero from './Hero'
import MobileApp from './MobileApp'

export default function LandingPage() {
	return (
		<div className="gap-y-12 flex h-full w-full flex-col items-center overflow-x-hidden">
			<Hero />
			<MobileApp />
			<Feedback />
		</div>
	)
}
