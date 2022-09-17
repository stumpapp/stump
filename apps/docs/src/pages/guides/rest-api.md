# Stump's REST API

Stump exposes a REST API that allows you to interact with your Stump server. If you already have your Stump server set up, you can view the API documentation by visiting `http(s)://your-server(:10801)/api/rapidoc`

## Authentication

Stump uses server-side sessions to authenticate users. For OPDS-specific API endpoints, Basic Authentication is also used.

If you attempt to access an OPDS endpoint with Basic Authentication, a session will also be created for you.
