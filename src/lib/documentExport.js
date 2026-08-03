// Real file exports (HTML, CSV, PDF) for content the app previously only
// ever opened in a new tab and left to the browser's own Print dialog to
// turn into a PDF (Document Creator, TherapistDashboard, ClinicalReportBuilder
// all share this same "open a Blob URL" pattern). PDF export renders the
// document into a sandboxed iframe (same technique already used for the
// Advisor Workspace's email preview) so jsPDF/html2canvas see real
// browser-parsed HTML/CSS instead of an innerHTML fragment.
// jsPDF (+ its html2canvas dependency) is dynamically imported inside
// downloadPdfFromHtml rather than at module load — it's a ~400kB addition
// only needed by the "Download PDF" click, not on every Advisor Workspace
// page load.

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadHtmlFile(html, filename) {
  triggerDownload(new Blob([html], { type: 'text/html' }), filename);
}

export function downloadCsvFile(csvContent, filename) {
  triggerDownload(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), filename);
}

export function csvFromRows(headers, rows) {
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export async function downloadPdfFromHtml(html, filename) {
  const { default: jsPDF } = await import('jspdf');
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '800px';
    iframe.style.height = '1px';
    iframe.sandbox = 'allow-same-origin';
    document.body.appendChild(iframe);
    const cleanup = () => { if (iframe.parentNode) document.body.removeChild(iframe); };
    iframe.onload = () => {
      const body = iframe.contentDocument?.body;
      if (!body) { cleanup(); reject(new Error('Unable to render document for export.')); return; }
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      doc.html(body, {
        x: 24, y: 24, width: 550, windowWidth: 800,
        callback: (pdfDoc) => { cleanup(); pdfDoc.save(filename); resolve(); },
      }).catch((error) => { cleanup(); reject(error); });
    };
    iframe.srcdoc = html;
  });
}
