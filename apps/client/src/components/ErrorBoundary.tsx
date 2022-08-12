import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import toast from 'react-hot-toast';
import Button from '~ui/Button';

import { ButtonGroup, Code, Heading, HStack, Link, Stack, Text } from '@chakra-ui/react';

import BaseLayout from './Layouts/BaseLayout';

function ErrorFallback({ error }: FallbackProps) {
	async function copyTextToClipboard(text: string) {
		return await navigator.clipboard.writeText(text);
	}

	function handleCopyErrorDetails() {
		if (error.stack) {
			copyTextToClipboard(error.stack).then(() => toast.success('Copied error details!'));
		}
	}

	return (
		<BaseLayout>
			<Stack mt={{ base: 12, md: 16 }} w="full" h="full" align="center" spacing={3}>
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
								href="https://github.com/aaronleopold/stump/issues/new/choose"
								target="_blank"
								className="!no-underline"
								as={Link}
							>
								Report Bug
							</Button>
							{error.stack && (
								<Button onClick={handleCopyErrorDetails} variant="ghost">
									Copy Error Details
								</Button>
							)}
						</ButtonGroup>

						<Button
							href="/"
							variant="solid"
							colorScheme="brand"
							className="!no-underline"
							as={Link}
						>
							Go Home
						</Button>
					</HStack>
				</Stack>
			</Stack>
		</BaseLayout>
	);
}

interface Props {
	children: React.ReactNode;
}

export default function ({ children }: Props) {
	return <ErrorBoundary FallbackComponent={ErrorFallback}>{children}</ErrorBoundary>;
}
