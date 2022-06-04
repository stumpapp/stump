# Configuring Stump

{% callout title="Default Options" icon="note" %}
Stump will use default options if you don't manually configure them. When following this guide, keep in mind you only need to provide values for things you wish to override.
{% /callout %}

Stump uses something called environment variables to set all of the various configuration properties. These environment variables are controlled has a custom TOML-based configuration, which is located by default at `$STUMP_CONFIG_DIR/Stump.toml`. `STUMP_CONFIG_DIR` itself is an environment variable that defaults to `.stump` your home directory, e.g. `/Users/oromei/.stump`.

If you're using Stump with Docker, you'll want to specify environment variables in either the `docker run` or `docker-compose.yml` file to override the default configuration. See the [Docker](/installation/docker) guide for more information.

TODO write this
