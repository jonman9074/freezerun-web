import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui';
import type { GameDef } from '@/screens/HomeScreen';

export default function GameRulesModal({
  game,
  onPlay,
  onClose,
}: {
  game: GameDef | null;
  onPlay: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={!!game} onClose={onClose} title="ማስጠንቀቂያ · Warning" wide>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-400/30 px-4 py-3">
          <AlertTriangle className="text-amber-400 shrink-0" size={22} />
          <p className="text-sm text-amber-200 font-medium">
            ፲፠+ · This game involves real money and is for adults 18+ only.
          </p>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-slate-300 space-y-2 leading-relaxed">
          <p className="font-bold text-white">
            {game?.titleAm} · {game?.titleEn}
          </p>
          <p>
            • ከመግባትዎ በፊት ትኬት መግዛት ያስፈልጋል (50–1000 ETB)።
            <br />
            You must buy a ticket (50–1000 ETB) before entering.
          </p>
          <p>
            • አንድ አሽከርካሪ ይምረጡ። ያሸነፈ በማግስት ውጤቱ 2.0x ይከፍላል።
            <br />
            Pick one racer. A win pays 2.0x your stake.
          </p>
          <p>
            • ውጤቱ በዕድል ይወሰናል — የመሰብሰብ ዋስትነት የለም።
            <br />
            Outcomes are random — there is no guarantee of winning.
          </p>
          <p>
            • በሀብታትዎ ብቻ ይጫወቱ። Play responsibly, only with what you can afford.
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>ሰርዝ · Cancel</Button>
          <Button onClick={onPlay} className="px-8">
            ተጫወት · Play
          </Button>
        </div>
      </div>
    </Modal>
  );
}
