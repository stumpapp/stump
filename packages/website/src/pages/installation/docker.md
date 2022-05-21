# Docker

{% callout title="Note" icon="danger" %}
Stump underwent a major refactor to replace SeaORM with Prisma. This migration broke the Docker build and is on the roadmap for a proper fix.
{% /callout %}

Stump hasn't had it's first beta release yet, and so there isn't an official Docker image quite yet. When it does, this page will be updated to reflect the proper instructions.

For now, Docker builds of Stump are for _development only_.

## Usage

You need to first create the image. Run the following command:

```bash
pnpm core build:docker
```

### Docker CLI

Once the image is created, you can create a container from it:

```bash
docker create \
  --name=stump \
  --user 1000:1000 \
  -p 6969:6969 \
  --volume ~/.stump:/home/stump/.stump \
  --mount type=bind,source=/path/to/data,target=/data \
  --restart unless-stopped \
  stump
```

You'll need to make the `source` and `target` paths match. So if you keep your libraries in `/Users/user/Library`, you'll need to bind `/Users/user/Library` to both `source` and `target`. This will eventually change to be more flexible.

Then you can start the container:

```bash
docker start stump
```

### Docker Compose

```yaml
version: '3.3'
services:
  stump:
    image: stump
    container_name: stump
    volumes:
      # TODO
    ports:
      - 6969:6969
    # This `environment` field is optional, remove if you don't need it
    environment:
      - <ENV_VAR>=<ENV VALUE>
    restart: unless-stopped
```

## Configuration

| Parameter |                   Functionality                    |
| --------- | :------------------------------------------------: |
| `-p 6969` | The port Stump uses for it's API and web interface |

## Monitoring

To monitor the logs of the container, you can use the following command:

```bash
docker logs -f stump
```

## Updating your container

TODO
