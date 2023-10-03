# Configuring Stump

> Stump will use default options if you don't manually configure them. When following this guide, keep in mind you only need to provide values for things you wish to override.

Stump uses something called environment variables to set all of the various configuration properties. These environment variables are controlled has a custom TOML-based configuration, which is located by default at `$STUMP_CONFIG_DIR/Stump.toml`. `STUMP_CONFIG_DIR` itself is an environment variable that defaults to `.stump` your home directory, e.g. `/Users/oromei/.stump`.

If you're using Stump with Docker, you'll want to specify environment variables in either the `docker run` or `docker-compose.yml` file to override the default configuration. See the [Docker](/installation/docker) guide for more information.

## Configuration Options

There are a number of configuration options that you can set to customize Stump's behavior. You will be setting these options in the `Stomp.toml` file, but you can also set them as environment variables.

### Environment Variables

The following is a list of all the environment variables that Stump uses to configure itself:

#### API_VERSION

The version of the Stump API to use. This should really be left alone and **not** manually set.

| Type    | Default Value |
| ------- | ------------- |
| Integer | `1`           |

This corresponds to the `api_version` configuration option in the `Stump.toml` file.

### PDFIUM_PATH

The path to the PDFium binary. This is only required if you want PDF support and you're running Stump outside of Docker, since the PDFium binary is included in the Docker image. You'll want to find and download the PDFium binary for your platform from [here](https://github.com/bblanchon/pdfium-binaries/releases), and then set this environment variable to the path of the binary.

| Type   | Default Value                 |
| ------ | ----------------------------- |
| String | `/lib/libpdfium.so` in Docker |

### SESSION_SECRET

The secret key used to sign session cookies. This should be a random string of characters. If you don't set this, Stump will generate a random string for you. Only set this if you want to use a specific secret key.

| Type   | Default Value              |
| ------ | -------------------------- |
| String | _Randomly generated value_ |

### SESSION_TTL

The time-to-live for session cookies. This is the amount of time that a session cookie will be valid for _in seconds_. The default value is `259200`, or 3 days. You can set this to a different value if you want sessions to expire sooner or later, depending on your needs.

| Type    | Default Value |
| ------- | ------------- |
| Integer | `259200`      |

#### STUMP_ALLOWED_ORIGINS

The allowed origins for the Stump API. If you're trying to access the API from a different domain, you'll need to add it to this list. By default, origins corresponding to the Tauri desktop application are allowed, and the host machine's IP address with the configured port is allowed for both HTTP and HTTPS.

| Type     | Default Value                                                                                |
| -------- | -------------------------------------------------------------------------------------------- |
| String[] | `["tauri://localhost", "https://tauri.localhost", "http(s):{machine_ip}:{configured_port}"]` |

This corresponds to the `allowed_origins` configuration option in the `Stump.toml` file.

#### STUMP_IN_DOCKER

Whether or not Stump is running in a Docker container.

| Type    | Default Value |
| ------- | ------------- |
| Boolean | `false`       |

#### STUMP_CONFIG_DIR

The directory where Stump will look for its configuration file.

| Type   | Default Value |
| ------ | ------------- |
| String | `~/.stump`    |

#### STUMP_CLIENT_DIR

The directory the contains the web bundle for the web UI

| Type   | Default Value |
| ------ | ------------- |
| String | `./dist`      |

#### STUMP_PROFILE

The profile to use when running Stump. This should really be left alone and **not** manually set.

| Type   | Default Value |
| ------ | ------------- |
| String | `release`     |

#### STUMP_PORT

The port for the Stump server.

| Type    | Default Value |
| ------- | ------------- |
| Integer | `10801`       |

#### STUMP_VERBOSITY

The verbosity level for Stump logs. Verbosity levels are integers that correspond to a list of log levels that will be visible, and are inclusive of all the levels below them.

For example, if you set the verbosity level to `1`, you will see `INFO`, `WARN`, and `ERROR` messages. If you set the verbosity level to `2`, you will see `DEBUG`, `INFO`, `WARN`, and `ERROR` messages, and so on. The default verbosity level is `1`.

You may turn off logging entirely by setting the verbosity level to `0`. However, this is not recommended, as it will make it difficult to debug issues with Stump if they arise.

The available verbosity levels are:

| Option | Visible Log Levels                        |
| ------ | ----------------------------------------- |
| `0`    | `NONE`                                    |
| `1`    | `INFO`, `WARN`, `ERROR`                   |
| `2`    | `DEBUG`, `INFO`, `WARN`, `ERROR`          |
| `3`    | `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR` |

#### ENABLE_SWAGGER_UI

Whether or not to enable Swagger UI. To learn more about what Swagger UI is, visit [swagger.io](https://swagger.io/).

| Type    | Default Value |
| ------- | ------------- |
| Boolean | `true`        |
