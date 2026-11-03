import { cn, Heading, Text } from '@stump/components'
import { ReactNode } from 'react'

type Props = {
	title: string
	description?: ReactNode
	/** trailing actions aligned with the title, e.g. a mutation button */
	actions?: ReactNode
	children: ReactNode
	className?: string
}

// TODO(ui): this is temporary, i don't love it but should make things consistent and
// easier to change once i sorrt out what i do like

export function SettingsSection({ title, description, actions, children, className }: Props) {
	return (
		<section className={cn('gap-3 flex w-full flex-col', className)}>
			<div className="gap-4 flex items-end justify-between">
				<div className="gap-0.5 flex flex-col">
					<Heading size="sm">{title}</Heading>
					{description && (
						<Text size="sm" variant="muted">
							{description}
						</Text>
					)}
				</div>
				{actions && <div className="shrink-0">{actions}</div>}
			</div>
			{children}
		</section>
	)
}
