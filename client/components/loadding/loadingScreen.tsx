import React, { memo } from "react";
import { MessageSquare, Stars, Heart, Smile } from "lucide-react";

const LoadingScreen = () => {
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 flex items-center justify-center min-h-screen overflow-hidden">
            {/* Floating Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${i * 0.5}s`,
                            opacity: 0.3,
                        }}
                    >
                        {i % 3 === 0 ? (
                            <Stars className="w-8 h-8 text-white" />
                        ) : i % 3 === 1 ? (
                            <Heart className="w-6 h-6 text-white" />
                        ) : (
                            <Smile className="w-7 h-7 text-white" />
                        )}
                    </div>
                ))}
            </div>

            {/* Main Loading Container */}
            <div className="relative bg-white/20 backdrop-blur-lg p-10 rounded-2xl flex flex-col items-center gap-8 shadow-xl transform hover:scale-105 transition-transform duration-300">
                {/* Animated Chat Icon */}
                <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-75 animate-spin-slow" />
                    <div className="relative bg-white p-4 rounded-full animate-bounce">
                        <MessageSquare className="w-12 h-12 text-purple-500" />
                    </div>
                </div>

                {/* Loading Title */}
                <div className="text-white text-2xl font-bold text-center">
                    <span className="animate-pulse">Preparing Your Space</span>
                </div>

                {/* Loading Progress Indicator */}
                <div className="flex gap-3">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="w-4 h-4 bg-white rounded-full animate-bounce"
                            style={{
                                animationDelay: `${i * 200}ms`,
                                animationDuration: "1s",
                            }}
                        />
                    ))}
                </div>

                {/* Fun Messages Carousel */}
                <div className="text-white/90 text-center max-w-xs animate-fade">
                    <p className="text-lg font-medium mb-2">
                        Getting everything ready for you!
                    </p>
                    <p className="text-sm opacity-80">
                        Loading your messages, friends, and all the good
                        vibes...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default memo(LoadingScreen);
