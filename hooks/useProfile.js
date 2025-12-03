import { useSession } from "next-auth/react";

export function useProfile() {
  const { data: session } = useSession();
  return { user: session?.user };
}
