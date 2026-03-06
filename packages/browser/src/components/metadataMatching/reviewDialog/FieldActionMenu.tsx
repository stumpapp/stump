import { cn, DropdownMenu, IconButton } from '@stump/components'
import type { MetadataField } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { ArrowLeft, ArrowRight, ChevronDown, Combine, Pencil, RotateCcw } from 'lucide-react'

import { FIELD_EDITOR_MAP, isArrayField } from '../fieldEditorConfig'
import type { PerFieldStrategy } from '../types'
import { useMatchReviewStore } from '../useMatchReviewStore'

type Props = {
	field: MetadataField
	excluded: boolean
	onEditManually: () => void
}

export function FieldActionMenu({ field, excluded, onEditManually }: Props) {
	const { t } = useLocaleContext()
	const { fieldOverrides, setFieldOverride, clearFieldOverride } = useMatchReviewStore()

	const override = fieldOverrides.get(field)
	const hasEditor = !!FIELD_EDITOR_MAP[field]
	const showMerge = isArrayField(field)

	const activeStrategy: PerFieldStrategy | null =
		override?.type === 'strategy' ? override.strategy : null
	const isCustom = override?.type === 'custom'
	const hasOverride = !!override

	const handleStrategy = (strategy: PerFieldStrategy) => {
		if (activeStrategy === strategy) return
		setFieldOverride(field, { type: 'strategy', strategy })
	}

	const handleReset = () => {
		if (!hasOverride) return
		clearFieldOverride(field)
	}

	const handleEdit = () => {
		if (isCustom) return
		onEditManually()
	}

	return (
		<DropdownMenu
			groups={[
				{
					items: [
						{
							label: t(getKey('keepCurrent')),
							leftIcon: <ArrowLeft className={iconStyle} />,
							onClick: () => handleStrategy('keepCurrent'),
							isActive: activeStrategy === 'keepCurrent',
						},
						{
							label: t(getKey('takeExternal')),
							leftIcon: <ArrowRight className={iconStyle} />,
							onClick: () => handleStrategy('takeExternal'),
							isActive: activeStrategy === 'takeExternal',
						},
						{
							label: t(getKey('mergeLists')),
							leftIcon: <Combine className={iconStyle} />,
							onClick: () => handleStrategy('merge'),
							hidden: !showMerge,
							isActive: activeStrategy === 'merge',
						},
					],
				},
				{
					items: [
						{
							label: t(getKey('editManually')),
							leftIcon: <Pencil className={iconStyle} />,
							onClick: handleEdit,
							hidden: !hasEditor,
						},
						{
							label: t(getKey('reset')),
							leftIcon: <RotateCcw className={iconStyle} />,
							onClick: handleReset,
							hidden: !hasOverride,
						},
					],
				},
			]}
			trigger={
				<IconButton
					className={cn('opacity-0 transition-opacity duration-150 group-hover/edit:opacity-100', {
						'opacity-100': hasOverride,
					})}
					variant="ghost"
					size="xs"
					disabled={excluded}
				>
					<ChevronDown
						className={cn('h-3.5 w-3.5', {
							'text-brand': hasOverride,
						})}
					/>
				</IconButton>
			}
			align="end"
			contentWrapperClassName="w-40 min-w-[unset]"
		/>
	)
}

const iconStyle = 'mr-2 h-4 w-4'

const LOCALE_KEY = 'metadataMatching.reviewDialog.fieldAction'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
