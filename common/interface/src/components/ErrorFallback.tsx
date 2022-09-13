import { ButtonGroup, Code, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { FallbackProps } from 'react-error-boundary';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { copyTextToClipboard } from '../utils/misc';

// TODO: take in platform?
export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
	function copyErrorStack() {
		if (error.stack) {
			copyTextToClipboard(error.stack).then(() => {
				toast.success('Copied error details to your clipboard');
			});
		}
	}

	return (
		<Stack
			data-tauri-drag-region
			mt={{ base: 12, md: 16 }}
			w="full"
			h="full"
			align="center"
			spacing={3}
		>
			<Heading as="h4" size="sm">
				Well, this is embarrassing...
			</Heading>

			<Heading as="h2" size="lg">
				Something went wrong!
			</Heading>

			<Text as="pre" fontSize="lg" maxW="xl" textAlign="center" pt={4} noOfLines={3}>
				Error: {error.message}.{' '}
			</Text>

			<Stack>
				{error.stack && (
					<Code rounded="md" maxW="4xl" maxH={72} overflowY="scroll" p={4}>
						{error.stack}
					</Code>
				)}

				<HStack pt={3} w="full" justify="space-between">
					<ButtonGroup>
						<Button
							title="Report this error as a potential bug on GitHub"
							href="https://github.com/aaronleopold/stump/issues/new/choose"
							target="_blank"
							as={'a'}
						>
							Report Bug
						</Button>
						{error.stack && (
							<Button
								title="Copy the error details to your clipboard"
								onClick={copyErrorStack}
								variant="ghost"
							>
								Copy Error Details
							</Button>
						)}
					</ButtonGroup>

					<ButtonGroup>
						<Button
							colorScheme="brand"
							onClick={resetErrorBoundary}
							title="Go back to the homepage"
							as={'a'}
							href="/"
						>
							Go Home
						</Button>
					</ButtonGroup>
				</HStack>
			</Stack>
		</Stack>
	);
}
