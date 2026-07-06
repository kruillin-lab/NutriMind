"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Database, RefreshCw, Save, Trash2 } from "lucide-react";

interface DbTable {
  key: string;
  label: string;
  count: number;
}

interface DbField {
  name: string;
  label: string;
  type: "string" | "float" | "int" | "boolean" | "date" | "enum";
  nullable?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  options?: string[];
}

type DbRecord = Record<string, unknown> & { id: string };

interface DatabaseResponse {
  tables: DbTable[];
  activeTable: string;
  fields: DbField[];
  rows: DbRecord[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 50;

interface LoadTableOptions {
  clearMessage?: boolean;
  resetSelection?: boolean;
}

function formatCell(value: unknown) {
  if (value == null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") {
    if (value.length > 80) return `${value.slice(0, 80)}...`;
    return value;
  }
  return String(value);
}

function stringifyRecord(record: DbRecord) {
  return JSON.stringify(record, null, 2);
}

export function DatabaseClient() {
  const [tables, setTables] = useState<DbTable[]>([]);
  const [activeTable, setActiveTable] = useState("users");
  const [fields, setFields] = useState<DbField[]>([]);
  const [rows, setRows] = useState<DbRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<DbRecord | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const visibleFields = useMemo(
    () => fields.filter((field) => !field.hidden).slice(0, 8),
    [fields]
  );

  const activeLabel = tables.find((table) => table.key === activeTable)?.label ?? activeTable;

  const loadTable = useCallback(async (
    table: string,
    nextOffset = offset,
    options: LoadTableOptions = {}
  ) => {
    const { clearMessage = true, resetSelection = true } = options;
    setIsLoading(true);
    setError(null);
    if (clearMessage) setMessage(null);

    try {
      const response = await fetch(
        `/api/database?table=${encodeURIComponent(table)}&limit=${PAGE_SIZE}&offset=${nextOffset}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load database");
      }

      const payload = data as DatabaseResponse;
      setTables(payload.tables);
      setActiveTable(payload.activeTable);
      setFields(payload.fields);
      setRows(payload.rows);
      setTotal(payload.total);
      setOffset(payload.offset);
      if (resetSelection) {
        setSelectedRecord(null);
        setDraft("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load database");
    } finally {
      setIsLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    loadTable(activeTable, 0);
    // Run only once on mount; table changes are handled explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTable = (table: string) => {
    setActiveTable(table);
    setOffset(0);
    loadTable(table, 0);
  };

  const selectRecord = (record: DbRecord) => {
    setSelectedRecord(record);
    setDraft(stringifyRecord(record));
    setMessage(null);
    setError(null);
  };

  const saveRecord = async () => {
    if (!selectedRecord) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const parsed = JSON.parse(draft) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Record JSON must be an object");
      }

      const response = await fetch("/api/database", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: activeTable,
          id: selectedRecord.id,
          data: parsed as Record<string, unknown>,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save record");
      }

      setSelectedRecord(data.record);
      setDraft(stringifyRecord(data.record));
      setMessage("Record saved.");
      await loadTable(activeTable, offset, { clearMessage: false, resetSelection: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save record");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRecord = async () => {
    if (!selectedRecord) return;
    if (!confirm(`Delete ${activeLabel} record ${selectedRecord.id}? This cannot be undone.`)) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/database?table=${encodeURIComponent(activeTable)}&id=${encodeURIComponent(selectedRecord.id)}`,
        { method: "DELETE" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete record");
      }

      setSelectedRecord(null);
      setDraft("");
      setMessage("Record deleted.");
      await loadTable(activeTable, offset, { clearMessage: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete record");
    } finally {
      setIsSaving(false);
    }
  };

  const previousPage = () => {
    const nextOffset = Math.max(0, offset - PAGE_SIZE);
    loadTable(activeTable, nextOffset);
  };

  const nextPage = () => {
    const nextOffset = offset + PAGE_SIZE;
    if (nextOffset >= total) return;
    loadTable(activeTable, nextOffset);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="surface overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tables
            </span>
          </div>
        </div>
        <div className="max-h-[620px] overflow-y-auto p-2">
          {tables.map((table) => (
            <button
              key={table.key}
              onClick={() => selectTable(table.key)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                table.key === activeTable
                  ? "border border-border bg-secondary font-medium text-foreground"
                  : "border border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              <span>{table.label}</span>
              <span className="num rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {table.count}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="space-y-4">
        <div className="surface overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {activeLabel}
              </p>
              <p className="num mt-1 text-sm text-muted-foreground">
                Showing {rows.length} of {total} records
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadTable(activeTable, offset)}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={previousPage}
                disabled={offset === 0 || isLoading}
                className="rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={nextPage}
                disabled={offset + PAGE_SIZE >= total || isLoading}
                className="rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>

          {error && (
            <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="mx-5 mt-4 rounded-lg border border-chart-2/30 bg-chart-2/10 p-3 text-sm font-medium text-foreground">
              {message}
            </div>
          )}

          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr>
                  {visibleFields.map((field) => (
                    <th key={field.name} className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-muted-foreground" colSpan={visibleFields.length}>
                      Loading records...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-muted-foreground" colSpan={visibleFields.length}>
                      No records in this table.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => selectRecord(row)}
                      className={`cursor-pointer ${
                        selectedRecord?.id === row.id ? "outline outline-2 outline-ring" : ""
                      }`}
                    >
                      {visibleFields.map((field) => (
                        <td
                          key={field.name}
                          className="max-w-[240px] truncate border-y border-border bg-secondary/50 px-3 py-3 text-foreground transition-colors first:rounded-l-lg first:border-l last:rounded-r-lg last:border-r"
                          title={formatCell(row[field.name])}
                        >
                          {formatCell(row[field.name])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Record Editor
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Edit JSON, then save. Read-only fields like id and timestamps are ignored on save.
            </p>
          </div>
          <div className="space-y-3 p-5">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!selectedRecord}
              spellCheck={false}
              className="min-h-[320px] w-full resize-y rounded-lg border border-input bg-background p-4 font-mono text-xs leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Select a row to edit its JSON."
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={deleteRecord}
                disabled={!selectedRecord || isSaving}
                className="flex items-center gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              <button
                onClick={saveRecord}
                disabled={!selectedRecord || isSaving}
                className="btn-primary gap-2 disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save record"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
