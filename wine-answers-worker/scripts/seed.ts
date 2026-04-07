/**
 * Seed script — populates KV via the Wine Answers Worker HTTP API.
 *
 * Usage:
 *   npx tsx scripts/seed.ts --url http://localhost:1998 --secret dev-secret-123
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { url: string; secret: string } {
  const args = argv.slice(2);
  let url: string | undefined;
  let secret: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) {
      url = args[i + 1];
      i++;
    } else if (args[i] === "--secret" && args[i + 1]) {
      secret = args[i + 1];
      i++;
    }
  }

  if (!url || !secret) {
    console.error(
      "Usage: npx tsx scripts/seed.ts --url <worker-url> --secret <admin-secret>",
    );
    process.exit(1);
  }

  return { url: url.replace(/\/+$/, ""), secret };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface SeedData {
  [category: string]: string[];
}

async function main(): Promise<void> {
  const { url, secret } = parseArgs(process.argv);

  // Read seed-data.json from the repo root (one level up from scripts/)
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const seedPath = resolve(scriptDir, "..", "seed-data.json");
  const seedData: SeedData = JSON.parse(readFileSync(seedPath, "utf-8"));

  const categories = Object.keys(seedData);
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const category of categories) {
    const values = seedData[category];

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const progress = `(${i + 1}/${values.length})`;

      try {
        const res = await fetch(`${url}/answers/${category}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: secret,
          },
          body: JSON.stringify({ value }),
        });

        if (res.status === 201) {
          console.log(`[${category}] Added "${value}" ${progress}`);
          totalAdded++;
        } else if (res.status === 400) {
          const body = (await res.json()) as { error?: string };
          if (body.error?.includes("already exists")) {
            console.log(
              `[${category}] Skipped "${value}" (already exists) ${progress}`,
            );
            totalSkipped++;
          } else {
            console.error(
              `[${category}] Error for "${value}" ${progress}: ${body.error}`,
            );
            totalErrors++;
          }
        } else {
          const text = await res.text();
          console.error(
            `[${category}] HTTP ${res.status} for "${value}" ${progress}: ${text}`,
          );
          totalErrors++;
        }
      } catch (err) {
        console.error(
          `[${category}] Network error for "${value}" ${progress}: ${err}`,
        );
        totalErrors++;
      }
    }
  }

  const totalValues = totalAdded + totalSkipped;
  console.log(
    `\nSeeded ${totalValues} values across ${categories.length} categories`,
  );
  console.log(`  Added: ${totalAdded} | Skipped: ${totalSkipped} | Errors: ${totalErrors}`);

  if (totalErrors > 0) {
    process.exit(1);
  }
}

main();
