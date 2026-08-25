import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "StateOS — State Transition Session", description: "A focused MVP for intentional state transition practice." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
