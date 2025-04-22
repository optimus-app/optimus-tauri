import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Titlebar } from "@/components/ui/titlebar";
import { usePathname } from "next/navigation";

const geistSans = localFont({
    src: "./fonts/GeistVF.woff",
    variable: "--font-geist-sans",
    weight: "100 900",
});
const geistMono = localFont({
    src: "./fonts/GeistMonoVF.woff",
    variable: "--font-geist-mono",
    weight: "100 900",
});

export const metadata: Metadata = {
    title: "Optimus CLI",
    description: "Advanced trading platform",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col h-screen overflow-hidden`}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <div className="fixed top-0 left-0 right-0 z-50">
                        <Titlebar />
                    </div>
                    <main className="pt-8 flex-1 overflow-auto h-[calc(100vh-2rem)] mt-8">
                        {children}
                    </main>
                </ThemeProvider>
            </body>
        </html>
    );
}
