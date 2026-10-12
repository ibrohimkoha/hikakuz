"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";

export const GlobalFooter: React.FC = () => {
  const pathname = usePathname();

  // Hide footer on admin dashboard
  if (pathname && pathname.startsWith("/admin")) {
    return null;
  }

  return <Footer />;
};
