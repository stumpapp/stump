import React from 'react';
import Button from '~components/ui/Button';

export default function Preview() {
	return (
		<div className="dark:text-gray-50 flex flex-col justify-center items-center h-screen w-screen overflow-hidden relative space-y-4">
			<h3 className="text-7xl">👀</h3>

			<div className="flex flex-col space-y-2 justify-center items-center ">
				<h3 className="text-3xl font-extrabold">You're early!</h3>
				<p>Something cool for nerds is going to live here</p>
			</div>

			<Button
				intent="brand"
				href="https://www.github.com/aaronleopold/stump"
				target="_blank"
				rel="noopener noreferrer"
			>
				Take a peek
			</Button>
		</div>
	);
}
