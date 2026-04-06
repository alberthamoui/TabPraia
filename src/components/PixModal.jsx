import { useEffect, useState } from 'react'

const fmt = (v) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

export default function PixModal({ valor, onConfirmar, onCancelar }) {
  const [qr, setQr] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    window.api['pix_gerarQR']({ valor }).then((res) => {
      if (res.ok) setQr(res.data)
      else setErro(res.error)
    })
  }, [valor])

  return (
    <div className="modal-overlay">
      <div className="modal pix-modal">
        <h2>Pagamento via PIX</h2>
        <p className="pix-valor">{fmt(valor)}</p>

        {!qr && !erro && <p className="pix-loading">Gerando QR code…</p>}

        {erro && (
          <div className="pix-erro">
            <p>{erro}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onCancelar}>Fechar</button>
            </div>
          </div>
        )}

        {qr && (
          <>
            <div className="pix-qr-wrap">
              <img src={qr.dataUrl} alt="QR Code PIX" className="pix-qr" />
            </div>
            <p className="pix-hint">Mostre ao cliente para escanear</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onCancelar}>Cancelar</button>
              <button className="btn btn-success" onClick={onConfirmar}>
                Confirmar Recebimento
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
