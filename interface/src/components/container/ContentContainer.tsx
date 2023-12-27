import { usePreferences } from '@stump/client'
import { cx } from '@stump/components'

type Props = {
	children: React.ReactNode
}

export default function ContentContainer({ children }: Props) {
	const {
		preferences: { primary_navigation_mode },
	} = usePreferences()

	return (
		<div
			className={cx('mt-6 flex flex-col gap-8 md:gap-12', {
				'max-w-4xl': primary_navigation_mode === 'SIDEBAR',
			})}
		>
			{children}
		</div>
	)
}
