import { useMemo, useRef } from 'react';
import { Printer, ExternalLink } from 'lucide-react';

export default function ClinicalReportPreview({ html, title = 'Clinical report preview' }) {
  const iframeRef = useRef(null);
  const hasPreview = Boolean(html);

  const previewDocument = useMemo(() => html || '<p>No report generated yet.</p>', [html]);

  const printPreview = () => {
    const frame = iframeRef.current;
    if (frame?.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    }
  };

  const openPreview = () => {
    if (!html) return;
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="rounded-3xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <style>{`
        @media print {
          .no-print {
            display: none;
          }

          .report-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
      <div className="no-print flex flex-col gap-3 border-b border-brand-stone-200 dark:border-slate-700 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">Report Preview</h2>
          <p className="text-sm text-brand-stone-600 dark:text-slate-400">Preview the print-friendly HTML report before saving as PDF from your browser print dialog.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openPreview}
            disabled={!hasPreview}
            className="inline-flex items-center gap-2 rounded-full border border-brand-stone-300 px-4 py-2 text-sm font-medium text-brand-stone-700 transition hover:bg-brand-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ExternalLink className="h-4 w-4" />
            Open
          </button>
          <button
            type="button"
            onClick={printPreview}
            disabled={!hasPreview}
            className="inline-flex items-center gap-2 rounded-full bg-brand-gold-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-gold-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Print / Export PDF
          </button>
        </div>
      </div>

      {hasPreview ? (
        <iframe
          ref={iframeRef}
          title={title}
          srcDoc={previewDocument}
          className="h-[760px] w-full bg-white"
          sandbox="allow-modals allow-same-origin allow-scripts"
        />
      ) : (
        <div className="flex min-h-[360px] items-center justify-center bg-brand-stone-50 p-10 text-center dark:bg-slate-950/40">
          <div>
            <p className="text-lg font-medium text-brand-stone-900 dark:text-slate-100">No preview yet</p>
            <p className="mt-2 max-w-md text-sm text-brand-stone-600 dark:text-slate-400">Choose an assigned client, select report sections, and generate a preview. Audit metadata is saved automatically only after server-side authorization succeeds.</p>
          </div>
        </div>
      )}
    </div>
  );
}
