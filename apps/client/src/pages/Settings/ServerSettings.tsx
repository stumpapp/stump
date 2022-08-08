import { Helmet } from 'react-helmet';
import LibrariesStats from '~components/Library/LibrariesStats';
import JobReport from '~components/Settings/JobReport';
import ServerStats from '~components/Settings/ServerStats';

export default function ServerSettings() {
	return (
		<>
			<Helmet>
				{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
				<title>Stump | {'Server Settings'}</title>
			</Helmet>
			<div className="w-full flex flex-col space-y-3">
				<LibrariesStats />

				<JobReport />

				<ServerStats />
			</div>
		</>
	);
}
