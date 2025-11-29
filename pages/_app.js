import "bootstrap/dist/css/bootstrap.min.css";
import "@/styles/globals.css";
import "@/styles/main.css";
import "@/styles/mainpage.css";
import { SessionProvider } from "next-auth/react";
import { ProfileProvider } from "../context/ProfileContext";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}) {
  return (
    <SessionProvider session={session}>
      <ProfileProvider>
        <Component {...pageProps} />
      </ProfileProvider>
    </SessionProvider>
  );
}
