import createStore, { Provider } from './store';

interface Props {
	children: React.ReactNode;
}

export default function MainStoreProvider({ children }: Props) {
	return <Provider createStore={createStore}>{children}</Provider>;
}
