import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ProfileLayout from "../../components/ProfileLayout";
import DeleteAccountForm from "../../components/DeleteAccountForm";
import TopNavBar from "@/components/TopNavBar";
import s from "@/styles/profile-edit.module.css";

export default function ProfileDeletePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      router.push("/login");
    }

    fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setCurrentUser(data))
      .catch((err) => console.error(err));
  }, [router]);

  return (
    <>
      <TopNavBar />
      <ProfileLayout user={currentUser}>
        <div className={s.page}>
          <div className={s.wrap}>
            <section className={s.card}>
              <main>
                <DeleteAccountForm />
              </main>
            </section>
          </div>
        </div>
      </ProfileLayout>
    </>
  );
}
