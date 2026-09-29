"use client";
import AuthPage from "@/components/AuthPage/auth-page";
import { useIsAuth } from "@/contexts/user-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


export default function AuthPageRoute() {
    const {isAuth} = useIsAuth();
    const router = useRouter();
    
    useEffect(() => {
        if (isAuth)
            router.replace("/dashboard");
    }, [isAuth]);
    return <AuthPage />;
}