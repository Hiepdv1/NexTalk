import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";

const NavigationSidebarSkeleton = () => {
    return (
        <div className="w-[72px] pt-3 space-x-4 flex flex-col items-center h-full text-primary dark:bg-[#1E1F22] bg-[#E3E5E8]">
            <div className="w-14 h-14 bg-zinc-400 dark:bg-gray-600 rounded-full mb-2 animate-pulse"></div>
            <Separator className="h-[2px] bg-zinc-400 dark:bg-gray-700 rounded-md w-10 !mx-auto my-2" />

            <ScrollArea className="flex-1 w-full !m-0">
                <div className="mb-4 flex justify-center">
                    <div className="w-12 h-12 bg-zinc-400 dark:bg-gray-600 rounded-full animate-pulse"></div>
                </div>
            </ScrollArea>

            <div className="pb-3 !m-0 flex items-center flex-col gap-y-4">
                <div className="w-12 h-12 bg-zinc-400 dark:bg-gray-600 rounded-full animate-pulse"></div>
                <div className="w-12 h-12 bg-zinc-400 dark:bg-gray-600 rounded-full animate-pulse"></div>
            </div>
        </div>
    );
};

export default NavigationSidebarSkeleton;
