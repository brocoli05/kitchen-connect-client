import { useEffect } from "react";
import { useRouter } from "next/router";
import ProfileLayout from "../../components/ProfileLayout";
import DeleteAccountForm from "../../components/DeleteAccountForm";
import TopNavBar from "@/components/TopNavBar";
import s from "@/styles/profile-edit.module.css";

export default function ProfileDeletePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  return (
    <>
      <TopNavBar />
      <ProfileLayout>
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
