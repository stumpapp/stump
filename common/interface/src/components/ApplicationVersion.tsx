import { useStumpVersion } from '@stump/client';
import { ArrowSquareOut } from 'phosphor-react';

export default function ApplicationVersion() {
	const version = useStumpVersion();

	return (
		<a
			href="https://github.com/aaronleopold/stump"
			target="__blank"
			rel="noopener noreferrer"
			className="flex items-center space-x-2 text-sm"
			title="View Stump on GitHub"
		>
			{/* <span>v{import.meta.env.PACKAGE_VERSION}</span> */}
			<span>v{version}</span>
			<ArrowSquareOut />
		</a>
	);
}
