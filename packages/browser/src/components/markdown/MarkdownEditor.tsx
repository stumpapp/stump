import { Card, cx, Divider, IconButton, Tabs, Text, ToolTip } from '@stump/components'
import { Asterisk, AtSign } from 'lucide-react'
import React, { useRef, useState } from 'react'

import MarkdownPreview from './MarkdownPreview'

type Props = {
	initialState?: 'writing' | 'preview'
	initialContent?: string
}
export default function MarkdownEditor({ initialState = 'writing', initialContent }: Props) {
	const [writingState, setWritingState] = useState(initialState)
	const [content, setContent] = useState(initialContent || '')

	const editorRef = useRef<HTMLTextAreaElement>(null)

	const changeHandler = (state: 'writing' | 'preview') => () => setWritingState(state)

	const handleAddSpoiler = () => {
		const spoiler = ':spoiler[]'

		const endsWithSpoiler = content.endsWith(spoiler)
		const endsWithSpaceAndSpoiler = endsWithSpoiler && content.endsWith(` ${spoiler}`)
		const additionalTrim = endsWithSpaceAndSpoiler ? 1 : 0

		const newContent = endsWithSpoiler
			? content.slice(0, content.length - spoiler.length - additionalTrim)
			: `${content}${content.length ? ' ' : ''}${spoiler}`
		setContent(newContent)

		// TODO: I would like to select the spoiler text, or at least move the cursor to the end of it
	}

	const renderTabContent = () => {
		if (writingState === 'preview') {
			return <MarkdownPreview className="px-1 py-0.5">{content}</MarkdownPreview>
		} else {
			return (
				<textarea
					ref={editorRef}
					className="w-full bg-transparent px-1 py-2 text-foreground-subtle focus:outline-none"
					value={content}
					onChange={(e) => setContent(e.target.value)}
					rows={4}
				/>
			)
		}
	}

	return (
		<Card className="flex w-full flex-col ring-0 focus-within:ring-2">
			<header className="flex w-full items-center justify-between">
				<Tabs value={writingState} variant="primary" activeOnHover>
					<Tabs.List className="border-none">
						<Tabs.Trigger value="writing" asChild onClick={changeHandler('writing')}>
							<Text className="cursor-pointer truncate">Write</Text>
						</Tabs.Trigger>

						<Tabs.Trigger
							value="preview"
							asChild
							onClick={changeHandler('preview')}
							disabled={!content.length}
						>
							<Text className={cx('truncate', { 'cursor-pointer': content.length })}>Preview</Text>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs>

				<div className="flex items-center gap-x-1.5 pr-1">
					<ToolTip content="Add spoiler" isDisabled={writingState === 'preview'}>
						<IconButton
							size="xs"
							variant="ghost"
							type="button"
							onClick={handleAddSpoiler}
							disabled={writingState === 'preview'}
						>
							<Asterisk className="h-5 w-5" />
						</IconButton>
					</ToolTip>

					<ToolTip content="Tag a user" isDisabled>
						<IconButton size="xs" variant="ghost" type="button" disabled>
							<AtSign className="h-5 w-5" />
						</IconButton>
					</ToolTip>
				</div>
			</header>

			<Divider variant="muted" className="" />

			<div className="h-full w-full px-[2px]">{renderTabContent()}</div>
		</Card>
	)
}
