# Web App

The web app is the default, browser-based interface for Stump. It is a single-page application (SPA) built with [React](https://react.dev/).

## Access

The web app is accessible by navigating the host machine's IP address and the configured port in a web browser. For example, if your Stump server is running on your local machine and the default port is used, you would navigate to `http://localhost:10801` in your browser. If you are attempting to access the web app from a different machine on the same network, you would navigate to `http://{machine_ip}:10801`.

Accessing the web app from a different machine on a different network is a bit more complicated, and a bit beyond the scope of this guide. In the future, I'd love to have some curated tutorials for common setups (e.g., using a reverse proxy, setting up a VPN, etc.). I personally use Tailscale and Caddy, but there are many ways to accomplish this.

If you have a specific setup you'd like to see a guide for, or are willing to share your setup with a proper how-to write-up, please reach out!
