import { createContext, useContext, useState, useEffect } from "react";

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const [profileImage, setProfileImage] = useState("/avatar.png");

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) return;

      try {
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.profileImage) {
            setProfileImage(`${data.profileImage}?t=${Date.now()}`);
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    };

    fetchProfile();
  }, []);

  return (
    <ProfileContext.Provider value={{ profileImage, setProfileImage }}>
      {children}
    </ProfileContext.Provider>
  );
};

// Custom Hook
export const useProfile = () => useContext(ProfileContext);
