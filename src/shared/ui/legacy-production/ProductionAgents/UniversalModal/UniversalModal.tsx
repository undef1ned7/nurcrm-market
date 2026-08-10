import { X } from "lucide-react";
import { useEffect } from "react";
import "./universalModal.scss";

const UniversalModal = ({ children, onClose, title, className = '' }: any) => {
  useEffect(() => {
    const handleEsc = (event: any) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className={"universalModal " + className}>
      <div className="backdrop" onClick={onClose} />
      <div className="universalModal__content">
        <div className="universalModal__content-header">
          <h2>{title}</h2>
          <button onClick={onClose}>
            <X size={25} />
          </button>
        </div>
        <div className="universalModal__content-body">{children}</div>
      </div>
    </div>
  );
};

export default UniversalModal;
