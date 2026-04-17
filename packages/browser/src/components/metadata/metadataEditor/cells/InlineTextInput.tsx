import { Button, cn, Input, TextArea, ToolTip } from '@stump/components'
import { Minus } from 'lucide-react'

type Props = {
	value: string | null | undefined
	onChange: (value: string | null) => void
	isLong?: boolean
	isMonoText?: boolean
	className?: string
	size?: 'sm' | 'default'
}

export default function InlineTextInput({
	value,
	onChange,
	isLong,
	isMonoText,
	className,
	size = 'sm',
}: Props) {
	const Component = isLong ? TextArea : Input

	return (
		<div className={cn('group gap-2 flex items-center', className)}>
			{/* @ts-expect-error: Union of Input/TextArea props */}
			<Component
				value={value ?? ''}
				onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
					onChange(e.target.value || null)
				}
				containerClassName={isLong ? 'flex-1' : undefined}
				className={cn({ 'font-mono text-sm': isMonoText })}
				{...(isLong ? {} : { size })}
			/>

			<ToolTip content="Reset field">
				<Button
					variant="danger"
					size="icon"
					className="h-4 w-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
					aria-label="Reset field"
					onClick={() => onChange(null)}
				>
					<Minus className="h-3 w-3" />
				</Button>
			</ToolTip>
		</div>
	)
}
