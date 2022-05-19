import { Html, Main, NextScript, Head } from 'next/document';
import React from 'react';

export default function Document() {
	return (
		<Html className="dark scrollbar-hide" lang="en">
			<Head />
			<body className="bg-white dark:bg-gray-1000">
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
