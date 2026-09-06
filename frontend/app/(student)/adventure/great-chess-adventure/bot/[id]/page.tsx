import { BotDetail } from '@/components/adventure/great-chess-adventure/BotDetail';

interface BotPageProps {
  params: Promise<{ id: string }>;
}

export default async function GreatChessAdventureBotPage({ params }: BotPageProps) {
  const { id } = await params;
  const botId = parseInt(id, 10);

  return <BotDetail botId={Number.isNaN(botId) ? 0 : botId} />;
}
