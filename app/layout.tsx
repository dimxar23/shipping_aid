import "./globals.css";
import TopBar from "./ui/TopBar";

export const metadata = {
  title: "Shipping Aid – Community",
  description: "A private community for shipping professionals.",

  // ✅ PWA
  manifest: "/manifest.json",
  themeColor: "#0b0b0b",

  // ✅ Icons (για κινητό / home screen)
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        <div className="bg-overlay">
          <div className="app-shell">{children}</div>
        </div>
      </body>
    </html>
  );
}
