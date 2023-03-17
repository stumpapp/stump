import { Helmet } from 'react-helmet'

export default function UserSettings() {
	return (
		<>
			<Helmet>
				{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
				<title>Stump | {'User Settings'}</title>
			</Helmet>
			<div>I am not implemented yet</div>
		</>
	)
}
