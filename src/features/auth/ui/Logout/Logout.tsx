import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { logoutUser } from "@entities/user";
import { redirectToMainAppLogin } from "@shared/lib/appUrls";

const Logout = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(logoutUser());
    redirectToMainAppLogin();
  }, [dispatch]);

  return null;
};

export default Logout;
