import { useQuery, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u, error: authError } = await supabase.auth.getUser();
      if (authError || !u.user) throw new Error("انتهت جلسة الدخول، سجّل دخولك مجددًا");
      const uid = u.user.id;
      const { data: isAdmin, error } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (error) throw error;
      return { uid, email: u.user.email, isAdmin: !!isAdmin };
    },
  });
}

export async function signOut(qc: QueryClient, go: () => void) {
  await qc.cancelQueries();
  qc.clear();
  await supabase.auth.signOut();
  go();
}
