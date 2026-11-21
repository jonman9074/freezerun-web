import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui';

export default function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="ህጎች እና ፲፠+ · Rules & 18+" wide>
      <div className="space-y-4 text-sm text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-rose-300 font-semibold">
          ⚠️ ይህ ጨዋታ ለ18 ዓመት እና ከዚያ በላይ ለሆኑ ብቻ ነው። This game is for ages 18 and over only.
        </div>
        <div className="space-y-3">
          <div>
            <h4 className="font-bold text-white mb-1">1. የዕድሜ ጥቅስ / Age Restriction</h4>
            <p>መለያ ለመክፈት ወይም ለመጫወት የ18 ዓመት እና ከዚያ በላይ መሆን አለብዎት። You must be 18+ to register and play.</p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-1">2. ውርርድ / Betting</h4>
            <p>
              ከጨዋታ በፊት ትኬት ይግዙ (50–1000 ETB)። የመረጡት አሽከርካሪ ቢያሸንፍ ውድቀት የለም —
              ውጤቱ 2.0x ክፍያ ነው። Buy a ticket (50–1000 ETB) before playing. If your
              racer wins, your stake pays out at 2.0x.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-1">3. ገንዘብ / Money</h4>
            <p>
              ገንዘብ ለማስገባት Telebirr (0990005099) ወይም CBE (1000745883234) ይጠቀሙ።
              ደረሰኝ ቁጥር ወይም ስክሪንሾት ያስገቡ። ገንዘብ ለማስወጣት "ገንዘብ ለማስወጣት" ይጠቀሙ።
              Deposits require a receipt reference or screenshot; claims are paid to
              the account you provide.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-1">4. ፍትሃድነት / Fair Play</h4>
            <p>
              የውድድር ውጤት በዕድል ይወሰናል። ማቸር ወይም ማጭበርበር ሲገኝ መለያ ይዘጋል።
              Race outcomes are random. Cheating or abuse leads to account suspension.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-1">5. ተጠያቂነት / Responsibility</h4>
            <p>
              በሀብታት ብቻ ይጫወቱ። የመጫወት ፍላጎት ከቁጥጥር ያለፈ ከሆነ እርዳታ ይጠይቁ።
              Play responsibly and only with money you can afford to lose.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <Button variant="ghost" onClick={onClose}>ዝጋ · Close</Button>
      </div>
    </Modal>
  );
}
