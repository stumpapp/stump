import { cn } from '@stump/components'

type Props = {
	startsWith?: string
	alphabet?: Record<string, number>
	onSelectLetter: (letter?: string) => void
	onPrefetchLetter?: (letter: string) => void
}

export default function Alphabet({
	startsWith,
	alphabet,
	onSelectLetter,
	onPrefetchLetter,
}: Props) {
	return (
		<div className="flex h-8 items-center justify-around gap-1 px-4 pt-4">
			{Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => (
				<div
					key={letter}
					className={cn(
						'flex cursor-pointer items-center justify-center text-xs text-foreground-muted text-opacity-70 hover:text-opacity-100',
						{
							'text-fill-brand text-opacity-100': startsWith === letter,
						},

						{
							'pointer-events-none text-foreground-disabled text-opacity-20': !alphabet?.[letter],
						},
					)}
					onClick={() => onSelectLetter(startsWith === letter ? undefined : letter)}
					onMouseEnter={() => onPrefetchLetter?.(letter)}
				>
					{letter}
				</div>
			))}
		</div>
	)
}
