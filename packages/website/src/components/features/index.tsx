import React from 'react';
import ComingSoon from './ComingSoon';
import Compatibility from './Compatibility';
import FormatSupport from './FormatSupport';

// TODO: can't decide if I want more spacing (like h-screen per feature)
export default function Features() {
	return (
		<div className="flex flex-col space-y-24 md:space-y-36 pb-24 md:pb-36">
			<Compatibility />
			{/* <FormatSupport /> */}
			<ComingSoon />
		</div>
	);
}
