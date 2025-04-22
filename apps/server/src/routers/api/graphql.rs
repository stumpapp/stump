use crate::middleware::{auth::auth_middleware, host::HostDetails};
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
	data::{RequestContext, ServiceContext},
	schema::{build_schema, AppSchema},
};

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

// TODO(sea-orm): Consider new user permission
async fn playground(
	Extension(req_ctx): Extension<RequestContext>,
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

// TODO(sea-orm): Move to separate file, get OPTIONAL user(?), enforce user for all but login-related mutations? Or just retain restful login?
async fn graphql_handler(
	schema: Extension<AppSchema>,
	Extension(req_ctx): Extension<RequestContext>,
	Extension(details): Extension<HostDetails>,
	req: GraphQLRequest,
) -> GraphQLResponse {
	let mut req = req.into_inner();
	req = req.data(req_ctx);
	// TODO(graphql): Refactor extractor to use ServiceContext instead
	req = req.data(ServiceContext {
		host: details.host,
		scheme: details.scheme,
	});
	schema.execute(req).await.into()
}

async fn graphql_subscription_handler(
	schema: Extension<AppSchema>,
	State(ctx): State<AppState>,
	Extension(req_ctx): Extension<RequestContext>,
	protocol: GraphQLProtocol,
	websocket: WebSocketUpgrade,
) -> impl IntoResponse {
	let mut data = async_graphql::Data::default();
	data.insert(req_ctx);
	data.insert(ctx);

	websocket
		.protocols(ALL_WEBSOCKET_PROTOCOLS)
		.on_upgrade(move |stream| {
			GraphQLWebSocket::new(stream, schema.0, protocol)
				.with_data(data)
				.serve()
		})
}
