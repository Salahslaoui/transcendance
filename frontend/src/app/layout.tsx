// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import NotificationProvider from "@/contexts/notification-provider";
import UserProvider from "@/contexts/user-provider";
import GameProvider from "@/contexts/game-provider";
import AppClientWrapper from "./app-client-wrapper";
import { ToastContainer, Slide } from "react-toastify";
import Background from "@/components/ui/background";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PongHUB",
  description: "Pong, and beyond",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;

}>) {

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ToastContainer theme='dark' closeButton={true} transition={Slide} closeOnClick={true}/>
        <NotificationProvider>
          <GameProvider>
            <UserProvider>
            <Background />
            <Suspense>
            <AppClientWrapper>
              {children}
            </AppClientWrapper>
            </Suspense>
            </UserProvider>
          </GameProvider>
        </NotificationProvider>

      </body>
    </html>
  );
}
