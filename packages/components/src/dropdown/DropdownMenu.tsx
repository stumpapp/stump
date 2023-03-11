import React from 'react'

import { Button } from '../button/Button'
import { cn } from '../utils'
import { GenericMenu } from '.'
import {
	DropdownPrimitive,
	DropdownPrimitiveContent,
	DropdownPrimitiveGroup,
	DropdownPrimitiveItem,
	DropdownPrimitiveLabel,
	DropdownPrimitivePortal,
	DropdownPrimitiveSeparator,
	DropdownPrimitiveShortcut,
	DropdownPrimitiveSub,
	DropdownPrimitiveSubContent,
	DropdownPrimitiveSubTrigger,
	DropdownPrimitiveTrigger,
} from './primitives'

export type DropdownItem = {
	label: string
	leftIcon?: React.ReactNode
	shortCut?: React.ReactNode
	onClick?: () => void
	subItems?: DropdownItem[]
}
export type DropdownItemGroup = {
	title?: string
	items: DropdownItem[]
}

type LabelOrTrigger =
	| {
			label: string
	  }
	| {
			trigger: React.ReactElement<React.ComponentPropsWithRef<'button'>>
	  }
type BaseProps = LabelOrTrigger & {
	contentWrapperClassName?: string
	subContentWrapperClassName?: string
}
export type DropdownMenuProps = GenericMenu<DropdownItem, DropdownItemGroup> & BaseProps

export function DropdownMenu({
	groups,
	contentWrapperClassName,
	subContentWrapperClassName,
	...props
}: DropdownMenuProps) {
	const renderItems = (items: DropdownItem[]) => {
		return items.map((item, itemIndex) => {
			const key = `dropdown-item-${itemIndex}-${item.label}`

			if (item.subItems) {
				return (
					<DropdownPrimitiveSub key={key}>
						<DropdownPrimitiveSubTrigger>
							{item.leftIcon}
							<span>{item.label}</span>
							{item.shortCut && (
								<DropdownPrimitiveShortcut>{item.shortCut}</DropdownPrimitiveShortcut>
							)}
						</DropdownPrimitiveSubTrigger>
						<DropdownPrimitivePortal>
							<DropdownPrimitiveSubContent className={cn('w-44', subContentWrapperClassName)}>
								{renderItems(item.subItems)}
							</DropdownPrimitiveSubContent>
						</DropdownPrimitivePortal>
					</DropdownPrimitiveSub>
				)
			}

			return (
				<DropdownPrimitiveItem key={key}>
					{item.leftIcon}
					<span>{item.label}</span>
					{item.shortCut && <DropdownPrimitiveShortcut>{item.shortCut}</DropdownPrimitiveShortcut>}
				</DropdownPrimitiveItem>
			)
		})
	}

	const renderTrigger = () => {
		if ('trigger' in props) {
			return props.trigger
		} else if ('label' in props) {
			return <Button variant="outline">{props.label}</Button>
		}

		throw new Error('DropdownMenu must have either a label or a trigger')
	}

	return (
		<DropdownPrimitive>
			<DropdownPrimitiveTrigger asChild>{renderTrigger()}</DropdownPrimitiveTrigger>

			<DropdownPrimitiveContent className={cn('w-56', contentWrapperClassName)}>
				{groups.map((group, groupIndex) => (
					<React.Fragment key={groupIndex}>
						{group.title && <DropdownPrimitiveLabel>{group.title}</DropdownPrimitiveLabel>}
						{groupIndex > 0 && <DropdownPrimitiveSeparator />}
						<DropdownPrimitiveGroup>{renderItems(group.items)}</DropdownPrimitiveGroup>
					</React.Fragment>
				))}
			</DropdownPrimitiveContent>
		</DropdownPrimitive>
	)
}
