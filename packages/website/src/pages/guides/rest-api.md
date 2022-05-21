# Stump's REST API

Stump exposes a REST API that allows you to interact with your Stump server.

{% callout title="Note" icon="warning" %}
There is currently no official documentation for the REST API. However, this is an extremely important item on the roadmap and will be available before the first beta release.
{% /callout %}

## Authentication

Stump uses server-side sessions to authenticate users. For OPDS-specific API endpoints, Basic Authentication is also used.

If you attempt to access an OPDS endpoint with Basic Authentication, a session will also be created for you.
