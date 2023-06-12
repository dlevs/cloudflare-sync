#!/usr/bin/env NODE_OPTIONS=--no-warnings node

import path from "node:path";

import { Command } from "commander";
import pLimit from "p-limit";

import packageJson from "../package.json" assert { type: "json" };
import { CloudflareClient, CloudflareImage } from "./lib/CloudflareClient.js";

const program = new Command();

program
  .name("cloudflare-sync")
  .description("CLI for uploading images to cloudflare.")
  .version(packageJson.version)
  .option("--source <string>", "Local directory to sync")
  .option("--account <string>", "Cloudflare account ID", "")
  .option(
    "--parallel <integer>",
    "Number of files to upload in parallel",
    Number,
    10
  )
  .option(
    "--ext <string>",
    "Comma-separated list of file extensions to process",
    "jpg,jpeg,png"
  )
  .action(sync);

async function sync(args: {
  source?: string;
  account?: string;
  ext: string;
  parallel: number;
}) {
  const { globby } = await import("globby");
  const { default: ora } = await import("ora");
  const { source, account, parallel } = args;

  if (source == null) {
    throw new Error("Missing --source argument");
  }

  if (account == null) {
    throw new Error("Missing --account argument");
  }

  const API_KEY = process.env.CLOUDFLARE_API_TOKEN;
  if (API_KEY == null) {
    throw new Error("Missing CLOUDFLARE_API_TOKEN environment variable");
  }

  const client = new CloudflareClient(account, API_KEY);

  const spinner = ora("Checking local images").start();
  const srcFilenames = await globby(path.join(source, `**/*.{${args.ext}}`));
  spinner.stopAndPersist({
    text: `Found ${srcFilenames.length} local images`,
    symbol: "✅",
  });

  spinner.start("Checking images already uploaded");
  const syncedImages = await client.getImages();
  spinner.stopAndPersist({
    text: `Found ${syncedImages.length} server images`,
    symbol: "✅",
  });

  const srcFiles = srcFilenames.map((localAbsolutePath): CloudflareImage => {
    const id = path.relative(source, localAbsolutePath);
    return {
      id,
      localAbsolutePath,
      serverData: syncedImages.find((image) => image.id === id),
    };
  });
  const filesToSync = srcFiles.filter((file) => file.serverData == null);

  if (filesToSync.length === 0) {
    spinner.stopAndPersist({
      text: `There are no files to sync`,
      symbol: "✅",
    });
    process.exit(0);
  }

  const limit = pLimit(parallel);
  let completedCount = 0;

  spinner.start();
  updateProgress();

  await Promise.all(
    filesToSync.map((file) =>
      limit(async () => {
        await client.uploadImage(file);
        completedCount++;
        updateProgress();
      })
    )
  );

  spinner.stopAndPersist({
    text: `Synced ${filesToSync.length} files`,
    symbol: "✅",
  });

  function updateProgress() {
    spinner.text = `Syncing files ${completedCount}/${filesToSync.length}`;
  }
}

program.parse();
