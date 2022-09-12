import { useEffect, useState } from 'react';

import { Platform } from '@stump/client';
import { os } from '@tauri-apps/api';

import StumpInterface from '@stump/interface';

import '@stump/interface/styles';

export default function App() {
	function getPlatform(platform: string): Platform {
		switch (platform) {
			case 'darwin':
				return 'macOS';
			case 'win32':
				return 'windows';
			case 'linux':
				return 'linux';
			default:
				return 'browser';
		}
	}

	const [platform, setPlatform] = useState<Platform>('unknown');
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		os.platform().then((platform) => {
			setPlatform(getPlatform(platform));
			setMounted(true);
		});
	}, []);

	// I want to wait until platform is properly set before rendering the interface
	if (!mounted) {
		return null;
	}

	return <StumpInterface platform={platform} />;
}
