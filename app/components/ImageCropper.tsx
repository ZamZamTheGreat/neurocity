"use client";

import { useEffect, useMemo, useState } from "react";

export default function ImageCropper({ file, aspect, width, title, onCancel, onApply }: { file: File; aspect: number; width: number; title: string; onCancel: () => void; onApply: (file: File) => void | boolean | Promise<void | boolean> }) {
  const source = useMemo(() => URL.createObjectURL(file), [file]);
  const [zoom, setZoom] = useState(1);
  const [horizontal, setHorizontal] = useState(50);
  const [vertical, setVertical] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => URL.revokeObjectURL(source), [source]);
  async function apply() {
    setBusy(true);
    setError("");
    try {
      const image = await createImageBitmap(file);
      let cropWidth = image.width, cropHeight = cropWidth / aspect;
      if (cropHeight > image.height) { cropHeight = image.height; cropWidth = cropHeight * aspect; }
      cropWidth /= zoom; cropHeight /= zoom;
      const sx = (image.width - cropWidth) * horizontal / 100;
      const sy = (image.height - cropHeight) * vertical / 100;
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = Math.round(width / aspect);
      canvas.getContext("2d")!.drawImage(image, sx, sy, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
      image.close();
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Image processing failed.")), "image/jpeg", .9));
      const applied = await onApply(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
      if (applied === false) throw new Error("The image could not be uploaded. Check your connection and try again.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This image could not be prepared. Try another file.");
    } finally { setBusy(false); }
  }
  return <div className="image-editor-backdrop" role="dialog" aria-modal="true" aria-label={title}>
    <section className="image-editor-panel">
      <header><div><small>IMAGE EDITOR</small><h3>{title}</h3><p>Drag the controls until the important part of the image sits inside the frame.</p></div><button onClick={onCancel} aria-label="Close image editor">×</button></header>
      <div className="image-crop-preview" style={{ aspectRatio: String(aspect) }}><img src={source} alt="Crop preview" style={{ transform: `scale(${zoom})`, transformOrigin: `${horizontal}% ${vertical}%` }} /></div>
      <div className="image-editor-controls">
        <label>Zoom <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
        <label>Move left / right <input type="range" min="0" max="100" value={horizontal} onChange={(event) => setHorizontal(Number(event.target.value))} /></label>
        <label>Move up / down <input type="range" min="0" max="100" value={vertical} onChange={(event) => setVertical(Number(event.target.value))} /></label>
      </div>
      <div className="image-output-note"><b>Export size</b><span>{width} × {Math.round(width / aspect)} px · optimised JPG</span></div>
      {error && <p className="image-editor-error" role="alert">{error}</p>}
      <footer><button className="secondary" onClick={onCancel}>Cancel</button><button disabled={busy} onClick={() => void apply()}>{busy ? "Preparing…" : "Use image"}</button></footer>
    </section>
  </div>;
}
