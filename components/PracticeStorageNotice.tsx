export default function PracticeStorageNotice({
  unavailable,
  canExport = false,
}: {
  unavailable: boolean;
  canExport?: boolean;
}) {
  if (!unavailable) return null;
  return (
    <p role="status" className="mb-6 rounded-2xl border border-violet/25 bg-violet-soft/10 p-4 text-sm text-ink/80">
      Browser saving is unavailable. Keep this tab open to keep working.
      {canExport ? " Export your log before closing it to keep a backup." : " Changes may be lost when you close or reload the page."}
    </p>
  );
}
