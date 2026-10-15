import { useQuery, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      return { uid, email: u.user!.email, isAdmin: !!isAdmin };
    },
  });
}

export async function signOut(qc: QueryClient, go: () => void) {
  await qc.cancelQueries();
  qc.clear();
  await supabase.auth.signOut();
  go();
}
