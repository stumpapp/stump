import { useDirectoryListing } from '@stump/client'
import { Button, CheckBox, cx, Dialog, Input, Text, useBoolean } from '@stump/components'
import { ArrowLeft, Folder } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'

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
	const [showHidden, { toggle }] = useBoolean(false)

	// FIXME: This component needs to render a *virtual* list AND pass a page param as the user scrolls
	// down the list. I recently tested a directory with 1000+ files and it took a while to load. So,
	// I am paging the results to 100 per page. Might reduce to 50.
	const { errorMessage, path, parent, directories, setPath, goBack } = useDirectoryListing({
		enabled: isOpen,
		initialPath: startingPath,
		// TODO: page
	})

	function handleConfirm() {
		if (!errorMessage) {
			onPathChange(path)
			onClose()
		}
	}

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

				<div className="flex flex-col space-y-2">
					<div className="flex items-center space-x-2">
						<Button
							className="h-8 w-8 p-0 text-sm"
							disabled={!parent}
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
							value={path ?? undefined}
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

					<div className="flex h-[20rem] flex-col divide-y divide-edge/75 overflow-y-auto px-1 pt-1 scrollbar-hide">
						{directoryList.map((directory, i) => (
							<button
								key={directory.path}
								className={cx('justify-start px-2 py-1.5 text-left hover:bg-background-surface', {
									'bg-background-surface/40': i % 2 === 0,
								})}
								onClick={() => setPath(directory.path)}
							>
								<Text className="line-clamp-1 inline-flex items-center gap-x-2">
									<Folder size="1.25rem" />
									<span>{directory.name}</span>
								</Text>
							</button>
						))}
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
