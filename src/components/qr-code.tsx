"use client";

import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, Check, Printer, X, Sparkles } from "lucide-react";
import { useState, useRef } from "react";

interface QRCodeDisplayProps {
  url: string;
  kodeUnik: string;
  namaKosan: string;
  alamatKosan?: string;
}

export function QRCodeDisplay({
  url,
  kodeUnik,
  namaKosan,
  alamatKosan,
}: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `qr-${namaKosan.toLowerCase().replace(/\s+/g, "-")}.png`;
      downloadLink.href = pngUrl;
      downloadLink.click();
    };

    img.src =
      "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrintPoster = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Harap izinkan popup browser untuk mencetak poster.");
      return;
    }

    const posterContent = posterRef.current?.innerHTML || "";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Poster QR Code - ${namaKosan}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              @page {
                size: A4 portrait;
                margin: 1.5cm;
              }
            }
          </style>
        </head>
        <body class="bg-white text-gray-900 flex items-center justify-center min-h-screen p-4">
          <div class="w-full max-w-lg mx-auto">
            ${posterContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-heading text-lg font-semibold text-gray-900">
              QR Code Form Pendataan
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              1 QR Code untuk seluruh kamar di kosan ini
            </p>
          </div>
          <span className="badge badge-info">1 Kosan 1 QR</span>
        </div>

        {/* QR Code */}
        <div
          ref={qrRef}
          className="mt-4 flex items-center justify-center rounded-xl bg-white p-6 border border-gray-100 shadow-inner"
        >
          <QRCodeSVG
            value={url}
            size={200}
            bgColor="#ffffff"
            fgColor="#115e59"
            level="H"
            includeMargin
          />
        </div>

        {/* Link */}
        <div className="mt-4">
          <label className="text-xs font-medium text-gray-500">Link Form Pendataan</label>
          <div className="mt-1 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
            <span className="flex-1 truncate text-xs font-mono text-gray-700">{url}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={handleCopy} className="btn-secondary text-xs py-2">
            {copied ? (
              <span className="flex items-center justify-center gap-1.5 text-emerald-600">
                <Check className="h-4 w-4" /> Tersalin!
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <Copy className="h-4 w-4" /> Salin Link
              </span>
            )}
          </button>
          <button onClick={handleDownload} className="btn-secondary text-xs py-2">
            <span className="flex items-center justify-center gap-1.5">
              <Download className="h-4 w-4" /> Unduh PNG
            </span>
          </button>
        </div>

        {/* Print Poster Button */}
        <button
          onClick={() => setShowPosterModal(true)}
          className="btn-primary mt-2 w-full text-xs py-2.5 font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
        >
          <span className="flex items-center justify-center gap-2">
            <Printer className="h-4 w-4" /> Cetak Poster Siap Tempel
          </span>
        </button>
      </div>

      {/* Poster Print Preview Modal */}
      {showPosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-gray-900">
                  Pratinjau Poster QR Code
                </h3>
                <p className="text-xs text-gray-500">
                  Template poster resmi untuk dicetak dan ditempel di kosan
                </p>
              </div>
              <button
                onClick={() => setShowPosterModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Poster Printable Container */}
            <div className="my-6 flex justify-center">
              <div
                ref={posterRef}
                className="w-full rounded-2xl border-4 border-dashed border-teal-600 bg-white p-6 text-center shadow-md sm:p-8"
              >
                {/* Header Kop */}
                <div className="flex items-center justify-center gap-3 border-b-2 border-teal-600 pb-4">
                  <img
                    src="/favicon.png"
                    alt="Logo SIKOSAN"
                    className="h-12 w-12 rounded-xl object-contain shadow-sm"
                  />
                  <div className="text-left">
                    <h4 className="font-heading text-lg font-extrabold tracking-wide text-teal-800">
                      SIKOSAN
                    </h4>
                    <p className="text-xs font-semibold uppercase text-teal-600">
                      Kelurahan Akehuda &bull; Kota Ternate
                    </p>
                  </div>
                </div>

                {/* Title */}
                <div className="my-4">
                  <span className="inline-block rounded-full bg-teal-100 px-4 py-1 text-xs font-bold uppercase tracking-wider text-teal-800">
                    Formulir Pendataan Penghuni Kos
                  </span>
                  <h3 className="mt-3 font-heading text-2xl font-black text-gray-900">
                    {namaKosan}
                  </h3>
                  {alamatKosan && (
                    <p className="mt-1 text-xs text-gray-600">{alamatKosan}</p>
                  )}
                </div>

                {/* Big QR Code */}
                <div className="my-4 flex items-center justify-center">
                  <div className="rounded-2xl border-2 border-teal-600 bg-white p-4 shadow-md">
                    <QRCodeSVG
                      value={url}
                      size={220}
                      bgColor="#ffffff"
                      fgColor="#115e59"
                      level="H"
                      includeMargin
                    />
                  </div>
                </div>

                {/* Step instructions */}
                <div className="mt-4 rounded-xl bg-teal-50 p-4 text-left border border-teal-200">
                  <p className="text-xs font-bold text-teal-900 mb-2">
                    📋 Petunjuk Pengisian untuk Penghuni Baru:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-teal-800">
                    <li>Buka kamera HP atau aplikasi scanner, arahkan ke QR Code di atas.</li>
                    <li>Klik tautan form yang muncul dan <strong>masukkan nomor kamar Anda</strong>.</li>
                    <li>Isi data diri lengkap dan simpan. Data otomatis terdaftar di kelurahan.</li>
                  </ol>
                </div>

                <div className="mt-4 border-t border-gray-200 pt-3">
                  <p className="text-[11px] text-gray-400 font-mono">
                    Kode Unik: {kodeUnik} &bull; Sistem Informasi Kosan Kelurahan Akehuda
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <button
                onClick={() => setShowPosterModal(false)}
                className="btn-ghost flex-1 text-sm"
              >
                Tutup
              </button>
              <button
                onClick={handlePrintPoster}
                className="btn-primary flex-1 text-sm bg-teal-600 hover:bg-teal-700"
              >
                <Printer className="mr-2 h-4 w-4" /> Cetak / Simpan PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
