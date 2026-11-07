import { Badge, Button, Dialog, TextArea } from '@stump/components'
import { useState } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	existing: string[]
	disabled?: boolean
	onAdd: (groups: string[]) => void
}

export function AddOidcGroupsDialog({ existing, disabled, onAdd }: Props) {
	const { t, translate } = useTranslate()

	const [isOpen, setIsOpen] = useState(false)
	const [value, setValue] = useState('')

	const parsedGroups = [
		...new Set(
			value
				.split(/[,\n]/)
				.map((group) => group.trim())
				.filter((group) => group.length > 0 && !existing.includes(group)),
		),
	]

	const onOpenChange = (open: boolean) => {
		setIsOpen(open)
		if (!open) setValue('')
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<Dialog.Trigger asChild>
				<Button size="sm" disabled={disabled}>
					{t(getKey('add.trigger'))}
				</Button>
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>{t(getKey('add.title'))}</Dialog.Title>
					<Dialog.Description>{t(getKey('add.description'))}</Dialog.Description>
					<Dialog.Close />
				</Dialog.Header>

				<div className="gap-y-4 flex flex-col">
					<TextArea
						placeholder={t(getKey('add.placeholder'))}
						rows={4}
						value={value}
						onChange={(e) => setValue(e.target.value)}
					/>

					{parsedGroups.length > 0 && (
						<div className="gap-2 flex flex-wrap">
							{parsedGroups.map((group) => (
								<Badge key={group}>{group}</Badge>
							))}
						</div>
					)}
				</div>

				<Dialog.Footer>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{translate('shared.common.cancel')}
					</Button>
					<Button
						disabled={parsedGroups.length === 0}
						onClick={() => {
							onAdd(parsedGroups)
							onOpenChange(false)
						}}
					>
						{translate('shared.common.add')}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}

const getKey = (key: string) =>
	`librarySettingsScene.danger-zone/access-control.sections.oidcGroups.${key}`
