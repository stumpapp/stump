import React from 'react';
import Link from './ui/Link';

export default function ApplicationVersion() {
	return (
		<Link className="text-sm" to="https://github.com/aaronleopold/stump" isExternal>
			v{import.meta.env.PACKAGE_VERSION}
		</Link>
	);
}
