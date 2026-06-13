'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body style={{ padding: 32, fontFamily: 'monospace', margin: 0 }}>
        <h1 style={{ color: 'red' }}>Error capturado</h1>
        <p><b>{String(error?.message ?? 'Sin mensaje')}</b></p>
        <p>Digest: {String(error?.digest ?? 'N/A')}</p>
        <pre style={{ background: '#eee', padding: 16, fontSize: 11, overflow: 'auto' }}>
          {String(error?.stack ?? '')}
        </pre>
      </body>
    </html>
  );
}
