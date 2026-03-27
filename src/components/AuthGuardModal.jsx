// src/components/AuthGuardModal.jsx
"use client";

import LoginModal from "@/components/LoginModal";

export default function AuthGuardModal() {
  return (
    // Tambahkan isGuard={true}
    <LoginModal isGuard={true} onClose={() => {}} /> 
  );
}