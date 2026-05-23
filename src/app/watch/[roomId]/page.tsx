import { GamezoSpectatorPage } from "@/components/gamezo/spectator";

interface WatchPageProps {
  params: Promise<{ roomId: string }>;
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { roomId } = await params;
  return <GamezoSpectatorPage roomId={roomId} />;
}
