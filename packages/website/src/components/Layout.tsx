import { useRouter } from 'next/router';
import React from 'react';
import Footer from './Footer';
import NavBar from './NavBar';
import Sidebar from './markdoc/Sidebar';
import clsx from 'clsx';
import TableOfContents from './markdoc/TableOfContents';

// TODO: https://markdoc.io/docs/nextjs#layouts

interface Props {
	children: React.ReactNode;
	// TODO: frontmatter={pageProps.markdoc.frontmatter} ??
	// https://markdoc.io/docs/frontmatter
	frontmatter?: never;
	toc: any[];
}

export default function Layout({ children, toc }: Props) {
	const router = useRouter();

	const isDocs = router.pathname !== '/';

	// TODO: fix spacing on docs pages, way too close together
	return (
		<>
			<NavBar />
			{/* FIXME: determine why I need to do overflow-x-hidden on mobile, I am probably doing something wrong somewhere */}
			<div className="relative flex min-h-[calc(100vh-56px)] max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 overflow-x-hidden md:overflow-x-visible">
				{isDocs ? <Sidebar /> : null}
				<main
					className={clsx(
						isDocs && 'py-2 md:py-4',
						'flex flex-col flex-1 grow pb-12 lg:pb-16 h-full w-full',
					)}
				>
					{children}
				</main>
				{isDocs && toc ? <TableOfContents toc={toc} /> : null}
			</div>
			<Footer />
		</>
	);
}
