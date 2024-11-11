"use client";
import { SignIn } from "@clerk/nextjs";

const Page = () => {
    return <SignIn fallbackRedirectUrl="/" />;
};

export default Page;
