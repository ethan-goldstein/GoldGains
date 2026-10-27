// Rear-camera stream helpers. One stream at a time; always stop it when the scanner closes
// or the app is hidden (iOS keeps the camera indicator on otherwise).

export interface Lens {
  deviceId: string;
  label: string;
}

export async function openCamera(deviceId?: string): Promise<MediaStream> {
  const video: MediaTrackConstraints = deviceId
    ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
    : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } };
  const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
  const track = stream.getVideoTracks()[0];
  // continuous autofocus where the browser exposes it; ignored elsewhere
  try {
    await track?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] });
  } catch {
    /* not supported */
  }
  return stream;
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Back-facing lenses (labels are only available after permission is granted). */
export async function backLenses(): Promise<Lens[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cams = devices.filter((d) => d.kind === 'videoinput');
  const back = cams.filter((d) => /back|rear|environment|camera 0/i.test(d.label));
  return (back.length ? back : cams).map((d, i) => ({ deviceId: d.deviceId, label: lensName(d.label, i) }));
}

function lensName(label: string, i: number): string {
  if (/ultra ?wide/i.test(label)) return 'Ultra Wide';
  if (/telephoto/i.test(label)) return 'Telephoto';
  if (/dual|triple/i.test(label)) return 'Auto';
  if (/back camera$/i.test(label)) return 'Wide';
  return label || `Camera ${i + 1}`;
}

export function torchSupported(stream: MediaStream | null): boolean {
  const track = stream?.getVideoTracks()[0];
  const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
  return !!caps?.torch;
}

export async function setTorch(stream: MediaStream | null, on: boolean): Promise<boolean> {
  const track = stream?.getVideoTracks()[0];
  if (!track) return false;
  try {
    await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
    return true;
  } catch {
    return false;
  }
}

export function cameraErrorMessage(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Camera access is off. On iPhone: Settings → Safari → Camera → Allow, or reopen GoldGains and tap Allow.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No usable camera found on this device.';
  if (name === 'NotReadableError') return 'The camera is busy in another app. Close it and try again.';
  if (!window.isSecureContext) return 'The camera needs a secure (https) page.';
  return 'Couldn’t start the camera.';
}
