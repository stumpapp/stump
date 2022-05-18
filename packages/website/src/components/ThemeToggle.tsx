import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'phosphor-react';
import IconButton from './ui/IconButton';

export default function ThemeToggle() {
	const [mounted, setMounted] = useState(false);

	const { theme, setTheme } = useTheme();

	const toggle = () => {
		setTheme(theme === 'dark' ? 'light' : 'dark');
	};

	// When mounted on client, now we can show the UI
	useEffect(() => setMounted(true), []);

	if (!mounted) {
		return null;
	}

	return (
		<IconButton onClick={toggle}>
			{theme === 'dark' ? (
				<Moon weight="fill" className="text-dark-200" />
			) : (
				<Sun weight="fill" className="text-gray-500" />
			)}
		</IconButton>
	);
}
