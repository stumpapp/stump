import { Button, Drawer, Label, NativeSelect, Sheet, Text } from '@stump/components'
import React, { useState } from 'react'

import BookFilterForm, { BOOK_FILTER_FORM_ID } from './BookFilterForm'

type Props = {
	onAppend: () => void
}

export default function AddFilter() {
	const [source, setSource] = useState('book')

	const renderForm = () => {
		if (source === 'book') {
			return <BookFilterForm />
		}

		return null
	}

	return (
		<Sheet
			title="Add filter"
			size="lg"
			trigger={<Button variant="ghost">Add filter</Button>}
			closeIcon={false}
			position="right"
			footer={
				<div>
					<Button form={BOOK_FILTER_FORM_ID}>Add filter</Button>
				</div>
			}
		>
			<div className="flex-1 space-y-6 overflow-y-auto px-6">
				<div className="flex flex-col space-y-1.5">
					<Label>Source</Label>
					<NativeSelect
						options={[
							{ label: 'Book', value: 'book' },
							{ label: 'Book metadata', value: 'book_meta' },
							{ label: 'Series', value: 'series' },
							{ label: 'Library', value: 'series' },
						]}
						value={source}
						onChange={(e) => setSource(e.target.value)}
					/>
					<Text variant="muted" size="sm">
						The thing you want the filter to apply to
					</Text>
				</div>

				{renderForm()}
			</div>
		</Sheet>
	)

	return (
		<Drawer>
			<Drawer.Trigger asChild>
				<Button variant="ghost">Add filter</Button>
			</Drawer.Trigger>
			<Drawer.Content>
				<div className="mx-auto w-full max-w-2xl">
					<Drawer.Header>
						<Drawer.Title>Add filter</Drawer.Title>
						{/* <Drawer.Description>{t(withLocaleKey('description'))}</Drawer.Description> */}
					</Drawer.Header>
				</div>

				<div className="max-h-[70vh] w-full overflow-y-auto">
					<div className="mx-auto w-full max-w-2xl">
						<div className="flex flex-col gap-y-6 p-4 pb-0">TODO</div>
					</div>
				</div>

				<div className="mx-auto w-full max-w-2xl">
					<Drawer.Footer className="w-full flex-row">
						<Button className="w-full">Add filter</Button>
						<Drawer.Close asChild>
							<Button variant="outline" className="w-full">
								Cancel
							</Button>
						</Drawer.Close>
					</Drawer.Footer>
				</div>
			</Drawer.Content>
		</Drawer>
	)
}
