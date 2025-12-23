import "./globals.css";
import TopBar from "./ui/TopBar";

export const metadata = {
  title: "Shipping Aid – Community",
  description: "A private community for shipping professionals.",
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
