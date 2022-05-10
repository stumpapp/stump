import React from 'react';
import AppPreview from '~components/AppPreview';
import Features from '~components/Features';
import Hero from '~components/Hero';

export default function index() {
	return (
		<div className="flex flex-col space-y-16 sm:space-y-24 justify-center items-center h-full w-full">
			<Hero />
			<div className="flex justify-center">
				<AppPreview />
			</div>
			<Features />
		</div>
	);
}
