import { Fragment } from 'react'

import { Button } from '../button/Button'
import { Link } from '../link'
import { cn, XOR } from '../utils'
import { GenericMenu } from '.'
import {
	Dropdown,
	DropdownContent,
	type DropdownContentProps,
	DropdownGroup,
	DropdownItem,
	DropdownLabel,
	DropdownPortal,
	DropdownSeparator,
	DropdownShortcut,
	DropdownSub,
	DropdownSubContent,
	DropdownSubTrigger,
	DropdownTrigger,
} from './primitives'

export type DropdownItem = {
	label: string
	leftIcon?: React.ReactNode
	shortCut?: React.ReactNode
	onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
	href?: string
	subItems?: DropdownItem[]
	hidden?: boolean
	disabled?: boolean
}
export type DropdownItemGroup = {
	title?: string
	items: DropdownItem[]
}

type LabelProps = {
	label: string
}
type TriggerProps = {
	trigger: React.ReactElement<React.ComponentPropsWithRef<'button'>>
}
type LabelOrTrigger = XOR<TriggerProps, LabelProps>
type ContentProps = Pick<DropdownContentProps, 'align'>
type BaseProps = LabelOrTrigger &
	ContentProps & {
		contentWrapperClassName?: string
		subContentWrapperClassName?: string
		modal?: boolean
	}
export type DropdownMenuProps = GenericMenu<DropdownItem, DropdownItemGroup> & BaseProps

/** An all-batteries-included dropdown menu component.
 *
 *  NOTE: This should really only be used for
 *  *very* simplistic dropdown menus. For more complex menus, create more custom dropdowns
 *  using the primitives exported from this package.
 */
export function DropdownMenu({
	groups,
	contentWrapperClassName,
	subContentWrapperClassName,
	align,
	modal = false,
	...props
}: DropdownMenuProps) {
	const renderItems = (items: DropdownItem[]) => {
		return items
			.filter((item) => !item.hidden)
			.map((item) => {
				const key = `dropdown-item-${item.label}`

				if (item.subItems) {
					return (
						<DropdownSub key={key}>
							<DropdownSubTrigger disabled={item.disabled}>
								{item.leftIcon}
								<span>{item.label}</span>
								{item.shortCut && <DropdownShortcut>{item.shortCut}</DropdownShortcut>}
							</DropdownSubTrigger>
							<DropdownPortal>
								<DropdownSubContent className={cn('w-44', subContentWrapperClassName)}>
									{renderItems(item.subItems)}
								</DropdownSubContent>
							</DropdownPortal>
						</DropdownSub>
					)
				}

				const Container = item.href ? Link : Fragment
				const containerProps = item.href
					? { className: 'hover:no-underline', to: item.href, underline: false }
					: {}

				return (
					<Container {...containerProps} key={key}>
						<DropdownItem onClick={item.onClick} disabled={item.disabled}>
							{item.leftIcon}
							<span>{item.label}</span>
							{item.shortCut && <DropdownShortcut>{item.shortCut}</DropdownShortcut>}
						</DropdownItem>
					</Container>
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
		<Dropdown modal={modal}>
			<DropdownTrigger asChild>{renderTrigger()}</DropdownTrigger>

			<DropdownContent className={cn('w-56', contentWrapperClassName)} align={align}>
				{groups.map((group, groupIndex) => (
					<Fragment key={groupIndex}>
						{group.title && <DropdownLabel>{group.title}</DropdownLabel>}
						{groupIndex > 0 && <DropdownSeparator />}
						<DropdownGroup>{renderItems(group.items)}</DropdownGroup>
					</Fragment>
				))}
			</DropdownContent>
		</Dropdown>
	)
}
