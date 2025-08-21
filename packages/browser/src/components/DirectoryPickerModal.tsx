import { useDirectoryListing } from '@stump/client'
import { Button, CheckBox, cx, Dialog, Input, Text, useBoolean } from '@stump/components'
import { ArrowLeft, Folder } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import { toast } from 'sonner'

interface Props {
	isOpen: boolean
	onClose(): void
	startingPath?: string
	onPathChange(path: string | null): void
}

export default function DirectoryPickerModal({
	isOpen,
	onClose,
	startingPath,
	onPathChange,
}: Props) {
	const virtuosoRef = useRef<VirtuosoHandle>(null)

	const [showHidden, { toggle }] = useBoolean(false)

	const { errorMessage, path, directories, canGoBack, setPath, goBack, canLoadMore, loadMore } =
		useDirectoryListing({
			initialPath: startingPath,
			ignoreParams: {
				ignoreFiles: true,
				ignoreHidden: !showHidden,
			},
		})

	const handleConfirm = useCallback(() => {
		if (!errorMessage) {
			onPathChange(path)
			onClose()
		}
	}, [errorMessage, path, onPathChange, onClose])

	const onLoadMore = useCallback(() => {
		if (canLoadMore) {
			loadMore()
		}
	}, [canLoadMore, loadMore])

	useEffect(() => {
		if (errorMessage) {
			toast.error(errorMessage)
		}
	}, [errorMessage])

	const directoryList = useMemo(() => {
		if (showHidden) {
			return directories
		}

		return directories.filter((d) => !d.name.startsWith('.'))
	}, [directories, showHidden])

	const handleOpenChange = (nowOpen: boolean) => {
		if (!nowOpen) {
			onClose()
		}
	}

	/**
	 * Scroll to the top of the list when the path changes, otherwise Virtuoso will
	 * retain the scroll position which could land you in the middle of the list.
	 */
	useEffect(() => {
		virtuosoRef.current?.scrollToIndex({
			index: 0,
			behavior: 'smooth',
		})
	}, [path])

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<Dialog.Content size="md">
				<Dialog.Header>
					<Dialog.Title>Select a Directory</Dialog.Title>
					<Dialog.Description>
						Specify the directory where your library is located.
					</Dialog.Description>
					<Dialog.Close onClick={onClose} />
				</Dialog.Header>

				<div className="flex flex-col space-y-2 overflow-hidden p-1">
					<div className="flex items-center space-x-2">
						<Button
							className="h-8 w-8 p-0 text-sm"
							disabled={!canGoBack}
							onClick={goBack}
							variant="ghost"
						>
							<ArrowLeft size="1.25rem" />
						</Button>

						{/* TODO: error message display */}
						<Input
							className="line-clamp-1 h-[37px]"
							containerClassName="max-w-full"
							// isInvalid={!!errorMessage}
							value={path ?? ''}
							readOnly
							variant="primary"
							// TODO: allow input to be editable
							// onInputStop={(newPath) => {
							// 	if (newPath) {
							// 		setPath(newPath);
							// 	}
							// }}
						/>
					</div>

					<div className="flex h-[20rem] flex-col divide-y divide-edge/75 overflow-hidden">
						<AutoSizer>
							{({ height, width }) => (
								<Virtuoso
									ref={virtuosoRef}
									className="overflow-x-hidden"
									style={{ height, width }}
									data={directoryList}
									itemContent={(index, directory) => (
										<button
											className={cx(
												'my-0.5 w-full justify-start rounded-lg px-2 py-1.5 text-left hover:bg-background-surface',
												{
													'bg-background-surface/40': index % 2 === 0,
												},
											)}
											onClick={() => setPath(directory.path)}
										>
											<Text className="line-clamp-1 inline-flex items-center gap-x-2">
												<Folder size="1.25rem" className="shrink-0" />
												<span className="line-clamp-1">{directory.name}</span>
											</Text>
										</button>
									)}
									endReached={onLoadMore}
									increaseViewportBy={5 * (320 / 3)}
								/>
							)}
						</AutoSizer>
					</div>
				</div>

				<Dialog.Footer className="w-full items-center gap-3 sm:justify-between sm:gap-0">
					<CheckBox
						variant="primary"
						label="Show Hidden Directories"
						checked={showHidden}
						onClick={toggle}
					/>

					<div className="flex w-full flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0">
						<Button onClick={onClose}>Cancel</Button>
						<Button variant="primary" onClick={handleConfirm}>
							Confirm
						</Button>
					</div>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
