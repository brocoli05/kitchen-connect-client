"use client";

import { useState } from "react";
import Image from "next/image";

export default function ProfileEditPage() {
  const [form, setForm] = useState({
    firstName: "Evelyn",
    lastName: "Kim",
    phone: "+1 123-4567",
    email: "etersh810@gmail.com",
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    alert("UI only — API connection in next sprint");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="px-6 py-5">
            <h2 className="text-xl font-semibold">Edit Information</h2>
          </div>

          <div className="grid grid-cols-1 gap-8 border-t px-6 py-8 lg:grid-cols-12">
            <aside className="lg:col-span-3">
              <nav className="space-y-1">
                <a className="block rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium">
                  Edit Information
                </a>
                <a className="block rounded-lg px-3 py-2 text-sm text-gray-600">
                  Change Password
                </a>
                <a className="block rounded-lg px-3 py-2 text-sm text-gray-600">
                  Security Factors
                </a>
                <a className="block rounded-lg px-3 py-2 text-sm text-gray-600">
                  My Posts
                </a>
                <a className="block rounded-lg px-3 py-2 text-sm text-gray-600">
                  My Comments
                </a>
                <a className="block rounded-lg px-3 py-2 text-sm text-gray-600">
                  Saved Recipes
                </a>
                <a className="block rounded-lg px-3 py-2 text-sm text-gray-600">
                  Upvoted
                </a>
              </nav>
            </aside>

            <main className="lg:col-span-9">
              <div className="mb-6 flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gray-100">
                  <Image
                    src="https://api.dicebear.com/9.x/thumbs/svg?seed=bobalover"
                    alt="avatar"
                    fill
                    sizes="64px"
                  />
                </div>
                <div>
                  <div className="text-lg font-semibold">
                    boba lover <span className="text-gray-500">(nickname)</span>
                  </div>
                  <div className="text-sm text-gray-500">@blackmilktea</div>
                </div>
              </div>

              <form onSubmit={onSubmit} className="max-w-xl space-y-5" aria-label="Edit profile form">
                <div>
                  <label className="mb-1 block text-sm font-medium">First name</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                    name="firstName"
                    value={form.firstName}
                    onChange={onChange}
                    placeholder="First name"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Last name</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                    name="lastName"
                    value={form.lastName}
                    onChange={onChange}
                    placeholder="Last name"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Phone</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    placeholder="+1 123-4567"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    placeholder="name@example.com"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Update Information
                </button>
              </form>
            </main>
          </div>
        </section>

        <div className="mt-6">
          <button className="rounded-md border px-3 py-1.5 text-sm">Post</button>
        </div>
      </div>
    </div>
  );
}
