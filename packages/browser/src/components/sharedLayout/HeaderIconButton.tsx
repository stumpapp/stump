import { cn, Link } from '@stump/components'

type Props = {
	label: string
	icon: React.ComponentType<{ className?: string }>
	isActive?: boolean
} & ({ to: string; onClick?: never } | { onClick: () => void; to?: never })
// ^ effectively ButtonOrLink

export function HeaderIconButton({ label, icon: Icon, isActive, to, onClick }: Props) {
	const className = cn(
		'size-7 flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
		{ 'bg-muted text-foreground': isActive },
	)

	if (to) {
		return (
			<Link to={to} underline={false} className={className} aria-label={label} title={label}>
				<Icon className="h-4 w-4" />
			</Link>
		)
	}

	return (
		<button type="button" className={className} onClick={onClick} aria-label={label} title={label}>
			<Icon className="h-4 w-4" />
		</button>
	)
}
