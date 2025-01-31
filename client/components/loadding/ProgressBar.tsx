import { memo } from "react";

interface ProgressBarProps {
    progress: number;
    className?: string;
}
const ProgressBar = ({ progress, className }: ProgressBarProps) => {
    console.log("ProgressBar component: ", progress);

    return (
        <div
            className={`relative w-full h-4 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700 ${className}`}
        >
            <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-in-out dark:from-blue-400 dark:to-indigo-500"
                style={{ width: `${progress}%` }}
            >
                <div className="absolute top-0 left-0 w-full h-full bg-white opacity-20 animate-pulse"></div>
            </div>
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                <span className="font-bold text-xs text-black dark:text-white">{`${Math.round(
                    progress
                )}%`}</span>
            </div>
        </div>
    );
};

export default memo(ProgressBar);
