# Docker Examples

To help get you started, I've written a few example scenarios for configuring a Docker container for Stump. These are configurations that I felt were useful, but if you please consider [sharing your own](https://github.com/aaronleopold/stump/issues/new/choose) if you have a useful one.

For all of the examples below, I'll be mimicking a setup very close to my own usage but just trimmed down for the sake of brevity:

- My data directory is `/Users/aaronleopold/Documents/Stump`
- My config directory is `/Users/aaronleopold/.stump`

## Simple Docker

Coming Soon!

## Docker with Traefik

Coming Soon!

local dev example:

```yaml
version: '3.3'
services:
  reverse-proxy:
    container_name: stump-reverse-proxy
    restart: unless-stopped
    image: traefik:2.7
    command:
      - --api.insecure=true
      - --providers.docker=true
      - --entrypoints.web.address=:80
    ports:
      - '80:80'
      - '8080:8080'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  stump:
    image: stump
    container_name: stump-traefik
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
    environment:
      - STUMP_CONFIG_DIR=/home/stump/config
      - STUMP_ALLOWED_ORIGINS=http://localhost:6969,http://stump.local
    restart: unless-stopped
    labels:
      - 'traefik.http.routers.stump-http.rule=Host(`stump.local`)'
      - 'traefik.http.routers.stump-http.service=stump'
      - 'traefik.http.services.stump.loadbalancer.server.port=6969'
```
