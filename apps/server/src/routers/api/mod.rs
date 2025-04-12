pub(crate) mod filters;
pub(crate) mod v2;

use crate::middleware::auth::auth_middleware;
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

use graphql::schema::{build_schema, AppSchema};
use models::entity::user::AuthUser;

use crate::{
	config::state::AppState, errors::APIError, middleware::auth::RequestContext,
};

pub(crate) async fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest(
		"/api",
		Router::new()
			.nest("/graphql", graphql(app_state.clone()).await)
			.nest("/v2", v2::mount(app_state)),
	)
}

pub(crate) async fn graphql(app_state: AppState) -> Router<AppState> {
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

fn get_graphql_req_ctx(req_ctx: RequestContext) -> graphql::data::RequestContext {
	let user = req_ctx.user();
	// TODO(sea-orm): Use graphQL everywhere once User model is widely used
	graphql::data::RequestContext {
		user: AuthUser {
			id: user.id.clone(),
			username: user.username.clone(),
			is_server_owner: user.is_server_owner,
			is_locked: user.is_locked,
			// age_restriction: user.age_restriction,
			// permissions: user.permissions,
			age_restriction: None,
			permissions: vec![],
		},
		api_key: req_ctx.api_key(),
	}
}

// TODO(sea-orm): Move to separate file, get OPTIONAL user(?), enforce user for all but login-related mutations? Or just retain restful login?
async fn graphql_handler(
	schema: Extension<AppSchema>,
	Extension(req_ctx): Extension<RequestContext>,
	req: GraphQLRequest,
) -> GraphQLResponse {
	let mut req = req.into_inner();

	let req_ctx = get_graphql_req_ctx(req_ctx);
	req = req.data(req_ctx);

	schema.execute(req).await.into()
}

async fn graphql_subscription_handler(
	schema: Extension<AppSchema>,
	State(ctx): State<AppState>,
	Extension(req_ctx): Extension<RequestContext>,
	protocol: GraphQLProtocol,
	websocket: WebSocketUpgrade,
) -> impl IntoResponse {
	let req_ctx = get_graphql_req_ctx(req_ctx);
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
