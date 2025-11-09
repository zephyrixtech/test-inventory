import { setUser } from "@/redux/features/userSlice";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

export default function AuthRedirectPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const userData = params.get("userData");

        if (userData) {
            try {
                const parsed = JSON.parse(decodeURIComponent(userData));

                localStorage.setItem("userData", JSON.stringify(parsed));
                dispatch(setUser(parsed));

                // navigate without query string
                navigate("/dashboard/inventoryManagement", { replace: true });
            } catch (err) {
                console.error("Invalid userData:", err);
                navigate("/");
            }
        } else {
            // Before redirecting to login, check if we already have localStorage data
            const stored = localStorage.getItem("userData");
            if (stored) {
                dispatch(setUser(JSON.parse(stored)));
                navigate("/dashboard/inventoryManagement", { replace: true });
            } else {
                console.log("No user data");
                navigate("/");
            }
        }
    }, []);

    return <></>;
}


