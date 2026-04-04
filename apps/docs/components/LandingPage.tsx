import 'react-device-frameset/styles/marvel-devices.min.css'

import { useEffect, useState } from 'react'

import Feedback from './Feedback'
import Hero from './Hero'
import MobileApp from './MobileApp'

export default function LandingPage() {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])

	// I hate this hack, but there is a hydration issue with the image where it uses the wrong source
	if (!mounted) {
		return <div className="max-w-7xl px-6 py-10 lg:flex lg:px-8 lg:py-20 mx-auto h-screen" />
	}

	return (
		<div className="gap-y-12 flex h-full w-full flex-col items-center overflow-x-hidden">
			<Hero />
			<MobileApp />
			<Feedback />
		</div>
	)
}
