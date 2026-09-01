"use client";

import { useEffect } from "react";

// 마지막 로그인 이메일을 기억해 자동으로 채워준다(비밀번호는 저장하지 않음).
export default function RememberEmail() {
  useEffect(() => {
    const email = document.getElementById("email") as HTMLInputElement | null;
    if (!email) return;
    const form = email.form;

    try {
      const saved = localStorage.getItem("seum_email");
      if (saved && !email.value) {
        email.value = saved;
        // 이메일이 채워졌으면 비밀번호로 포커스 이동
        const pw = document.getElementById("password") as HTMLInputElement | null;
        pw?.focus();
      }
    } catch {
      /* localStorage 접근 불가 시 무시 */
    }

    const onSubmit = () => {
      try {
        const remember = (document.getElementById("remember") as HTMLInputElement | null)
          ?.checked;
        if (remember) localStorage.setItem("seum_email", email.value);
        else localStorage.removeItem("seum_email");
      } catch {
        /* 무시 */
      }
    };
    form?.addEventListener("submit", onSubmit);
    return () => form?.removeEventListener("submit", onSubmit);
  }, []);

  return null;
}
