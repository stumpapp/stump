import { motion } from 'framer-motion'
import { useRouter } from 'next/router'
import { Navbar as NextraNavBar, ThemeSwitch } from 'nextra-theme-docs'
import { useEffect, useState } from 'react'

const docLinks = [
	{
		href: '/installation',
		route: 'installation',
		title: 'Installation',
		type: 'page',
	},
	{
		href: '/guides',
		route: 'guides',
		title: 'Guides',
		type: 'page',
	},
]

type Props = React.ComponentProps<typeof NextraNavBar>
export default function NavBar(props: Props) {
	const { asPath } = useRouter()

	const [scrollPos, setScrollPos] = useState(0)

	useEffect(() => {
		const handleScroll = () => {
			setScrollPos(window.scrollY)
		}

		window.addEventListener('scroll', handleScroll)

		return () => {
			window.removeEventListener('scroll', handleScroll)
		}
	}, [])

	if (asPath === '/') {
		const alreadyHasItems = props.items.some(
			(item) => item.route === 'installation' || item.route === 'guides',
		)

		if (!alreadyHasItems) {
			// @ts-expect-error: its fine
			props.items.push(...docLinks)
		}
	}

	return (
		<motion.div
			className="sticky top-0 z-50"
			initial={asPath === '/' ? 'hidden' : 'visible'}
			transition={{ duration: 0.2 }}
			variants={{
				hidden: { y: -100 },
				visible: { y: 0 },
			}}
			animate={scrollPos < 64 && asPath === '/' ? 'hidden' : 'visible'}
		>
			<NextraNavBar {...props} />
		</motion.div>
	)
}

export function ExtraContent() {
	return <ThemeSwitch className="hidden md:inline-block" />
}
