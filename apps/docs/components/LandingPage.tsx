import AppPreview from './AppPreview'
import Hero from './Hero'

export default function LandingPage() {
	return (
		<div className="flex h-full w-full flex-col items-center space-y-12 overflow-x-hidden py-12">
			<Hero />
			<div className="flex h-full w-full justify-center">
				<AppPreview />
			</div>
		</div>
	)
}
