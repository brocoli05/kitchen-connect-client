import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import s from "@/styles/profile-edit.module.css";
import api from "@/utils/api";

export default function ProfileEditPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    username: "",                 
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

  api.get("/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        setForm({
          firstName: data.firstName || "",
          lastName:  data.lastName  || "",
          phone:     data.phone     || "",
          email:     data.email     || "",
          username:  data.username  || "",  
        });
    })
     .catch((err) => {
       if (err?.response?.status === 401) {
      router.push("/login");
      }
     });
  }, [router]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const { username, ...payload } = form;

    const { data } = await api.put("/profile", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setForm(f => ({
      ...f,
      firstName: data.firstName || "",
      lastName:  data.lastName  || "",
      phone:     data.phone     || "",
      email:     data.email     || "",
      username:  data.username  || f.username, 
    }));
    alert("Profile updated!");
  };

  return (
    <div className={s.page}>
      <div className={s.wrap}>
        <section className={s.card}>
          <div className={s.cardHead}>Edit Information</div>
          <div className={s.cardBody}>
            <main>
              <div className={s.profile}>
                <div className={s.avatar}>IMG</div>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {form.username || "Unknown"} <span style={{ color:"#6b7280" }}>(nickname)</span>
                  </div>
                  <div style={{ fontSize:14, color:"#6b7280" }}>
                    @{form.username || "unknown"}          
                  </div>
                </div>
              </div>

              <form onSubmit={onSubmit} className={s.form} aria-label="Edit profile form">
                <div>
                  <label className={s.label}>First name</label>
                  <input className={s.input} name="firstName" value={form.firstName} onChange={onChange} />
                </div>
                <div>
                  <label className={s.label}>Last name</label>
                  <input className={s.input} name="lastName" value={form.lastName} onChange={onChange} />
                </div>
                <div>
                  <label className={s.label}>Phone</label>
                  <input className={s.input} name="phone" value={form.phone} onChange={onChange} />
                </div>
                <div>
                  <label className={s.label}>Email</label>
                  <input type="email" className={s.input} name="email" value={form.email} onChange={onChange} />
                </div>
                <button type="submit" className={s.button}>Update Information</button>
              </form>
            </main>
          </div>
        </section>
        <button className={s.postBtn}>Post</button>
      </div>
    </div>
  );
}
