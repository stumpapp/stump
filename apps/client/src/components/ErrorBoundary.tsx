import { Code, Heading, HStack, Link, Spacer, Stack, Text, useBoolean } from '@chakra-ui/react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import Button from '~ui/Button';
import BaseLayout from './Layouts/BaseLayout';

function ErrorFallback({ error }: FallbackProps) {
	// const [showMore, { toggle }] = useBoolean(true);

	return (
		<BaseLayout>
			<Stack mt={{ base: 12, md: 16 }} w="full" h="full" align="center" spacing={3}>
				<Heading as="h4" size="sm">
					Well, this is embarrassing...
				</Heading>

				<Heading as="h2" size="lg">
					Something went wrong!
				</Heading>

				<Text as="pre" fontSize="lg" maxW="xl" textAlign="center" pt={4}>
					Error: {error.message}.{' '}
					{/* {error.stack && (
						<>
							<span onClick={toggle} className="cursor-pointer text-brand-400">
								Click me
							</span>{' '}
							to see {showMore ? 'less' : 'more'}.
						</>
					)} */}
				</Text>

				{error.stack && (
					<Code rounded="md" maxW="4xl" maxH={72} overflowY="scroll" p={4}>
						{error.stack}
					</Code>
				)}

				<HStack pt={3}>
					<Button
						href="https://github.com/aaronleopold/stump/issues/new/choose"
						target="_blank"
						className="!no-underline"
						as={Link}
					>
						Report Bug
					</Button>

					<Button href="/" variant="solid" colorScheme="brand" className="!no-underline" as={Link}>
						Go Home
					</Button>
				</HStack>
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
