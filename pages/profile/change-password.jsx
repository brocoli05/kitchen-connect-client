import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import TopNavBar from "@/components/TopNavBar";
import ProfileLayout from "../../components/ProfileLayout";
import s from "@/styles/profile-edit.module.css";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.googleId) {
          router.replace("/profile/edit");
          return;
        }
        setUser(data);
        setLoading(false);
      })

      .catch(() => router.push("/login"));
  }, [router]);

  if (loading) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const token = localStorage.getItem("userToken");

    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Password update failed");
        setMessageType("error");
        setIsSubmitting(false);
        return;
      }

      setMessage(data.message);
      setMessageType("success");
      setForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setMessage("An error occurred. Please try again.");
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <TopNavBar />
      <ProfileLayout user={user}>
        <div className={s.page}>
          <div className={s.wrap}>
            <section className={s.card}>
              <div className={s.cardHead}>Change Password</div>
              <div className={s.cardBody}>
                {user?.googleId ? (
                  <p style={{ color: "red", fontWeight: "bold" }}>
                    This account uses Google login and does not support password
                    change.
                  </p>
                ) : (
                  <>
                    <form onSubmit={handleSubmit} className={s.form}>
                      <div>
                        <label className={s.label}>Current Password</label>
                        <input
                          type="password"
                          className={s.input}
                          name="currentPassword"
                          value={form.currentPassword}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div>
                        <label className={s.label}>New Password</label>
                        <input
                          type="password"
                          className={s.input}
                          name="newPassword"
                          value={form.newPassword}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className={s.button}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Updating..." : "Change Password"}
                      </button>
                    </form>

                    {message && (
                      <p
                        style={{
                          color: messageType === "success" ? "green" : "red",
                        }}
                      >
                        {message}
                      </p>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </ProfileLayout>
    </>
  );
}
