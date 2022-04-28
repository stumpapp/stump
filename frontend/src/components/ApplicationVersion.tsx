import React from 'react';
import { ArrowSquareOut } from 'phosphor-react';

export default function ApplicationVersion() {
	return (
		<a
			href="https://github.com/aaronleopold/stump"
			target="__blank"
			rel="noopener noreferrer"
			className="flex items-center space-x-2 text-sm"
			title="View Stump on GitHub"
		>
			<span>v{import.meta.env.PACKAGE_VERSION}</span>
			<ArrowSquareOut />
		</a>
	);
}
