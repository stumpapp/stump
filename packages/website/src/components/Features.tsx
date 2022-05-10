import React from 'react';

function ReaderCompatibility() {
	return (
		<div>
			<h2 className="text-3xl font-extrabold text-gray-100">
				Compatible with your favorite readers
			</h2>
			<p className="mt-4 text-lg text-gray-400">
				You aren't stuck with the built-in reader! With Stump you can easily read all your digial
				media from your preferred reader - so long as they support the OPDS specifications, it's
				compatible!
			</p>
		</div>
	);
}

function FormatSupport() {
	return (
		<div className="flex justify-between items-center">
			<div className="w-[50%]">
				<h2 className="text-3xl font-extrabold text-gray-100">Emphasis on format support</h2>
				<p className="mt-4 text-lg text-gray-400">
					While not every digital media format is compatible with the OPDS specifications, Stump's
					built-in readers support a wide range of formats.
				</p>
			</div>

			<div className="flex flex-col space-y-6">
				<div className="text-white">something</div>
			</div>
		</div>
	);
}

export default function Features() {
	return (
		<div className="flex flex-col space-y-24">
			<ReaderCompatibility />
			<FormatSupport />
		</div>
	);
}
