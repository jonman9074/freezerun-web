import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/Modal';
import { Field, Button } from '@/components/ui';

export default function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      if (fullName.trim() !== (profile?.full_name ?? '')) {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: fullName.trim() })
          .eq('id', profile!.id);
        if (error) throw error;
        setProfile(profile ? { ...profile, full_name: fullName.trim() } : profile);
      }
      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setNewPassword('');
      }
      setMsg('ተቀምጧል · Saved');
    } catch {
      setMsg('ስህተት · Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="መገለጫ · Profile">
      <div className="space-y-4">
        <Field
          label="ስም / Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
        />
        <Field
          label="ስልክ / Phone"
          value={profile?.phone ?? ''}
          disabled
        />
        <Field
          label="አዲስ የይለፍ ቃል / New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Leave empty to keep current"
        />
        {msg && <p className="text-sm text-cyan-300">{msg}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>ዝጋ · Close</Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            አረጋግጥ · Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
