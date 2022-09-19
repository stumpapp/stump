import React from 'react';
import { FeatureHeader, FeatureSubHeader } from './FeatureHeader';

export default function DesktopApp() {
	return (
		<div className="flex flex-col space-y-12 items-center md:flex-row md:space-y-0 md:items-start md:justify-between">
			<div className="-mr-12 md:mr-0 -mt-4">
				<img
					src="/images/demo-desktop.png"
					className="max-w-[400] sm:max-w-[425] md:max-w-[650px]"
				/>
			</div>

			<div className="md:w-2/3 flex flex-col space-y-4">
				<FeatureHeader>Dedicated Desktop Client</FeatureHeader>

				<FeatureSubHeader>
					If you&apos;d rather not be tied to a browser, Stump has a dedicated desktop client that
					works on Windows, macOS, and Linux. It&apos;s built with Tauri, so it&apos;s has low
					resource utilization, especially when compared to Electron, and can easily connect to your
					Stump server.
				</FeatureSubHeader>
			</div>
		</div>
	);
}
