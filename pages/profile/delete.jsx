import { useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import ProfileLayout from "../../components/ProfileLayout";
import DeleteAccountForm from "../../components/DeleteAccountForm";
import TopNavBar from "@/components/TopNavBar";
import SettingsTab from "../../components/SettingsTab";
import { Row, Col } from "react-bootstrap";
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
      <SettingsTab activeTab="delete">
        <div style={{ marginLeft: '0', paddingTop: '1rem' }}>
          <h3>Delete Profile</h3>
          <p>Manage your account deletion.</p>
          <DeleteAccountForm />
        </div>
      </SettingsTab>
    </>
  );
}
