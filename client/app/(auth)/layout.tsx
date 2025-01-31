"use client";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-30 dark:opacity-20" />
            </div>

            <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-purple-500 to-indigo-500 dark:from-purple-600 dark:to-indigo-600 rounded-2xl rotate-45 animate-pulse" />
            <div className="absolute bottom-10 left-10 w-32 h-32 bg-gradient-to-br from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600 rounded-2xl rotate-45 animate-pulse animation-delay-2000" />

            <div className="w-full max-w-md mx-auto relative z-10">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-t-2xl" />

                    <div className="absolute inset-4 bg-gradient-to-br from-white/50 to-transparent dark:from-gray-700/50 dark:to-transparent rounded-xl pointer-events-none" />
                    <div className="relative z-10">{children}</div>
                </div>

                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-blue-500 dark:via-blue-400 to-transparent" />
            </div>

            <div className="fixed top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/20 to-transparent" />
            <div className="fixed bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/20 to-transparent" />
        </div>
    );
};

export default AuthLayout;
