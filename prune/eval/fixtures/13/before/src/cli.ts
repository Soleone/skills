#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { listNotes } from "./commands/notes.ts";
import { UserError } from "./lib/errors.ts";

const dataDir = process.env.MARKS_DATA ?? join(homedir(), ".marks");

async function main(args: string[]): Promise<string> {
  const [command] = args;
  switch (command) {
    case "notes":
      return listNotes(dataDir);
    default:
      throw new UserError(`Unknown command: ${command ?? "(none)"}`);
  }
}

main(process.argv.slice(2)).then(
  (output) => console.log(output),
  (error) => {
    if (!(error instanceof UserError)) throw error;
    console.error(error.message);
    process.exitCode = 1;
  },
);
