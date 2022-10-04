# Docker

{% callout title="Note" icon="danger" %}
Stump will have an official Docker image available when the first beta release is published.

Until then, you may use a preview image available on a separate [Dockerhub repository](https://hub.docker.com/r/aaronleopold/stump-preview). **This image will not be frequently updated and should be used for testing purposes only**, so do not expect a fully featured, bug-free experience if you spin up a container.
{% /callout %}

## Usage

You have two options for spinning up a container based on your preference. I prefer using compose, however I have listed instructions for both Docker CLI and Docker Compose below.

**Note**: there is a current issue on some platforms where the config directory you specify in the volume mapping is created as root by Docker. Please be sure to either create the config directory _before_ creating the container, or be sure to transfer ownership to the appropriate user afterwards:

```bash
# example on macOS/linux
sudo chown -r $USER ~/.stump
```

### Using docker run

You can create a container by running:

```bash
# replace my paths (left of colon) with your own
docker create \
  --name=stump \
  --user 1000:1000 \
  -p 10801:10801 \
  --volume "/Users/aaronleopold/.stump:/config" \
  --volume "/Users/aaronleopold/Documents/Stump:/data" \
  --restart unless-stopped \
  aaronleopold/stump-preview
```

If you prefer bind mounts, you can swap out the two `--volume` lines with:

```bash
--mount type=volume,source=/Users/aaronleopold/.stump,target=/config \
--mount type=volume,source=/Users/aaronleopold/Documents/Stump,target=/data \
```

Then you can start the container:

```bash
docker start stump
```

#### Properties and configuration

| Parameter          |                                Functionality                                |
| ------------------ | :-------------------------------------------------------------------------: |
| `--name=stump`     |           Sets the name of the container this command will create           |
| `--user=1000:1000` |    Sets the user and group used within the container (leave this as is)     |
| `-p 10801:10801`   | Maps the port on your machine (left) to the port the container uses (right) |

### Using docker compose

{% callout title="docker compose vs docker-compose" icon="note" %}
This tutorial uses the newer `docker compose` CLI. If you find this command does not exist for you, you might be on V1, which uses `docker-compose`. Please review [Docker's documentation](https://docs.docker.com/compose/install/) for more information and/or platform-specific installation.
{% /callout %}

Below is an example of a Docker Compose file you can use to bootstrap your Stump server:

```yaml
version: '3.3'
services:
  stump:
    image: aaronleopold/stump-preview
    container_name: stump
    # Replace my paths (prior to the colons) with your own
    volumes:
      - /Users/aaronleopold/.stump:/config
      - /Users/aaronleopold/Documents/Stump:/data
    ports:
      - 10801:10801
    user: '1000:1000'
    # This `environment` field is optional, remove if you don't need it.
    # I am using them as an example here, but these are actually
    # their default values.
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

As with starting Stump, updating your container is slightly different depending on how you chose to run it.

### Update using docker CLI

1. Update the image: `docker pull aaronleopold/stump-preview`
2. Stop the running container: docker stop komga
3. Delete the container: docker rm komga
4. Recreate your container (as instructed above)
5. Start the new container: `docker start stump`

To remove the old dangling images you have installed: `docker image prune`

### Update using docker compose

1. Stop the running container: `docker compose down`
2. Update the image: `docker compose pull` or `docker compose pull aaronleopold/stump-preview`
3. Start the container again: `docker-compose up`
