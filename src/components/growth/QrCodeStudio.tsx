import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { QrCode, Download, Smartphone, Sliders, Check } from 'lucide-react';
import { ProductIllustration } from '../illustration/ProductIllustration';
import QRCode from 'qrcode';

export const QrCodeStudio: React.FC = () => {
  const { activeProfile, updateDraftProfile, trackEvent, showToast } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [fgColor, setFgColor] = useState(activeProfile.qrConfig.fgColor || '#ffffff');
  const [bgColor, setBgColor] = useState(activeProfile.qrConfig.bgColor || '#09090b');
  const [pattern, setPattern] = useState<'dots' | 'square' | 'rounded'>(activeProfile.qrConfig.pattern || 'dots');
  const [targetUrl, setTargetUrl] = useState(activeProfile.qrConfig.dynamicTargetUrl || `https://lynkflow.me/${activeProfile.username}`);
  const [scannedMessage, setScannedMessage] = useState(false);

  useEffect(() => {
    setFgColor(activeProfile.qrConfig.fgColor || '#ffffff');
    setBgColor(activeProfile.qrConfig.bgColor || '#09090b');
    setPattern(activeProfile.qrConfig.pattern || 'dots');
    setTargetUrl(activeProfile.qrConfig.dynamicTargetUrl || `https://lynkflow.me/${activeProfile.username}`);
  }, [activeProfile.id]);

  // Render a real, scannable QR matrix onto Canvas. The previous implementation
  // was a decorative pseudo-pattern and could not be scanned by a phone.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !targetUrl.trim()) return;

    const size = 320;
    const quietZone = 4;
    const qr = QRCode.create(targetUrl.trim(), { errorCorrectionLevel: 'H' });
    const moduleCount = qr.modules.size;
    const cellSize = size / (moduleCount + quietZone * 2);
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = fgColor;

    const inFinder = (row: number, col: number) =>
      (row < 8 && col < 8) ||
      (row < 8 && col >= moduleCount - 8) ||
      (row >= moduleCount - 8 && col < 8);

    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        if (!qr.modules.get(row, col)) continue;
        const x = (col + quietZone) * cellSize;
        const y = (row + quietZone) * cellSize;
        const inset = inFinder(row, col) || pattern === 'square' ? 0 : cellSize * 0.08;
        if (pattern === 'dots' && !inFinder(row, col)) {
          ctx.beginPath();
          ctx.arc(x + cellSize / 2, y + cellSize / 2, Math.max(1, cellSize * 0.42), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.roundRect(x + inset, y + inset, cellSize - inset * 2, cellSize - inset * 2, pattern === 'rounded' && !inFinder(row, col) ? cellSize * 0.22 : 0);
          ctx.fill();
        }
      }
    }
  }, [fgColor, bgColor, pattern, targetUrl]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `qrcode_${activeProfile.username}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('High-resolution QR code downloaded');
  };

  const handleSimulateScan = () => {
    trackEvent({
      profileId: activeProfile.id,
      type: 'qr_scan',
      referrer: 'Physical QR Scan (Simulator)',
      country: 'United States',
      device: 'mobile'
    });
    setScannedMessage(true);
    showToast('Scan registered in analytics!');
    setTimeout(() => setScannedMessage(false), 3000);
  };

  const handleSaveConfig = () => {
    updateDraftProfile(prev => ({
      ...prev,
      qrConfig: {
        fgColor,
        bgColor,
        pattern,
        showLogo: true,
        dynamicTargetUrl: targetUrl
      }
    }));
    showToast('QR code configuration saved');
  };

  return (
    <div className="studio-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h2 className="text-lg font-bold text-ink tracking-tight flex items-center gap-2">
            <QrCode className="w-5 h-5 text-accent" />
            <span>Dynamic QR Code Studio</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Retarget where your QR code redirects without reprinting merchandise, business cards, or packaging.
          </p>
        </div>

        <div className="max-w-sm rounded-2xl border border-amber-500/15 bg-amber-500/5 p-2">
          <ProductIllustration variant="route" />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="px-3.5 py-1.5 text-xs font-semibold text-inverse-text bg-inverse hover:bg-inverse-hover rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left: Interactive Canvas Card */}
        <div className="p-6 rounded-2xl bg-surface border border-line flex flex-col items-center text-center">
          <div className="p-3 rounded-2xl bg-black/40 border border-line shadow-xl mb-4">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`QR code linking to ${targetUrl}`}
              className="rounded-xl w-[260px] h-[260px] sm:w-[280px] sm:h-[280px]"
            >
              QR code linking to {targetUrl}
            </canvas>
          </div>

          <span className="text-xs font-mono text-muted truncate max-w-xs mb-3">
            {targetUrl}
          </span>

          <div className="flex items-center gap-2 w-full max-w-xs">
            <button
              onClick={handleSimulateScan}
              className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl bg-surface-2 hover:bg-surface-3 text-ink transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-accent" />
              <span>{scannedMessage ? 'Scan Recorded!' : 'Test Scan Simulator'}</span>
            </button>
          </div>
          <span className="text-[10px] text-subtle mt-2">
            Simulating a scan logs a real `qr_scan` event to your Analytics Dashboard.
          </span>
        </div>

        {/* Right: Customization Controls */}
        <div className="p-6 rounded-2xl bg-surface border border-line space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-line">
            <Sliders className="w-4 h-4 text-muted" />
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
              Customizer & Retargeting
            </h3>
          </div>

          {/* Dynamic Destination */}
          <div>
            <label className="block text-xs font-medium text-body mb-1">
              Dynamic Destination URL
            </label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink font-mono focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-subtle mt-1">
              Change this at any time! Printed physical QR codes will immediately resolve to this new URL.
            </p>
          </div>

          {/* Pattern */}
          <div>
            <label className="block text-xs font-medium text-body mb-1.5">
              Code Pattern Geometry
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['dots', 'rounded', 'square'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPattern(p)}
                  aria-pressed={pattern === p}
                  className={`py-2 px-3 text-xs font-medium rounded-xl capitalize transition-colors cursor-pointer ${
                    pattern === p
                      ? 'bg-surface-2 text-ink border border-indigo-500/50'
                      : 'bg-canvas text-muted border border-line hover:text-ink'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-body mb-1.5">Pattern Foreground</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-line-strong bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-24 px-2 py-1 text-xs rounded bg-canvas border border-line text-ink font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-body mb-1.5">Background</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-line-strong bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-24 px-2 py-1 text-xs rounded bg-canvas border border-line text-ink font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveConfig}
              className="w-full py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save QR Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
