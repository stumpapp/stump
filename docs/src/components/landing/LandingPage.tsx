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
		<div className="gap-y-12 relative flex h-full w-full flex-col items-center">
			<div className="inset-0 pointer-events-none absolute -z-10 h-full w-full overflow-x-clip">
				<div className="top-0 left-0 bg-amber-500/10 max-md:hidden w-5xl h-256 pointer-events-none absolute -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full [mask-image:var(--mask)] [--mask:radial-gradient(circle_at_center,red,transparent_69%)] [webkit-mask-image:var(--mask)]" />
				<div className="top-0 left-0 bg-amber-500/5 max-md:hidden w-5xl h-256 pointer-events-none absolute -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full [mask-image:var(--mask)] [--mask:radial-gradient(circle_at_center,red,transparent_69%)] [webkit-mask-image:var(--mask)]" />
				<div className="top-0 left-0 bg-dot-matrix-xl max-md:hidden w-5xl h-256 pointer-events-none absolute -z-10 -translate-x-1/2 -translate-y-1/2 [mask-image:var(--mask)] [--mask:radial-gradient(circle_at_center_top,red,transparent)] [webkit-mask-image:var(--mask)] dark:opacity-80" />
				<div className="right-0 bg-amber-500/10 max-md:hidden w-5xl h-256 pointer-events-none absolute top-[calc(100vh-56px)] -z-10 translate-x-1/2 -translate-y-1/2 rounded-full [mask-image:var(--mask)] [--mask:radial-gradient(circle_at_center,red,transparent_69%)] [webkit-mask-image:var(--mask)]" />
				<div className="right-0 bg-amber-500/5 max-md:hidden w-5xl h-256 pointer-events-none absolute top-[calc(100vh-56px)] -z-10 translate-x-1/2 -translate-y-1/2 rounded-full [mask-image:var(--mask)] [--mask:radial-gradient(circle_at_center,red,transparent_69%)] [webkit-mask-image:var(--mask)]" />
				<div className="right-0 bg-dot-matrix-xl max-md:hidden w-5xl h-256 pointer-events-none absolute top-[calc(100vh-56px)] -z-10 translate-x-1/2 -translate-y-1/2 [mask-image:var(--mask)] [--mask:radial-gradient(circle_at_center_top,red,transparent)] [webkit-mask-image:var(--mask)] dark:opacity-80" />
			</div>

			<Hero />
			<div className="gap-y-12 flex w-full flex-col items-center overflow-x-hidden">
				<MobileApp />
				<Feedback />
			</div>
		</div>
	)
}
