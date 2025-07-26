import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { Button } from '../button'
import { PickSelect } from '../utils'
import { SheetContentProps, SheetPrimitive } from './primitives'

export type SheetProps = {
	trigger?: string | React.ReactNode
	children: React.ReactNode
	footer?: React.ReactNode
	title: string | React.ReactNode
	description?: string
	closeIcon?: boolean
	position?: PickSelect<SheetContentProps, 'position'>
	size?: PickSelect<SheetContentProps, 'size'>
	rounded?: PickSelect<SheetContentProps, 'rounded'>
	contentClassName?: string
	onOpen?: () => void
	onClose?: () => void
	open?: boolean
}

// TODO: clean this component up, either make it controlled OR uncontrolled,
// not both ??
export function Sheet({
	open,
	onOpen,
	onClose,
	trigger,
	children,
	footer,
	title,
	description,
	closeIcon = true,
	contentClassName,
	...contentProps
}: SheetProps) {
	const location = useLocation()

	const renderTrigger = () => {
		if (typeof trigger === 'string') {
			return <Button variant="outline">{trigger}</Button>
		}

		return trigger
	}

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			onOpen?.()
		} else {
			onClose?.()
		}
	}

	useEffect(
		() => {
			onClose?.()
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[location],
	)

	return (
		<SheetPrimitive open={open} onOpenChange={handleOpenChange}>
			{!!trigger && <SheetPrimitive.Trigger asChild>{renderTrigger()}</SheetPrimitive.Trigger>}
			<SheetPrimitive.Content closeIcon={closeIcon} {...contentProps} className={contentClassName}>
				<SheetPrimitive.Header>
					<SheetPrimitive.Title>{title}</SheetPrimitive.Title>
					{description && <SheetPrimitive.Description>{description}</SheetPrimitive.Description>}
				</SheetPrimitive.Header>
				{children}
				{footer && <SheetPrimitive.Footer>{footer}</SheetPrimitive.Footer>}
			</SheetPrimitive.Content>
		</SheetPrimitive>
	)
}
