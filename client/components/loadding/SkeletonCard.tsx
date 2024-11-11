import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "../ui/card";

const SkeletonCard = () => {
    return (
        <div className="flex items-center justify-center h-screen select-none">
            <Card className="max-w-[516px] border-none w-full bg-[#36393E]">
                <CardHeader>
                    <CardTitle>
                        <div className="relative">
                            <div className="flex justify-center mb-3">
                                <div className="relative w-24 h-24 rounded-full bg-gray-700 animate-pulse" />
                            </div>
                            <div className="flex items-center justify-center">
                                <div className="mr-3 h-3 w-3 rounded-full bg-gray-700 animate-pulse" />
                                <span className="h-4 w-36 bg-gray-700 animate-pulse rounded"></span>
                            </div>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center my-4">
                        <div className="mr-9 rounded-xl bg-gray-700 w-full max-w-40 p-1 flex items-center justify-center animate-pulse">
                            <div className="mr-3 h-3 w-3 rounded-full bg-gray-600" />
                            <span className="h-4 w-12 bg-gray-600 animate-pulse rounded"></span>
                        </div>
                        <div className="rounded-xl bg-gray-700 w-full max-w-40 p-1 flex items-center justify-center animate-pulse">
                            <div className="mr-3 h-3 w-3 rounded-full bg-gray-600" />
                            <span className="h-4 w-12 bg-gray-600 animate-pulse rounded"></span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="h-10 w-full bg-gray-700 animate-pulse rounded"></div>
                </CardFooter>
            </Card>
        </div>
    );
};

export default SkeletonCard;
