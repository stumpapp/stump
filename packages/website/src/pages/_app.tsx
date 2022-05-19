import type { AppProps } from 'next/app';
import Layout from '~components/Layout';
import { DefaultSeo } from 'next-seo';
import { ThemeProvider } from 'next-themes';
import NProgress from '~components/NProgress';

import SEO from '../../next-seo.config';

import '../styles/globals.css';
import '../styles/darcula.css';
import '../styles/markdown.css';

// yoinked from https://github.com/markdoc/docs/blob/main/pages/_app.js
function collectHeadings(node: any, sections: any[] = []) {
	if (node) {
		if (node.name === 'Heading') {
			const title = node.children[0];

			if (typeof title === 'string') {
				sections.push({
					...node.attributes,
					title,
				});
			}
		}

		if (node.children) {
			for (const child of node.children) {
				collectHeadings(child, sections);
			}
		}
	}

	return sections;
}

export default function MyApp({ Component, pageProps }: AppProps) {
	const toc = pageProps.markdoc?.content ? collectHeadings(pageProps.markdoc.content) : [];

	return (
		// TODO: frontmatter={pageProps.markdoc.frontmatter}
		<ThemeProvider attribute="class" enableSystem={false}>
			<DefaultSeo {...SEO} />
			<NProgress />
			<Layout toc={toc}>
				<Component {...pageProps} />
			</Layout>
		</ThemeProvider>
	);
}
