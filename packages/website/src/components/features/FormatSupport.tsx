import React from 'react';
import { FeatureHeader, FeatureSubHeader } from './FeatureHeader';

export default function FormatSupport() {
	return (
		<div className="flex justify-between items-center">
			<div className="w-1/2 flex flex-col space-y-4">
				<FeatureHeader>Emphasis on format support</FeatureHeader>
				<FeatureSubHeader>
					While not every digital media format is compatible with the OPDS specifications,
					Stump&apos;s built-in readers aim to support a wide range of formats.
				</FeatureSubHeader>
			</div>

			<div className="flex flex-col space-y-6">
				<div className="text-white">something</div>
			</div>
		</div>
	);
}
