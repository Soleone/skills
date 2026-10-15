#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { addBookmark, listBookmarks, removeBookmark } from "./bookmarks/commands.ts";
import { openRepository } from "./bookmarks/repository.ts";
import { listNotes } from "./commands/notes.ts";
import { UserError } from "./lib/errors.ts";

const dataDir = process.env.MARKS_DATA ?? join(homedir(), ".marks");

async function main(args: string[]): Promise<string> {
  const [command, ...rest] = args;
  const context = { repository: openRepository(dataDir), now: () => new Date() };
  switch (command) {
    case "notes":
      return listNotes(dataDir);
    case "add":
      return addBookmark(context, rest);
    case "list":
      return listBookmarks(context, rest);
    case "remove":
      return removeBookmark(context, rest);
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
