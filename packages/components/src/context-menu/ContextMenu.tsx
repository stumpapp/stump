import { GenericMenu } from '../dropdown'
import { cn } from '../utils'
import {
	ContextMenuPrimitive,
	ContextMenuPrimitiveContent,
	ContextMenuPrimitiveGroup,
	ContextMenuPrimitiveItem,
	ContextMenuPrimitiveLabel,
	ContextMenuPrimitivePortal,
	ContextMenuPrimitiveSeparator,
	ContextMenuPrimitiveShortcut,
	ContextMenuPrimitiveSub,
	ContextMenuPrimitiveSubContent,
	ContextMenuPrimitiveSubTrigger,
	ContextMenuPrimitiveTrigger,
} from './primitives'

export type ContextMenuItem = {
	label: string
	leftIcon?: React.ReactNode
	shortCut?: React.ReactNode
	onClick?: () => void
	subItems?: ContextMenuItem[]
}
export type ContextMenuItemGroup = {
	title?: string
	items: ContextMenuItem[]
}

type BaseProps = {
	children: React.ReactNode
	contentWrapperClassName?: string
	subContentWrapperClassName?: string
}
export type ContextMenuProps = GenericMenu<ContextMenuItem, ContextMenuItemGroup> & BaseProps

export function ContextMenu({
	children,
	groups,
	contentWrapperClassName,
	subContentWrapperClassName,
}: ContextMenuProps) {
	const renderItems = (items: ContextMenuItem[]) => {
		return items.map((item, itemIndex) => {
			const key = `context-menu-item-${itemIndex}-${item.label}`

			if (item.subItems) {
				return (
					<ContextMenuPrimitiveSub key={key}>
						<ContextMenuPrimitiveSubTrigger>
							{item.leftIcon}
							<span>{item.label}</span>
							{item.shortCut && (
								<ContextMenuPrimitiveShortcut>{item.shortCut}</ContextMenuPrimitiveShortcut>
							)}
						</ContextMenuPrimitiveSubTrigger>
						<ContextMenuPrimitivePortal>
							<ContextMenuPrimitiveSubContent className={cn('w-44', subContentWrapperClassName)}>
								{renderItems(item.subItems)}
							</ContextMenuPrimitiveSubContent>
						</ContextMenuPrimitivePortal>
					</ContextMenuPrimitiveSub>
				)
			}

			return (
				<ContextMenuPrimitiveItem key={key} onClick={item.onClick}>
					{item.leftIcon}
					<span>{item.label}</span>
					{item.shortCut && (
						<ContextMenuPrimitiveShortcut>{item.shortCut}</ContextMenuPrimitiveShortcut>
					)}
				</ContextMenuPrimitiveItem>
			)
		})
	}

	return (
		<ContextMenuPrimitive>
			<ContextMenuPrimitiveTrigger>{children}</ContextMenuPrimitiveTrigger>
			<ContextMenuPrimitiveContent className={cn('w-52', contentWrapperClassName)}>
				{groups.map((group, groupIndex) => (
					<React.Fragment key={groupIndex}>
						{group.title && <ContextMenuPrimitiveLabel>{group.title}</ContextMenuPrimitiveLabel>}
						{groupIndex > 0 && <ContextMenuPrimitiveSeparator />}
						<ContextMenuPrimitiveGroup>{renderItems(group.items)}</ContextMenuPrimitiveGroup>
					</React.Fragment>
				))}
			</ContextMenuPrimitiveContent>
		</ContextMenuPrimitive>
	)
}
