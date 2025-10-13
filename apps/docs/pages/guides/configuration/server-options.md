# Server Config

> Stump will use default options if you don't manually configure them. When following this guide, keep in mind you only need to provide values for things you wish to override.

Stump uses something called environment variables to set all of the various configuration properties. These environment variables are controlled has a custom TOML-based configuration, which is located by default at `$STUMP_CONFIG_DIR/Stump.toml`. `STUMP_CONFIG_DIR` itself is an environment variable that defaults to `.stump` your home directory, e.g., `/Users/oromei/.stump`.

If you're using Stump with Docker, you'll want to specify environment variables in either the `docker run` or `docker-compose.yml` file to override the default configuration. See the [Docker](/installation/docker) guide for more information.

## Environment Variables

There are a number of configuration options that you can set to customize Stump's behavior. You will be setting these options in the `Stump.toml` file, but you can also set them as environment variables.

The following is a list of all the environment variables that Stump uses to configure itself:

### API_VERSION

The version of the Stump API to use. This should really be left alone and **not** manually set.

| Type    | Default Value |
| ------- | ------------- |
| Integer | `1`           |

This corresponds to the `api_version` configuration option in the `Stump.toml` file.

### EMAIL_TEMPLATES_DIR

The directory where Stump will look for email templates. This is only required if you want to use custom email templates. By default, Stump will look for email templates in the `templates` directory in the root of the configuration directory. E.g., if your configuration directory is `~/.stump`, Stump will look for email templates in `~/.stump/templates`.

| Type   | Default Value            |
| ------ | ------------------------ |
| String | `{config_dir}/templates` |

#### PDFIUM_PATH

The path to the PDFium binary. This is only required if you want PDF support and you're running Stump outside of Docker, since the PDFium binary is included in the Docker image. You'll want to find and download the PDFium binary for your platform from [here](https://github.com/bblanchon/pdfium-binaries/releases), and then set this environment variable to the path of the binary.

| Type   | Default Value                 |
| ------ | ----------------------------- |
| String | `/lib/libpdfium.so` in Docker |

#### SESSION_EXPIRY_CLEANUP_INTERVAL

The time (_in seconds_) between each session expiry cleanup check. The check will remove any expired sessions from the database.

| Type    | Default Value |
| ------- | ------------- |
| Integer | `60`          |

#### SESSION_TTL

The time-to-live for session cookies. This is the amount of time that a session cookie will be valid for _in seconds_. The default value is `259200`, or 3 days. You can set this to a different value if you want sessions to expire sooner or later, depending on your needs.

| Type    | Default Value |
| ------- | ------------- |
| Integer | `259200`      |

### STUMP_ALLOWED_ORIGINS

A **comma-delineated** list of allowed origins for the Stump API. If you're trying to access the API from a different domain, you'll need to add it to this list. By default, origins corresponding to the Tauri desktop application are allowed, and the host machine's IP address with the configured port is allowed for both HTTP and HTTPS.

| Type   | Default Value                                                                              |
| ------ | ------------------------------------------------------------------------------------------ |
| String | `"tauri://localhost","https://tauri.localhost","http(s)://{machine_ip}:{configured_port}"` |

This corresponds to the `allowed_origins` configuration option in the `Stump.toml` file, but will be stored as a valid array in the configuration file.

**Be sure to replace `{machine_ip}` and `{configured_port}` with the appropriate values for your environment.**

### STUMP_CONFIG_DIR

The directory where Stump will look for its configuration file.

| Type   | Default Value |
| ------ | ------------- |
| String | `~/.stump`    |

### STUMP_CLIENT_DIR

The directory the contains the web bundle for the web UI

| Type   | Default Value |
| ------ | ------------- |
| String | `./dist`      |

### STUMP_PROFILE

The profile to use when running Stump. This should really be left alone and **not** manually set.

| Type   | Default Value |
| ------ | ------------- |
| String | `release`     |

### STUMP_PORT

The port for the Stump server.

| Type    | Default Value |
| ------- | ------------- |
| Integer | `10801`       |

### STUMP_VERBOSITY

The verbosity level for Stump logs. Verbosity levels are integers that correspond to a list of log levels that will be visible, and are inclusive of all the levels below them.

For example, if you set the verbosity level to `1`, you will see `INFO`, `WARN`, and `ERROR` messages. If you set the verbosity level to `2`, you will see `DEBUG`, `INFO`, `WARN`, and `ERROR` messages, and so on. The default verbosity level is `1`.

You may turn off logging entirely by setting the verbosity level to `0`. However, this is not recommended, as it will make it difficult to debug issues with Stump if they arise. I generally recommend setting the verbosity to `1`, as it allows you to see info-level messages, warnings, and errors.

The available verbosity levels are:

| Option | Visible Log Levels                        |
| ------ | ----------------------------------------- |
| `0`    | `NONE`                                    |
| `1`    | `INFO`, `WARN`, `ERROR`                   |
| `2`    | `DEBUG`, `INFO`, `WARN`, `ERROR`          |
| `3`    | `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR` |

### STUMP_MAX_SCANNER_CONCURRENCY

The maximum number of files which may be processed concurrently by the scanner. This is useful for limiting the number of files that are processed at once, which can help prevent the server from becoming overwhelmed on systems with limited resources.

**Note:** The OS thread scheduler should prevent overload, however, you may want to set this value lower if you're running Stump on a system with limited resources.

| Type    | Default Value |
| ------- | ------------- |
| Integer | `200`         |

### STUMP_MAX_THUMBNAIL_CONCURRENCY

The maximum number of images which may be generated concurrently by the thumbnailer. This is useful for limiting the number of thumbnails that are generated at once, which can help prevent the server from becoming overwhelmed on systems with limited resources.

**Note:** Thumbnail generation is a CPU-intensive process, so you may want to set this value lower if you're running Stump on a system with limited resources.

| Type    | Default Value |
| ------- | ------------- |
| Integer | `50`          |

### ENABLE_SWAGGER_UI

Whether or not to enable Swagger UI. To learn more about what Swagger UI is, visit [swagger.io](https://swagger.io/).

| Type    | Default Value |
| ------- | ------------- |
| Boolean | `false`       |

### ENABLE_KOREADER_SYNC

Whether or not to enable the KoReader sync integration. This is a special integration that allows KoReader to sync with Stump. To learn more about this integration, visit the [KoReader](/guides/integrations/koreader) guide.

| Type    | Default Value |
| ------- | ------------- |
| Boolean | `false`       |

### ENABLE_OPDS_PROGRESSION

Whether or not OPDS page access should automatically track reading progression. When disabled, accessing pages via OPDS won't update reading progress, which prevents inaccurate tracking when clients preload or cache multiple pages at once. This is particularly useful for OPDS clients that load more than one page at a time.

| Type    | Default Value |
| ------- | ------------- |
| Boolean | `false`       |

### ENABLE_UPLOAD

| Type    | Default Value |
| ------- | ------------- |
| Boolean | `false`       |

### MAX_IMAGE_UPLOAD_SIZE

The maximum size, in bytes, for images uploaded as thumbnails for users, libraries, series, or media.

| Type    | Default Value      |
| ------- | ------------------ |
| Integer | `20971520` (20 MB) |

### MAX_FILE_UPLOAD_SIZE

The maximum allowed size, in bytes, of files uploaded via the upload interface. This configuration variable will have no effect unless `ENABLE_UPLOAD` is `true`.

| Type    | Default Value      |
| ------- | ------------------ |
| Integer | `20971520` (20 MB) |
