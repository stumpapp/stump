import { Navbar as NextraNavBar, ThemeSwitch } from 'nextra-theme-docs'

// ? This isn't really needed at ALL, but I did it in case I want to make any adjustments in the future

type Props = React.ComponentProps<typeof NextraNavBar>
export default function NavBar(props: Props) {
	return <NextraNavBar {...props} />
}

export function ExtraContent() {
	return <ThemeSwitch className="hidden md:inline-block" />
}
