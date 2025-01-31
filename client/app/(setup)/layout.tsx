"use client";

import { useState } from "react";
import { Plus, Users, Server, Sparkles, ArrowRight } from "lucide-react";
import { useModal } from "@/hooks/use-modal-store";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

const SetupLayout = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const isAuthPage =
        pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");

    if (isAuthPage) {
        return children;
    }

    const [isHovering, setIsHovering] = useState<string | null>(null);
    const [serverUrl, setServerUrl] = useState("");
    const { onOpen } = useModal();
    const router = useRouter();

    const handleJoinServer = (e: React.FormEvent) => {
        e.preventDefault();
        if (serverUrl.trim()) {
            router.push(serverUrl.trim());
        }
    };

    return (
        <div className="h-full w-full">
            <div className="fixed inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-amber-50/50 dark:from-gray-900/90 dark:via-gray-800/90 dark:to-gray-900/90 transition-colors duration-500">
                <div className="absolute inset-0 bg-[linear-gradient(30deg,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(150deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:24px_24px] dark:bg-[linear-gradient(30deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(150deg,rgba(255,255,255,0.05)_1px,transparent_1px)]"></div>
            </div>

            <div className="relative h-full w-full flex flex-col items-center justify-start p-6 pt-20">
                <div className="text-center mb-8 space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400">
                        Welcome to Your Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Let's get started by setting up your space
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full mb-8">
                    <div
                        onClick={() => onOpen("InitialModal")}
                        className="group relative overflow-hidden rounded-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-6 transition-all duration-300 hover:scale-102 hover:shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                        onMouseEnter={() => setIsHovering("group")}
                        onMouseLeave={() => setIsHovering(null)}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-100/50 to-primary-50/50 dark:from-primary-900/10 dark:to-primary-800/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative flex flex-col items-center text-center space-y-4">
                            <div className="p-3 rounded-full bg-primary-100/80 dark:bg-primary-900/20 ring-1 ring-primary-200 dark:ring-primary-700">
                                <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                Create Your First Group
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Connect with friends and start chatting together
                            </p>
                            <button className="mt-4 flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary-600/90 hover:bg-primary-700 text-slate-600 dark:text-white transition-colors duration-200 ring-1 ring-primary-300 dark:ring-primary-700">
                                <Plus className="w-4 h-4" />
                                <span>Get Started</span>
                            </button>
                        </div>
                    </div>

                    <div
                        className="group relative overflow-hidden rounded-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-lg border border-gray-200 dark:border-gray-700"
                        onMouseEnter={() => setIsHovering("server")}
                        onMouseLeave={() => setIsHovering(null)}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-100/50 to-primary-50/50 dark:from-primary-900/10 dark:to-primary-800/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative flex flex-col items-center text-center space-y-4">
                            <div className="p-3 rounded-full bg-primary-100/80 dark:bg-primary-900/20 ring-1 ring-primary-200 dark:ring-primary-700">
                                <Server className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                Join a Server
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Find communities that match your interests
                            </p>
                            <form
                                onSubmit={handleJoinServer}
                                className="w-full space-y-2"
                            >
                                <div className="flex gap-2">
                                    <Input
                                        value={serverUrl}
                                        onChange={(e) =>
                                            setServerUrl(e.target.value)
                                        }
                                        placeholder="Enter server URL"
                                        className="flex-1 darkbg-white bg-gray-700 border-gray-200 dark:border-gray-600 focus:ring-primary-500 dark:focus:ring-primary-400"
                                    />
                                    <button
                                        type="submit"
                                        className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary-600/90 hover:bg-primary-700 text-slate-600 dark:text-white  transition-colors duration-200 ring-1 ring-primary-300 dark:ring-primary-700"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                        <span className="hidden sm:inline">
                                            Join
                                        </span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="relative w-full">
                    <div className="absolute top-4 right-4">
                        <Sparkles className="w-5 h-5 text-primary-500 animate-pulse" />
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default SetupLayout;
