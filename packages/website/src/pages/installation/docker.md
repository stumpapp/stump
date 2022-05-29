# Docker

{% callout title="Note" icon="danger" %}
Stump will have an official Docker image available when the first beta release is published.

For now, Docker builds of Stump are _development only_, meaning if you want to use Docker you'll have to build your own image. This assumes you have already followed the [Developer Setup](/contributing) guide. These instructions will be updated for general usage when the official Docker image is available.
{% /callout %}

## Usage

You need to first create the image. Run the following command:

```bash
pnpm core build:docker
```

### Docker CLI

Once the image is created, you can create a container from it:

```bash
# replace my paths with your own
docker create \
  --name=stump \
  --user 1000:1000 \
  -p 6969:6969 \
  --volume /Users/aaronleopold/.stump:/config \
  --mount type=bind,source=/Users/aaronleopold/Documents/Stump,target=/data \
  --restart unless-stopped \
  stump
```

Then you can start the container:

```bash
docker start stump
```

#### Properties / Configuration

| Parameter |                   Functionality                    |
| --------- | :------------------------------------------------: |
| `-p 6969` | The port Stump uses for it's API and web interface |

### Docker Compose

Below is an example of a Docker Compose file you can use to bootstrap your Stump server:

```yaml
version: '3.3'
services:
  stump:
    image: stump # this will be `aaronleopold/stump` when it is released
    container_name: stump
    volumes:
      - type: bind
        source: /Users/aaronleopold/.stump
        target: /home/stump/config
      - type: bind
        source: /Users/aaronleopold/Documents/Stump
        target: /home/stump/data
    ports:
      - 6969:6969
    user: '1000:1000'
    # This `environment` field is optional, remove if you don't need it. I am using
    # them as an example here, but these are actually their default values.
    environment:
      - STUMP_CONFIG_DIR=/home/stump/config
      - STUMP_CLIENT_DIR=/home/stump/static
    restart: unless-stopped
```

## Monitoring

To monitor the logs of the container, you can use the following command:

```bash
docker logs -f stump
```

## Updating your container

TODO

## Example Configurations

To get you started, I wrote how-to guides for a few different Docker configurations. You can find them [here](/guides/docker-examples).
