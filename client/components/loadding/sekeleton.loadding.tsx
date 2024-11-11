import { Skeleton } from "../ui/skeleton";

export default function LoaddingSkeleton() {
    return (
        <div className="flex flex-col space-y-3">
            <Skeleton className="h-28 w-48 rounded-xl bg-gradient-to-r from-gray-500 via-gray-300 to-gray-200 dark:bg-gradient-to-r dark:from-slate-600 dark:via-slate-500 dark:to-slate-200" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-40 bg-gradient-to-r from-gray-500 via-gray-300 to-gray-200 dark:bg-gradient-to-r dark:from-slate-600 dark:via-slate-500 dark:to-slate-200" />
                <Skeleton className="h-4 w-40 bg-gradient-to-r from-gray-500 via-gray-300 to-gray-200 dark:bg-gradient-to-r dark:from-slate-600 dark:via-slate-500 dark:to-slate-200" />
            </div>
        </div>
    );
}
