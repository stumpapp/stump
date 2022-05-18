import React from 'react';
import Link from '~components/ui/Link';
import { FeatureHeader, FeatureSubHeader } from './FeatureHeader';

export default function ComingSoon() {
	return (
		<div className="flex justify-between items-center">
			<div className="md:w-1/2 flex flex-col space-y-4">
				<FeatureHeader>Coming soon!</FeatureHeader>
				<FeatureSubHeader>
					We're still working out some of the kinks and gathering user feedback, but we're getting
					there! Feel free to come hang out in the{' '}
					<Link
						className="text-brand-400 hover:text-brand transition-colors duration-150"
						href="https://discord.gg/63Ybb7J3as"
					>
						Stump Discord
					</Link>{' '}
					server, otherwise be sure to check back in soon!
				</FeatureSubHeader>
			</div>
		</div>
	);
}
