export default function Modal({ titulo, mensagem, onConfirmar, onCancelar }) {
  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        <p>{mensagem}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancelar}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirmar}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}
