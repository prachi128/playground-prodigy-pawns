export default function GreatChessAdventureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div data-gca-theme className="gca-shell min-h-screen">{children}</div>;
}
