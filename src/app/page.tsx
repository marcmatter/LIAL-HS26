import PlayerCard from "@/components/game/PlayerCard";
import InstallApp from "@/components/pwa/InstallApp";
import ToolList, { HomeIntro } from "@/components/ToolList";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <HomeIntro />
      <PlayerCard compact />
      <InstallApp />
      <ToolList />
    </div>
  );
}
