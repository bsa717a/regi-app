/**
 * Insert Utah state rules when a non-prod database has none that parse.
 * Does not touch demo users. Refuses database name `regi`.
 * Cloud Build runs this only when the service is not prod `regi`.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { assertNonProdStateRulesDatabase } from "../src/lib/deploy/stateRulesEnsure";
import { parseStateRulesConfig } from "../src/lib/stateEngine/parseConfig";
import { UTAH_STATE_RULES_CONFIG } from "../src/lib/stateEngine/utahConfig";

async function main() {
  const databaseName = assertNonProdStateRulesDatabase(
    process.env.DATABASE_URL ?? "",
  );
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.stateRule.findUnique({
      where: { stateCode: "UT" },
    });
    if (existing?.active && parseStateRulesConfig(existing.config)) {
      console.log(
        `UT state rules already active on ${databaseName}. Leaving them.`,
      );
      return;
    }
    const config = UTAH_STATE_RULES_CONFIG as unknown as Prisma.InputJsonValue;
    await prisma.stateRule.upsert({
      where: { stateCode: "UT" },
      create: { stateCode: "UT", active: true, config },
      update: { active: true, config },
    });
    console.log(`Ensured active UT state rules on ${databaseName}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
