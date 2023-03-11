import { Helmet } from 'react-helmet'

// import LibrariesStats from '../../components/library/LibrariesStats';
import ServerInformation from '../../components/settings/ServerInformation'

export default function ServerSettings() {
	return (
		<>
			<Helmet>
				{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
				<title>Stump | {'Server Settings'}</title>
			</Helmet>
			<div className="flex w-full flex-col space-y-3">
				<ServerInformation />
			</div>

			{/* <div>TODO: add more</div> */}
		</>
	)
}
