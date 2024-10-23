import { Button, Dropdown } from '@stump/components'
import { Ellipsis } from 'lucide-react'

type Props = {
	onSelectForDelete: () => void
	onSelectForInspect: () => void
}

export default function APIKeyInspector({ onSelectForDelete, onSelectForInspect }: Props) {
	return (
		<Dropdown modal={false}>
			<Dropdown.Trigger asChild>
				<Button size="icon" variant="ghost">
					<Ellipsis className="h-4 w-4 text-foreground" />
				</Button>
			</Dropdown.Trigger>

			<Dropdown.Content align="end">
				<Dropdown.Group>
					<Dropdown.Item onClick={onSelectForInspect}>
						<span>Inspect</span>
					</Dropdown.Item>

					<Dropdown.Item onClick={onSelectForDelete}>
						<span>Delete</span>
					</Dropdown.Item>
				</Dropdown.Group>
			</Dropdown.Content>
		</Dropdown>
	)
}
