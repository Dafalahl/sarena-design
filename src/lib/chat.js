import { supabase } from "@/lib/supabase";

export const getOrCreateRoom = async (clientId, designerId) => {
  // Cek room sudah ada
  const { data: existing } = await supabase
    .from("rooms")
    .select("id")
    .eq("client_id", clientId)
    .eq("designer_id", designerId)
    .maybeSingle(); // pakai maybeSingle supaya tidak error kalau kosong

  if (existing) return existing.id;

  // Buat room baru
  const { data: newRoom } = await supabase
    .from("rooms")
    .insert({ client_id: clientId, designer_id: designerId })
    .select("id")
    .single();

  return newRoom.id;
};

export const goToChat = async (router, clientId, designerId) => {
  await getOrCreateRoom(clientId, designerId);
  router.push(`/chats?designerId=${designerId}`);
};
