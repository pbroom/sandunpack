#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const fixturesRoot = path.join(repoRoot, "fixtures");
const vendorRoot = path.join(repoRoot, "vendor", "sandpack");

function relativeToRepo(targetPath) {
  const relativePath = path.relative(repoRoot, targetPath);
  return relativePath === "" ? "." : relativePath;
}

function isWithinPath(targetPath, rootPath) {
  const relativePath = path.relative(rootPath, targetPath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function getFixtureArg() {
  const fixtureIndex = process.argv.indexOf("--fixture");
  if (fixtureIndex === -1) {
    return null;
  }

  const fixtureArg = process.argv[fixtureIndex + 1];
  if (!fixtureArg) {
    throw new Error("--fixture requires a path");
  }

  return path.resolve(process.cwd(), fixtureArg);
}

async function getFixtureDirectories() {
  const fixtureArg = getFixtureArg();
  if (fixtureArg) {
    return [fixtureArg];
  }

  const entries = await fs.readdir(fixturesRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(fixturesRoot, entry.name))
    .sort();
}

async function readJson(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function getRealpath(targetPath) {
  try {
    return await fs.realpath(targetPath);
  } catch (error) {
    return null;
  }
}

async function validateVendorRoot(errors) {
  try {
    const stats = await fs.lstat(vendorRoot);
    if (stats.isSymbolicLink()) {
      errors.push(
        `${relativeToRepo(vendorRoot)} is a symlink, so fixture installs can still resolve to a different checkout`
      );
    }
  } catch (error) {
    errors.push(`${relativeToRepo(vendorRoot)} does not exist`);
  }
}

async function validateFixtureLinks(fixtureDir, errors) {
  const manifestPath = path.join(fixtureDir, "package.json");
  const manifest = await readJson(manifestPath);
  const dependencySections = [
    manifest.dependencies ?? {},
    manifest.devDependencies ?? {},
    manifest.optionalDependencies ?? {},
  ];

  const linkEntries = dependencySections.flatMap((section) =>
    Object.entries(section).filter(([, specifier]) => typeof specifier === "string" && specifier.startsWith("link:"))
  );

  let checkedLinks = 0;

  for (const [packageName, specifier] of linkEntries) {
    checkedLinks += 1;

    const expectedPath = path.resolve(fixtureDir, specifier.slice("link:".length));
    const installedPath = path.join(fixtureDir, "node_modules", ...packageName.split("/"));
    const fixtureLabel = relativeToRepo(fixtureDir);

    if (!isWithinPath(expectedPath, vendorRoot)) {
      errors.push(
        `${fixtureLabel} manifest points ${packageName} at ${relativeToRepo(expectedPath)} instead of vendor/sandpack`
      );
      continue;
    }

    let installedStats;
    try {
      installedStats = await fs.lstat(installedPath);
    } catch (error) {
      errors.push(`${fixtureLabel} is missing installed link ${relativeToRepo(installedPath)}; run pnpm install`);
      continue;
    }

    if (installedStats.isSymbolicLink()) {
      const linkTarget = await fs.readlink(installedPath);
      const resolvedLinkTarget = path.resolve(path.dirname(installedPath), linkTarget);

      if (resolvedLinkTarget !== expectedPath) {
        errors.push(
          `${fixtureLabel} installs ${packageName} from ${relativeToRepo(resolvedLinkTarget)} instead of ${relativeToRepo(expectedPath)}`
        );
      }
    }

    const expectedRealpath = await getRealpath(expectedPath);
    if (!expectedRealpath) {
      errors.push(`${fixtureLabel} manifest target for ${packageName} does not exist: ${relativeToRepo(expectedPath)}`);
      continue;
    }

    const installedRealpath = await getRealpath(installedPath);
    if (!installedRealpath) {
      errors.push(`${fixtureLabel} installed path for ${packageName} is broken: ${relativeToRepo(installedPath)}`);
      continue;
    }

    if (!isWithinPath(expectedRealpath, vendorRoot)) {
      errors.push(
        `${fixtureLabel} manifest target for ${packageName} resolves outside vendor/sandpack: ${expectedRealpath}`
      );
    }

    if (!isWithinPath(installedRealpath, vendorRoot)) {
      errors.push(
        `${fixtureLabel} installed ${packageName} resolves outside vendor/sandpack: ${installedRealpath}`
      );
    }

    if (installedRealpath !== expectedRealpath) {
      errors.push(
        `${fixtureLabel} installed ${packageName} resolves to ${installedRealpath} instead of ${expectedRealpath}`
      );
    }
  }

  return checkedLinks;
}

async function main() {
  const errors = [];
  const fixtureDirectories = await getFixtureDirectories();

  await validateVendorRoot(errors);

  let checkedLinks = 0;
  for (const fixtureDir of fixtureDirectories) {
    checkedLinks += await validateFixtureLinks(fixtureDir, errors);
  }

  if (errors.length > 0) {
    console.error("Fixture link verification failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    console.error("");
    console.error(
      "Reinstall fixture dependencies after removing stale links, and keep vendor/sandpack as a real directory inside this repo."
    );
    process.exit(1);
  }

  console.log(
    `Verified ${checkedLinks} linked packages across ${fixtureDirectories.length} fixture(s); all installed paths resolve inside ${relativeToRepo(vendorRoot)}.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
