import { cn, DropdownMenu, IconButton } from '@stump/components'
import type { MetadataField } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import {
	ArrowLeft,
	ArrowRight,
	ChevronDown,
	Combine,
	Lock,
	Pencil,
	RotateCcw,
	Unlock,
} from 'lucide-react'

import { FIELD_EDITOR_MAP, isArrayField } from '../fieldEditorConfig'
import type { PerFieldStrategy } from '../types'
import { useToggleLockedField } from '../useMatchActions'
import { useMatchReviewStore } from '../useMatchReviewStore'

type Props = {
	field: MetadataField
	disabled: boolean
	onEditManually: () => void
}

// TODO: dont show merge lists option unless arr
export function FieldActionMenu({ field, disabled, onEditManually }: Props) {
	const { t } = useLocaleContext()
	const { fieldOverrides, setFieldOverride, clearFieldOverride, getLockedFields } =
		useMatchReviewStore()
	const toggleLockedField = useToggleLockedField()

	const override = fieldOverrides.get(field)
	const hasEditor = !!FIELD_EDITOR_MAP[field]
	const showMerge = isArrayField(field)
	const isLocked = getLockedFields().has(field)

	const activeStrategy: PerFieldStrategy | null =
		override?.type === 'strategy' ? override.strategy : null
	const isCustom = override?.type === 'custom'
	const hasOverride = !!override

	const handleStrategy = (strategy: PerFieldStrategy) => {
		if (disabled || activeStrategy === strategy) return
		setFieldOverride(field, { type: 'strategy', strategy })
	}

	const handleReset = () => {
		if (disabled || !hasOverride) return
		clearFieldOverride(field)
	}

	const handleEdit = () => {
		if (disabled || isCustom) return
		onEditManually()
	}

	return (
		<DropdownMenu
			groups={
				disabled && !isLocked
					? [
							{
								items: [
									{
										label: t(getKey('lockField')),
										leftIcon: <Lock className={iconStyle} />,
										onClick: () => toggleLockedField(field),
									},
								],
							},
						]
					: [
							{
								items: [
									{
										label: t(getKey('keepCurrent')),
										leftIcon: <ArrowLeft className={iconStyle} />,
										onClick: () => handleStrategy('keepCurrent'),
										isActive: activeStrategy === 'keepCurrent',
										disabled,
									},
									{
										label: t(getKey('takeExternal')),
										leftIcon: <ArrowRight className={iconStyle} />,
										onClick: () => handleStrategy('takeExternal'),
										isActive: activeStrategy === 'takeExternal',
										disabled,
									},
									{
										label: t(getKey('mergeLists')),
										leftIcon: <Combine className={iconStyle} />,
										onClick: () => handleStrategy('merge'),
										hidden: !showMerge,
										isActive: activeStrategy === 'merge',
										disabled,
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
										disabled,
									},
									{
										label: isLocked ? t(getKey('unlockField')) : t(getKey('lockField')),
										leftIcon: isLocked ? (
											<Unlock className={iconStyle} />
										) : (
											<Lock className={iconStyle} />
										),
										onClick: () => toggleLockedField(field),
									},
									{
										label: t(getKey('reset')),
										leftIcon: <RotateCcw className={iconStyle} />,
										onClick: handleReset,
										hidden: !hasOverride,
										disabled,
									},
								],
							},
						]
			}
			trigger={
				<IconButton
					className={cn('opacity-0 transition-opacity duration-150 group-hover/edit:opacity-100', {
						'opacity-100': hasOverride || isLocked,
					})}
					variant="ghost"
					size="xs"
				>
					{isLocked ? (
						<Lock className="h-3.5 w-3.5 text-foreground-muted" />
					) : (
						<ChevronDown
							className={cn('h-3.5 w-3.5', {
								'text-brand': hasOverride,
							})}
						/>
					)}
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
