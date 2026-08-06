import { Button, cn, Input, ToolTip } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Minus } from 'lucide-react'

import type { NumberValidation } from '../../fieldDefs'

type Props = {
	value: number | null | undefined
	onChange: (value: number | null) => void
	isDecimal?: boolean
	validation?: NumberValidation
	className?: string
}

export default function InlineNumberInput({
	value,
	onChange,
	isDecimal,
	validation,
	className,
}: Props) {
	const { t } = useLocaleContext()
	return (
		<div className={cn(`group gap-2 flex items-center`, className)}>
			<Input
				type="number"
				step={isDecimal ? 'any' : 1}
				value={value ?? ''}
				className="font-mono text-sm"
				containerClassName="md:w-[unset]"
				size="sm"
				min={validation?.min}
				max={validation?.max}
				onChange={(e) => {
					const raw = e.target.value
					onChange(raw ? Number(raw) : null)
				}}
			/>

			<ToolTip content={t('controlUi.resetField')}>
				<Button
					variant="destructive"
					size="icon"
					className="h-4 w-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
					aria-label={t('controlUi.resetField')}
					onClick={() => onChange(null)}
				>
					<Minus className="h-3 w-3" />
				</Button>
			</ToolTip>
		</div>
	)
}
