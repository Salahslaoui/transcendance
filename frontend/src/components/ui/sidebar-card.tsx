import React from "react";



export default function SidebarCard({children}: {children: React.ReactNode}) {
    return (
        <div className="flex min-w-[90%] items-center gap-3 mt-4 mb-6 p-3 w-[85%] border border-gray-400 rounded-lg">
            {children}
        </div>
    )
}