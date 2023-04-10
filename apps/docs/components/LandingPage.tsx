import AppPreview from './AppPreview'
import Hero from './Hero'

export default function LandingPage() {
	return (
		<div className="flex flex-col space-y-12 items-center h-full w-full py-12">
			<Hero />
			<div className="flex justify-center h-full w-full">
				<AppPreview />
			</div>
		</div>
	)
}
