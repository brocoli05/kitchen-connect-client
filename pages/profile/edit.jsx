import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import s from "@/styles/profile-edit.module.css";
import TopNavBar from "@/components/TopNavBar";

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

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) { router.push("/login"); return; }

    fetch("/api/profile", { 
      headers: { Authorization: `Bearer ${token}` } 
    })
      .then(res => res.json())
      .then((data) => {
        setForm({
          firstName: data.firstName || "",
          lastName:  data.lastName  || "",
          phone:     data.phone     || "",
          email:     data.email     || "",
          username:  data.username || "",  
        });
      })
      .catch((error) => {
        console.error("Failed to fetch user data:", error);
      });
  }, [router]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (form.email && form.email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    // Phone validation
    if (form.phone && form.phone.trim() !== "") {
      const cleanPhone = form.phone.replace(/[^\d+]/g, '');
      
      // Canadian area codes
      const canadianAreaCodes = [204, 226, 236, 249, 250, 289, 306, 343, 365, 403, 416, 418, 431, 437, 438, 450, 506, 514, 519, 548, 579, 581, 587, 604, 613, 639, 647, 672, 705, 709, 742, 778, 780, 782, 807, 819, 825, 867, 873, 902, 905];
      
      let isValid = false;
      
      if (cleanPhone.startsWith('+1')) {
        // +1 followed by 10 digits (North American format)
        const phoneDigits = cleanPhone.substring(2);
        if (phoneDigits.length === 10) {
          const areaCode = parseInt(phoneDigits.substring(0, 3));
          isValid = canadianAreaCodes.includes(areaCode) && /^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(phoneDigits);
        }
      } else if (cleanPhone.startsWith('+')) {
        // Other international numbers
        isValid = cleanPhone.length >= 11 && cleanPhone.length <= 16 && /^(\+\d{1,3})?[1-9]\d{8,14}$/.test(cleanPhone);
      } else {
        // Default to Canadian format (10 digits)
        if (cleanPhone.length === 10) {
          const areaCode = parseInt(cleanPhone.substring(0, 3));
          isValid = canadianAreaCodes.includes(areaCode) && /^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(cleanPhone);
        }
      }
      
      if (!isValid) {
        newErrors.phone = "Please enter a valid Canadian phone number (10 digits with valid area code, or international format)";
      }
    }

    // Name validation
    const nameRegex = /^[a-zA-Z\s\-']{1,50}$/;
    
    if (form.firstName && form.firstName.trim() !== "" && !nameRegex.test(form.firstName)) {
      newErrors.firstName = "First name must be 1-50 characters and contain only letters, spaces, hyphens, and apostrophes";
    }

    if (form.lastName && form.lastName.trim() !== "" && !nameRegex.test(form.lastName)) {
      newErrors.lastName = "Last name must be 1-50 characters and contain only letters, spaces, hyphens, and apostrophes";
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
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (response.ok) {
        setForm(f => ({
          ...f,
          firstName: responseData.firstName || "",
          lastName:  responseData.lastName  || "",
          phone:     responseData.phone     || "",
          email:     responseData.email     || "",
          username:  responseData.username  || f.username, 
        }));
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

  return (
	<>
	<TopNavBar/>
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
                  <input 
                    className={`${s.input} ${errors.firstName ? s.error : ''}`} 
                    name="firstName" 
                    value={form.firstName} 
                    onChange={onChange}
                    maxLength="50"
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && <div style={{color: 'red', fontSize: '12px', marginTop: '4px'}}>{errors.firstName}</div>}
                </div>
                <div>
                  <label className={s.label}>Last name</label>
                  <input 
                    className={`${s.input} ${errors.lastName ? s.error : ''}`} 
                    name="lastName" 
                    value={form.lastName} 
                    onChange={onChange}
                    maxLength="50"
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && <div style={{color: 'red', fontSize: '12px', marginTop: '4px'}}>{errors.lastName}</div>}
                </div>
                <div>
                  <label className={s.label}>Phone</label>
                  <input 
                    className={`${s.input} ${errors.phone ? s.error : ''}`} 
                    name="phone" 
                    type="tel"
                    value={form.phone} 
                    onChange={onChange}
                    placeholder="(416) 123-4567"
                  />
                  {errors.phone && <div style={{color: 'red', fontSize: '12px', marginTop: '4px'}}>{errors.phone}</div>}
                </div>
                <div>
                  <label className={s.label}>Email</label>
                  <input 
                    type="email" 
                    className={`${s.input} ${errors.email ? s.error : ''}`} 
                    name="email" 
                    value={form.email} 
                    onChange={onChange}
                    placeholder="your.email@example.com"
                  />
                  {errors.email && <div style={{color: 'red', fontSize: '12px', marginTop: '4px'}}>{errors.email}</div>}
                </div>
                <button type="submit" className={s.button} disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Information"}
                </button>
              </form>
            </main>
          </div>
        </section>
        <button className={s.postBtn}>Post</button>
      </div>
    </div>
	</>
  );
}
