"use client";
import { useState } from "react";
import s from "./profile-edit.module.css";

export default function ProfileEditPage() {
  const [form, setForm] = useState({
    firstName: "Evelyn",
    lastName: "Kim",
    phone: "+1 123-4567",
    email: "etersh810@gmail.com",
  });
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onSubmit = (e) => { e.preventDefault(); alert("UI only — API next sprint"); };

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
                  <div style={{fontWeight:600}}>
                    boba lover <span style={{color:"#6b7280"}}>(nickname)</span>
                  </div>
                  <div style={{fontSize:14, color:"#6b7280"}}>@blackmilktea</div>
                </div>
              </div>

              <form onSubmit={onSubmit} className={s.form} aria-label="Edit profile form">
                <div>
                  <label className={s.label}>First name</label>
                  <input
                    className={s.input}
                    name="firstName"
                    value={form.firstName}
                    onChange={onChange}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className={s.label}>Last name</label>
                  <input
                    className={s.input}
                    name="lastName"
                    value={form.lastName}
                    onChange={onChange}
                    placeholder="Last name"
                  />
                </div>
                <div>
                  <label className={s.label}>Phone</label>
                  <input
                    className={s.input}
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    placeholder="+1 123-4567"
                  />
                </div>
                <div>
                  <label className={s.label}>Email</label>
                  <input
                    type="email"
                    className={s.input}
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    placeholder="name@example.com"
                  />
                </div>

                <button type="submit" className={s.button}>
                  Update Information
                </button>
              </form>
            </main>
          </div>
        </section>

        <button className={s.postBtn}>Post</button>
      </div>
    </div>
  );
}
