import { renderTable } from "../lib/table.ts";
import type { Bookmark } from "./types.ts";

export type OutputFormat = "table" | "json" | "csv";

export const OUTPUT_FORMATS: readonly OutputFormat[] = ["table", "json", "csv"];

function formatDay(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function formatBookmarks(bookmarks: Bookmark[], format: OutputFormat = "table"): string {
  switch (format) {
    case "json":
      return JSON.stringify(bookmarks, null, 2);
    case "csv":
      return [
        "id,date,url,tags",
        ...bookmarks.map((bookmark) =>
          [bookmark.id, formatDay(bookmark.createdAt), bookmark.url, bookmark.tags.join(" ")].map(csvCell).join(","),
        ),
      ].join("\n");
    case "table":
      if (bookmarks.length === 0) return "No bookmarks.";
      return renderTable(
        ["id", "date", "url", "tags"],
        bookmarks.map((bookmark) => [bookmark.id, formatDay(bookmark.createdAt), bookmark.url, bookmark.tags.join(", ")]),
      );
  }
}
