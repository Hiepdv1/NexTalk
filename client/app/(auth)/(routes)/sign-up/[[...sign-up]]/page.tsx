"use client";
import { SignUp } from "@clerk/nextjs";

const Page = () => {
    return <SignUp fallbackRedirectUrl="/" />;
};

export default Page;
