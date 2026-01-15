import React, { useRef, useState } from "react";

export default function Banner3D({ src, alt, className = "" }) {
    const containerRef = useRef(null);
    const [transform, setTransform] = useState("");
    const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

    const handleMouseMove = (e) => {
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`);
        setGlare({
            x: (x / rect.width) * 100,
            y: (y / rect.height) * 100,
            opacity: 0.3
        });
    };

    const handleMouseLeave = () => {
        setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
        setGlare({ x: 50, y: 50, opacity: 0 });
    };

    return (
        <div 
            ref={containerRef}
            className={`relative overflow-hidden rounded-2xl cursor-pointer ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                transform,
                transition: "transform 0.1s ease-out",
                transformStyle: "preserve-3d"
            }}
        >
            <img 
                src={src} 
                alt={alt}
                className="w-full h-full object-cover"
            />
            {/* Glare effect */}
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}) 0%, transparent 50%)`,
                    transition: "opacity 0.1s ease-out"
                }}
            />
            {/* Border glow */}
            <div className="absolute inset-0 rounded-2xl border-2 border-purple-500/30 pointer-events-none" />
        </div>
    );
}