import React from 'react';
import {
	HStack,
	Popover,
	PopoverArrow,
	PopoverBody,
	PopoverContent,
	PopoverTrigger,
	Portal,
	Stack,
	Text,
} from '@chakra-ui/react';
import { TextAa } from 'phosphor-react';
import { IconButton } from '~components/ui/Button';

interface Props {
	changeFontSize(size: number): void;
	fontSize: number;
}

export default function FontSelection({ changeFontSize, fontSize }: Props) {
	return (
		<Popover size="sm">
			<PopoverTrigger>
				<IconButton variant="ghost">
					<TextAa className="text-lg" weight="regular" />
				</IconButton>
			</PopoverTrigger>
			<Portal>
				<PopoverContent>
					<PopoverArrow />
					<PopoverBody>
						<Stack>
							<Text textAlign="center">{fontSize}px</Text>

							<HStack justify="center">
								<IconButton
									onClick={() => changeFontSize(fontSize - 1)}
									variant="ghost"
									fontSize="sm"
									title="Decrease font size"
								>
									A
								</IconButton>

								<IconButton
									onClick={() => changeFontSize(fontSize + 1)}
									variant="ghost"
									fontSize="2xl"
									title="Increase font size"
								>
									A
								</IconButton>
							</HStack>
						</Stack>
					</PopoverBody>
				</PopoverContent>
			</Portal>
		</Popover>
	);
}
