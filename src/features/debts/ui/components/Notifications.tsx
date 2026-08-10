export const Notifications = ({ notifications }) => {
  if (!notifications?.length) return null;

  return (
    <div className="debts-page__notifications">
      {notifications.map((notification, index) => (
        <div
          key={index}
          className={`debts-page__alert debts-page__alert--${
            notification.type === "error" ? "danger" : "warning"
          }`}
        >
          {notification.message}
        </div>
      ))}
    </div>
  );
};
