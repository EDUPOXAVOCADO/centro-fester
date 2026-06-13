'use client';

export default function Error({ error }: { error: Error }) {
  return (
    <div style={{ padding: 32, fontFamily: 'monospace', maxWidth: 900 }}>
      <h1 style={{ color: 'red', marginBottom: 8 }}>Error detectado</h1>
      <p style={{ fontWeight: 'bold', fontSize: 18 }}>{error.message}</p>
      <pre style={{ background: '#f1f1f1', padding: 16, overflow: 'auto', fontSize: 11, marginTop: 16 }}>
        {error.stack}
      </pre>
    </div>
  );
}
