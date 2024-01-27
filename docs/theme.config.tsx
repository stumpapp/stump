import { useRouter } from 'next/router'

import Footer from './components/Footer'
import Head from './components/Head'
import HelpDocsCTA from './components/HelpDocsCTA'
import NavBar, { ExtraContent } from './components/NavBar'
import StumpLogo from './components/StumpLogo'

export const STUMP_REPO = 'https://github.com/stumpapp/stump'
const DOCS_PAGES_HREF = `${STUMP_REPO}/tree/main/docs/pages`

export default {
	chat: {
		link: 'https://discord.gg/63Ybb7J3as',
	},
	docsRepositoryBase: DOCS_PAGES_HREF,
	editLink: {
		component: HelpDocsCTA,
	},
	feedback: {
		content: null,
	},
	footer: {
		component: Footer,
	},
	head: <Head />,
	logo: <StumpLogo />,
	navbar: {
		component: NavBar,
		extraContent: ExtraContent,
	},
	primaryHue: 28,
	project: {
		link: 'https://github.com/stumpapp/stump',
	},
	useNextSeoProps() {
		const { asPath } = useRouter()
		if (asPath !== '/') {
			return {
				titleTemplate: '%s | Stump',
			}
		}

		return {
			title: 'Stump',
		}
	},
}

// TODO: HEAD
