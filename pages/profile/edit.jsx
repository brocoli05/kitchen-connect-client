import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import s from "@/styles/profile-edit.module.css";
import TopNavBar from "@/components/TopNavBar";
import ProfileLayout from "../../components/ProfileLayout";
import { useProfile } from "@/context/ProfileContext";

export default function ProfileEditPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    username: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profileImage, setProfileImage } = useProfile();

  const [selectedFile, setSelectedFile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      router.push("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setForm((f) => ({
          ...f,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          phone: data.phone || "",
          email: data.email || "",
          username: data.username || f.username || "",
        }));
        setCurrentUser(data);
        // If profile image in context is empty, prefer server value
        if (data.profileImage && !profileImage) {
          setProfileImage(data.profileImage);
        }
      } catch (e) {
        console.error("Failed to load profile:", e);
      }
    };

    loadProfile();
  }, [router]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validateForm = () => {
    const newErrors = {};
    const nameRegex = /^[a-zA-Z\s\-']{1,50}$/;

    if (form.firstName && !nameRegex.test(form.firstName)) {
      newErrors.firstName = "Invalid first name";
    }
    if (form.lastName && !nameRegex.test(form.lastName)) {
      newErrors.lastName = "Invalid last name";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    // Validate form before submitting
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem("userToken");
    const { username, ...payload } = form;

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        setForm((f) => ({
          ...f,
          firstName: responseData.firstName || "",
          lastName: responseData.lastName || "",
          phone: responseData.phone || "",
          email: responseData.email || "",
          username: responseData.username || f.username,
        }));

        if (responseData.profileImage) {
          setProfileImage(
            `${responseData.profileImage}?t=${new Date().getTime()}`
          );
        }

        alert("Profile updated successfully!");
      } else {
        // Handle validation errors from server
        alert(responseData.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle image selection
  const onFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadProfileImage = async () => {
    if (!selectedFile) {
      alert("Please select an image file");
      return;
    }
    if (!selectedFile.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    const token = localStorage.getItem("userToken");
    const formData = new FormData();
    formData.append("photo", selectedFile, selectedFile.name || "profile.png");

    try {
      const res = await fetch("/api/profile-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.imageUrl) {
        alert(data.message || "Failed to upload image");
        return;
      }
      setProfileImage(`${data.imageUrl}?t=${Date.now()}`);
      setSelectedFile(null);
      alert("Profile image updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to upload image");
    }
  };

  return (
    <>
      <TopNavBar />
      <ProfileLayout user={currentUser}>
        <div className={s.page}>
          <div className={s.wrap}>
            <section className={s.card}>
              <div className={s.cardHead}>Edit Information</div>
              <div className={s.cardBody}>
                <main>
                  <div className={s.contentContainer}>
                    <div className={s.profile}>
                      <div className={s.avatar}>
                        {selectedFile ? (
                          <div>
                            <img
                              src={URL.createObjectURL(selectedFile)}
                              alt="Preview"
                              className={s.profileImg}
                            />
                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                              <button onClick={uploadProfileImage} className={s.button}>
                                Save Image
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedFile(null)}
                                className={s.button}
                                style={{ background: "#6b7280" }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <img
                              src={profileImage}
                              alt="Profile"
                              className={s.profileImg}
                            />
                            <label
                              htmlFor="profileImageInput"
                              className={s.changeBtn}
                            >
                              Change
                            </label>
                          </>
                        )}
                        <input
                          id="profileImageInput"
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={onFileChange}
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {form.username || "Unknown"}{" "}
                          <span style={{ color: "#6b7280" }}>(nickname)</span>
                        </div>
                        <div style={{ fontSize: 14, color: "#6b7280" }}>
                          @{form.username || "unknown"}
                        </div>
                      </div>
                    </div>

                    <form
                      onSubmit={onSubmit}
                      className={s.form}
                      aria-label="Edit profile form"
                    >
                      <div>
                        <label className={s.label}>First name</label>
                        <input
                          className={`${s.input} ${
                            errors.firstName ? s.error : ""
                          }`}
                          name="firstName"
                          value={form.firstName}
                          onChange={onChange}
                          maxLength="50"
                          placeholder="Enter your first name"
                        />
                        {errors.firstName && (
                          <div
                            style={{
                              color: "red",
                              fontSize: "12px",
                              marginTop: "4px",
                            }}
                          >
                            {errors.firstName}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className={s.label}>Last name</label>
                        <input
                          className={`${s.input} ${
                            errors.lastName ? s.error : ""
                          }`}
                          name="lastName"
                          value={form.lastName}
                          onChange={onChange}
                          maxLength="50"
                          placeholder="Enter your last name"
                        />
                        {errors.lastName && (
                          <div
                            style={{
                              color: "red",
                              fontSize: "12px",
                              marginTop: "4px",
                            }}
                          >
                            {errors.lastName}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className={s.label}>Phone</label>
                        <input
                          className={`${s.input} ${
                            errors.phone ? s.error : ""
                          }`}
                          name="phone"
                          type="tel"
                          value={form.phone}
                          onChange={onChange}
                          placeholder="(416) 123-4567"
                        />
                        {errors.phone && (
                          <div
                            style={{
                              color: "red",
                              fontSize: "12px",
                              marginTop: "4px",
                            }}
                          >
                            {errors.phone}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className={s.label}>Email</label>
                        <input
                          type="email"
                          className={`${s.input} ${
                            errors.email ? s.error : ""
                          }`}
                          name="email"
                          value={form.email}
                          onChange={onChange}
                          placeholder="your.email@example.com"
                        />
                        {errors.email && (
                          <div
                            style={{
                              color: "red",
                              fontSize: "12px",
                              marginTop: "4px",
                            }}
                          >
                            {errors.email}
                          </div>
                        )}
                      </div>
                      <button
                        type="submit"
                        className={s.button}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Updating..." : "Update Information"}
                      </button>
                    </form>
                  </div>
                </main>
              </div>
            </section>
          </div>
        </div>
      </ProfileLayout>
    </>
  );
}
