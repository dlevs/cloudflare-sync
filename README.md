This is a CLI tool to synchronise a local directory with [Cloudflare Images](https://www.cloudflare.com/en-gb/products/cloudflare-images/).

## Features

- Syncs an entire directory, rather that 1 file at a time.
- Skips files already uploaded.
- Uses the relative filepath as the image ID, so the final CDN URLs are predictable.

## Installation

```sh
npm install -g cloudflare-sync
```

## Usage

Ensure you have a `CLOUDFLARE_API_TOKEN` environment variable set. Then use the CLI:

```sh
npx cloudflare-sync --source ./public --account c495ed7f42a6ac8cb22cc3b822a684cb --ext jpg,png
```
