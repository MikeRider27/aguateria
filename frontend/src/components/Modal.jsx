const Modal = ({ titulo, onClose, children, ancho = false }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={ancho ? 'modal modal-ancho' : 'modal'} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{titulo}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
