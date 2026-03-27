"use client";

import LoginModal from "@/components/LoginModal";

export default function AuthGuardModal() {
  return (
    <LoginModal onClose={() => {}} /> // onClose dikosongkan supaya tidak bisa ditutup
  );
}