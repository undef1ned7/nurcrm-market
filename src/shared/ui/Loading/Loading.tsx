import ReactPortal from "@shared/ui/Portal/ReactPortal";
import "./Loading.scss";

const Loading = ({ message = "Загрузка..." }) => {
  return (
    <ReactPortal wrapperId="global-loading">
      <div className="loading" role="status" aria-live="polite" aria-busy="true">
        <div className="loading__spinner" />
        <p className="loading__message">{message}</p>
      </div>
    </ReactPortal>
  );
};

export default Loading;
