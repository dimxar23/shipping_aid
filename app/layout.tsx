import "./globals.css";
import TopBar from "./ui/TopBar";

export const metadata = {
  title: "Shipping Aid – Community",
  description: "A private community for shipping professionals.",

  // ✅ PWA
  manifest: "/manifest.json",
  themeColor: "#0b0b0b",

  // ✅ Icons
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
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
          {/* κάνουμε το shell "στήλη" ώστε το footer να πάει κάτω */}
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: 16,
              minHeight: "calc(100vh - 80px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ flex: 1 }}>{children}</div>

            <footer
              style={{
                marginTop: 24,
                padding: "14px 10px",
                textAlign: "center",
                fontSize: 12,
                opacity: 0.65,
                borderTop: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.18)",
                borderRadius: 14,
              }}
            >
              *Communication channels for questions, suggestions and support will
              be added soon.*
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
