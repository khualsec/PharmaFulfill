import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const API_BASE = "http://localhost:5000";

type Status = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("Verifying your email...");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/verify/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setMessage(data?.error || "Verification failed.");
        } else {
          setStatus("success");
          setMessage(data?.message || "Your email has been verified!");
        }
      } catch (err) {
        console.error("Verify error:", err);
        setStatus("error");
        setMessage("Unable to reach server.");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full bg-white shadow-md rounded-xl p-8 text-center">
        <h1 className="text-2xl font-semibold mb-4">
          {status === "loading" && "Verifying Email"}
          {status === "success" && "Email Verified"}
          {status === "error" && "Verification Error"}
        </h1>
        <p className="mb-6 text-slate-600">{message}</p>

        {status !== "loading" && (
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 rounded-md border border-transparent text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Go to Login
          </Link>
        )}
      </div>
    </div>
  );
}
