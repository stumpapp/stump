import { Helmet } from "react-helmet";


export function AppTitle(props: {title?: string}) {
    return <Helmet titleTemplate="%s | Stump" defaultTitle="Stump">
        <title>{props.title}</title>
    </Helmet>
}