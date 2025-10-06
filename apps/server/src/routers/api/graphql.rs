use crate::middleware::{auth::auth_middleware, host::HostExtractor};
use async_graphql::http::{
	playground_source, GraphQLPlaygroundConfig, ALL_WEBSOCKET_PROTOCOLS,
};
use async_graphql_axum::{
	GraphQLProtocol, GraphQLRequest, GraphQLResponse, GraphQLWebSocket,
};
use axum::{
	extract::{ws::WebSocketUpgrade, State},
	middleware,
	response::{Html, IntoResponse},
	routing::{get, post},
	Extension, Router,
};

use graphql::{
	data::{AuthContext, ServiceContext},
	schema::{build_schema, AppSchema},
};
use tower_sessions::Session;

use crate::{config::state::AppState, errors::APIError};

pub(crate) async fn mount(app_state: AppState) -> Router<AppState> {
	let schema = build_schema(app_state.clone()).await;

	let mut method_router = post(graphql_handler);
	if app_state.config.enable_swagger || cfg!(debug_assertions) {
		method_router = method_router.get(playground);
	}

	Router::new()
		.route("/", method_router)
		.route("/ws", get(graphql_subscription_handler))
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
		.layer(Extension(schema))
}

// TODO: Consider new user permission
async fn playground(
	Extension(req_ctx): Extension<AuthContext>,
) -> Result<impl IntoResponse, APIError> {
	if !req_ctx.user().is_server_owner {
		return Err(APIError::forbidden_discreet());
	}

	Ok(Html(playground_source(
		GraphQLPlaygroundConfig::new("/api/graphql")
			.subscription_endpoint("/api/graphql/ws")
			.with_setting("request.credentials", "include"),
	)))
}

async fn graphql_handler(
	schema: Extension<AppSchema>,
	Extension(auth): Extension<AuthContext>,
	HostExtractor(details): HostExtractor,
	session: Session,
	req: GraphQLRequest,
) -> GraphQLResponse {
	let mut req = req.into_inner();
	req = req.data(auth);
	req = req.data(ServiceContext {
		host: details.host,
		scheme: details.scheme,
	});
	req = req.data(session);
	schema.execute(req).await.into()
}

async fn graphql_subscription_handler(
	schema: Extension<AppSchema>,
	State(ctx): State<AppState>,
	Extension(auth): Extension<AuthContext>,
	protocol: GraphQLProtocol,
	websocket: WebSocketUpgrade,
) -> impl IntoResponse {
	let mut data = async_graphql::Data::default();
	data.insert(auth);
	data.insert(ctx);

	websocket
		.protocols(ALL_WEBSOCKET_PROTOCOLS)
		.on_upgrade(move |stream| {
			GraphQLWebSocket::new(stream, schema.0, protocol)
				.with_data(data)
				.serve()
		})
}
