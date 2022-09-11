import { AppProps } from '@stump/client';

// TODO: move majority of current client into this interface workspace... kms...
export default function StumpInterface(props: AppProps) {
	console.log(props);
	return <div>Welcome to the Stump interface!</div>;
}
