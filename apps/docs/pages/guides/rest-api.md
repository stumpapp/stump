# Stump's REST API

Stump exposes a REST API that allows you to interact with your Stump server.

## Accessing Swagger UI

Stump's REST API is documented using Swagger. You can access Swagger UI by visiting visiting `http(s)://your-server(:10801)/swagger-ui`. If you aren't familiar with Swagger, you can read more about it [here](https://swagger.io/). Under the hood, Stump uses [utoipa](https://github.com/juhaku/utoipa) for semi-automated Swagger generation. If you find any issues or inconsistencies with the API options available while using the Swagger UI, please open an [issue](https://github.com/stumpapp/stump/issues) outlining the problem.

### Disabling Swagger UI

If you don't want to expose Swagger UI, you can disable it by setting the `ENABLE_SWAGGER_UI` environment variable to `false`. See the [configuration guide](/guides/configuration) for more information.

## Authentication

Stump uses server-side sessions to authenticate users. The only exception to this rule are the OPDS endpoints, which may also use Basic Authentication. This was done to support the wide range of OPDS clients that authenticate using Basic Authentication.

Authenticating with Basic Authentication will still create a server-side session for you.
