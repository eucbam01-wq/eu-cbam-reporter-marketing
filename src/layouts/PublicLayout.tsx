// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\src\layouts\PublicLayout.tsx
import { ReactNode } from "react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";

type PublicLayoutProps = {
  children: ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen">
      <NavBar />
      {children}
      <Footer />
    </div>
  );
}
// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\src\layouts\PublicLayout.tsx
