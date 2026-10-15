import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { renderTable } from "../lib/table.ts";
import { formatDate } from "../lib/dates.ts";

interface Note { text: string; createdAt: string }

export async function listNotes(dataDir: string): Promise<string> {
  const notes: Note[] = JSON.parse(await readFile(join(dataDir, "notes.json"), "utf8"));
  return renderTable(["date", "note"], notes.map((note) => [formatDate(new Date(note.createdAt)), note.text]));
}
