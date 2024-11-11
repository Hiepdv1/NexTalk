import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";

const ChatBoxSidebarSkeleton = () => {
    return (
        <div className="w-60 h-screen pt-4 space-y-3 flex flex-col text-primary dark:bg-[#2B2D31] bg-[#F2F3F5]">
            <div className="h-8 w-5/6 bg-zinc-400 dark:bg-zinc-700 rounded-lg animate-pulse mx-auto"></div>
            <Separator className="bg-zinc-400 dark:bg-zinc-700 h-[1px] rounded-md w-full mx-auto" />

            <ScrollArea className="flex-1 px-4">
                <div className="h-6 w-52 bg-zinc-400 dark:bg-zinc-700 rounded-lg animate-pulse mx-auto mb-3"></div>
                {[...Array(6)].map((_, index) => (
                    <div
                        key={index}
                        className="h-6 w-5/6 bg-zinc-400 dark:bg-zinc-700 rounded-lg animate-pulse mx-auto mb-3"
                    ></div>
                ))}
                <Separator className="bg-zinc-400 dark:bg-zinc-700 h-[1px] rounded-md w-5/6 mx-auto mb-3" />
                <div className="h-6 w-52 bg-zinc-400 dark:bg-zinc-700 rounded-lg animate-pulse mx-auto mb-3"></div>
                {[...Array(4)].map((_, index) => (
                    <div
                        key={index}
                        className="h-6 w-5/6 bg-zinc-400 dark:bg-zinc-700 rounded-lg animate-pulse mx-auto mb-3"
                    ></div>
                ))}
                <Separator className="bg-zinc-400 dark:bg-zinc-700 h-[1px] rounded-md w-5/6 mx-auto mb-3" />
                <div className="h-6 w-52 bg-zinc-400 dark:bg-zinc-700 rounded-lg animate-pulse mx-auto mb-3"></div>
                {[...Array(2)].map((_, index) => (
                    <div
                        key={index}
                        className="h-6 w-5/6 bg-zinc-400 dark:bg-zinc-700 rounded-lg animate-pulse mx-auto mb-3"
                    ></div>
                ))}
                <Separator className="bg-zinc-400 dark:bg-zinc-700 h-[1px] rounded-md w-5/6 mx-auto mb-3" />
                <div className="h-6 w-52 bg-zinc-400 dark:bg-zinc-700 rounded-lg animate-pulse mx-auto mb-3"></div>
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <div className="h-10 w-10 bg-zinc-400 dark:bg-zinc-700 rounded-full animate-pulse"></div>
                        <div className="h-6 w-40 bg-zinc-400 dark:bg-zinc-700 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <div className="h-10 w-10 bg-zinc-400 dark:bg-zinc-700 rounded-full animate-pulse"></div>
                        <div className="h-6 w-40 bg-zinc-400 dark:bg-zinc-700 rounded-lg animate-pulse"></div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};

export default ChatBoxSidebarSkeleton;
