# Docker

{% callout title="Note" icon="danger" %}
Stump will have an official Docker image available when the first beta release is published.

For now, there is an x86_64 preview image available. **These are not frequently updated and are for testing purposes and are not intended for public usage yet**, so do not expect a fully featured, bug-free experience if you spin up a container.
{% /callout %}

## Usage

You have two options for spinning up a container based on your preference. I prefer using compose, however I have listed instructions for both Docker CLI and Docker Compose below.

### Docker CLI

Once the image is created, you can create a container from it:

```bash
# replace my paths with your own
docker create \
  --name=stump \
  --user 1000:1000 \
  -p 10801:10801 \
  --mount type=bind,source=/Users/aaronleopold/.stump,target=/config \
  --mount type=bind,source=/Users/aaronleopold/Documents/Stump,target=/data \
  --restart unless-stopped \
  aaronleopold/stump-preview
```

Then you can start the container:

```bash
docker start stump
```

#### Properties / Configuration

| Parameter  |                   Functionality                    |
| ---------- | :------------------------------------------------: |
| `-p 10801` | The port Stump uses for it's API and web interface |

### Docker Compose

Below is an example of a Docker Compose file you can use to bootstrap your Stump server:

```yaml
version: '3.3'
services:
  stump:
    image: aaronleopold/stump-preview # this will be `aaronleopold/stump` when it is released
    container_name: stump
    # Replace my paths (prior to the colons) with your own
    volumes:
      - /Users/aaronleopold/.stump:/config
      - /Users/aaronleopold/Documents/Stump:/data
    ports:
      - 10801:10801
    user: '1000:1000'
    # This `environment` field is optional, remove if you don't need it. I am using
    # them as an example here, but these are actually their default values.
    environment:
      - STUMP_CONFIG_DIR=/config
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
