import "./globals.css";

export const metadata = {
  title: "AI LinkedIn Content Studio",
  description: "AI-Powered LinkedIn Content Studio — Research, Generate, Humanize and Preview",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
