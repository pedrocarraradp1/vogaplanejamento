"use client"

export function CapaParecer({
  cliente,
  assessor,
  data,
}: {
  cliente: string
  assessor: string
  data: string
}) {
  return (
    <aside className="consultoria-navy consultoria-capa-a4">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-voga.png" alt="Voga" width={92} height={28} />
        <p className="consultoria-rotulo" style={{ marginTop: 36 }}>
          Parecer
        </p>
        <p className="consultoria-h2" style={{ color: "#fff", marginTop: 8 }}>
          Consultoria sucessória e fiscal
        </p>
      </div>
      <div className="consultoria-corpo" style={{ color: "#fff" }}>
        <p>{cliente}</p>
        <p style={{ color: "var(--consultoria-acento)", marginTop: 8 }}>Preparado por {assessor}</p>
        <p style={{ color: "var(--consultoria-acento)" }}>{data}</p>
      </div>
    </aside>
  )
}
