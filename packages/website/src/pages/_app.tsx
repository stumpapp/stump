import type { AppProps } from 'next/app';
import Layout from '~components/Layout';
import StumpSeo from '~components/StumpSeo';
import { ThemeProvider } from 'next-themes';

import '../styles/globals.css';
import '../styles/darcula.css';
import '../styles/markdown.css';

export default function MyApp({ Component, pageProps }: AppProps) {
	return (
		// TODO: frontmatter={pageProps.markdoc.frontmatter}
		<ThemeProvider attribute="class" enableSystem={false}>
			<StumpSeo />
			<Layout>
				<Component {...pageProps} />
			</Layout>
		</ThemeProvider>
	);
}
