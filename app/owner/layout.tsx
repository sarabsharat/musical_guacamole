import { ReactNode } from "react";

export default function RootLayout({
                                       children,
                                   }: {
    children: ReactNode;
}) {
    return (
        <html lang="en">
        <body className="bg-white text-black min-h-screen">
        {children}
        </body>
        </html>
    );
}