import type { Metadata } from "next";

export const metadata: Metadata = {
   title: {
      template: "%s | Notifications",
      default: "Notifications",
   },
};

export default function NotificationLayout({ children }: { children: React.ReactNode }) {
   return <>{children}</>;
}
