import { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Link } from '../link'
import { Command } from './primitives'

type CommandItem = {
	icon?: LucideIcon
	label: string
	shortcut?: string
	onSelect?: (value?: string) => void
	href?: string
}

type CommandItemGroup = {
	heading?: string | React.ReactNode
	items: CommandItem[]
}

type CommandPromptProps = {
	groups: CommandItemGroup[]
	triggerKey?: string
	filterable?: boolean
	filterPrompt?: string
	filterEmptyPrompt?: string
}

// TODO: figure out selecting items.

/** An all-batteries-included command prompt component. This component is
 *  composed of the `Command` primitives exported from this package, and is
 *  intended for simplistic command prompts. For more complex command prompts,
 *  use the primitives directly as needed.
 */
export function CommandPrompt({
	groups,
	triggerKey = 'k',
	filterable = true,
	filterPrompt,
	filterEmptyPrompt,
}: CommandPromptProps) {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			// TODO: only use cmd+k on mac, ctrl+k on windows, etc.
			// see: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/metaKey
			if (e.key === triggerKey && e.metaKey) {
				setOpen((open) => !open)
			}
		}

		document.addEventListener('keydown', handler)
		return () => document.removeEventListener('keydown', handler)
	}, [triggerKey])

	const renderItems = (items: CommandItem[]) => {
		return items.map((item, itemIndex) => {
			const key = `command-item-${itemIndex}-${item.label}`

			const Container = item.href ? Link : React.Fragment
			const containerProps = item.href
				? { className: 'hover:no-underline', href: item.href, underline: false }
				: {}

			return (
				<Container {...containerProps} key={key}>
					<Command.Item onSelect={item.onSelect}>
						{item.icon && <Command.Icon icon={item.icon} />}
						<span>{item.label}</span>
						{item.shortcut && <Command.Shortcut>{item.shortcut}</Command.Shortcut>}
					</Command.Item>
				</Container>
			)
		})
	}

	// TODO: fix awkward spacing between groups
	return (
		<Command.Dialog open={open} onOpenChange={setOpen}>
			{filterable && <Command.Input placeholder={filterPrompt || 'Type a command or search...'} />}
			<Command.List>
				{filterable && <Command.Empty>{filterEmptyPrompt || 'No results found.'}</Command.Empty>}
				{groups.map((group, groupIndex) => (
					<React.Fragment key={groupIndex}>
						{groupIndex > 0 && <Command.Separator className="mb-1.5" />}
						<Command.Group heading={group.heading}>{renderItems(group.items)}</Command.Group>
					</React.Fragment>
				))}
			</Command.List>
		</Command.Dialog>
	)
}
