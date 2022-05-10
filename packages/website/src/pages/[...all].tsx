import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import Markdown from '~components/Markdown';
import Button from '~components/ui/Button';

function NotFound() {
	return (
		<div className="flex flex-1 w-full h-full items-center justify-center">
			<Helmet>
				<title>Stump | Not Found</title>
			</Helmet>
			<div className="flex flex-col items-center space-y-6">
				<h3 className="font-semibold text-5xl dark:text-gray-50">404</h3>

				<div className="flex justify-center items-center space-x-6">
					<Button intent="ghost" onClick={() => window.history.back()}>
						Go back
					</Button>
					<Button intent="brand" href="/">
						Go home
					</Button>
				</div>
			</div>
		</div>
	);
}

function Page() {
	const location = useLocation();

	const [markdown, setMarkdown] = useState<string>();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		async function fetchMarkdown() {
			const pathname = location.pathname;

			// path matches /guides OR /faq OR /installation
			if (pathname.match(/\/guides\/?|\/faq\/?|\/installation\/?/)) {
				let target;

				if (pathname === '/guides' || pathname === '/guides/') {
					target = pathname + '/index.md';
				} else if (pathname === '/installation' || pathname === '/installation/') {
					target = pathname + '/index.md';
				} else {
					target = pathname + '.md';
				}

				if (target) {
					await fetch(`/docs/${target}`)
						.then((res) => res.text())
						.then((text) => setMarkdown(text));
				}
			}

			setMounted(true);
		}

		fetchMarkdown();
	}, [location]);

	if (!mounted) {
		return <div>...Loading</div>;
	}

	if (!markdown) {
		return <NotFound />;
	}

	// TODO: sidebar
	return (
		<div className="text-gray-100 flex-1 w-full h-full min-h-screen">
			<Markdown text={markdown} />
		</div>
	);
}

export default Page;
