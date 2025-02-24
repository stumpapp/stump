import { cn } from '@stump/components'

import { useSyncStartsWith } from '../store'
import { useAlphabetContext } from './context'

export default function AlphabetSelect() {
	const { alphabet } = useAlphabetContext()
	const { startsWith, updateStartsWith } = useSyncStartsWith()

	return (
		<div className="flex h-10 items-center justify-between gap-1 px-4">
			{Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => (
				<div
					key={letter}
					className={cn(
						'flex cursor-pointer items-center justify-center text-sm text-foreground-muted text-opacity-70 hover:text-opacity-100',
						{
							'text-fill-brand text-opacity-100': startsWith === letter,
						},
						{
							'pointer-events-none text-foreground-disabled text-opacity-20': !alphabet[letter],
						},
					)}
					onClick={() => updateStartsWith(startsWith === letter ? undefined : letter)}
				>
					{letter}
				</div>
			))}
		</div>
	)
}
