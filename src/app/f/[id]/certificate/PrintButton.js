'use client';

export default function PrintButton() {
  return (
    <button
      className="print-btn"
      onClick={() => window.print()}
    >
      Save as PDF / Print
    </button>
  );
}
