"use client";

import { LoginForm } from "../../components/login-form";
import { useTheme } from "next-themes";

export default function LoginPage() {
    const { setTheme } = useTheme();
    setTheme("dark");
    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <LoginForm />
            </div>
        </div>
    );
}
