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
		<div className="h-8 gap-1 px-4 pt-4 flex items-center justify-around">
			{Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => (
				<div
					key={letter}
					className={cn(
						'text-xs flex cursor-pointer items-center justify-center text-muted-foreground/70 hover:text-muted-foreground',
						{
							'text-primary': startsWith === letter,
						},

						{
							'pointer-events-none text-muted-foreground/20': !alphabet?.[letter],
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
