import React from 'react';
import { Helmet } from 'react-helmet';
import ServerStats from '~components/Settings/ServerStats';

export default function ServerSettings() {
	return (
		<>
			<Helmet>
				{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
				<title>Stump | {'Server Settings'}</title>
			</Helmet>
			<div className="w-full">
				<ServerStats />
			</div>
		</>
	);
}
