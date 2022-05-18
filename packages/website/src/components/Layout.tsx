import React from 'react';
import Footer from './Footer';
import NavBar from './NavBar';

// TODO: https://markdoc.io/docs/nextjs#layouts

interface Props {
	children: React.ReactNode;
	// TODO: frontmatter={pageProps.markdoc.frontmatter}
	// https://markdoc.io/docs/frontmatter
	frontmatter?: never;
}

export default function Layout({ children }: Props) {
	return (
		<>
			<NavBar />
			<div className="min-h-[calc(100vh-56px)] max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8">
				<main className="flex flex-col pb-12 lg:pb-16 h-full w-full">{children}</main>
			</div>
			<Footer />
		</>
	);
}
