import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotification } from "@/context/NotificationContext";
import { BellPlus } from "lucide-react";
import { toast } from "sonner";

export function SendNotificationDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("Meeting");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const { sendNotification } = useNotification();
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!title || !message) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    const res = await sendNotification(type, title, message);
    setLoading(false);
    if (res.success) {
      toast.success("Notification sent!");
      setOpen(false);
      setTitle("");
      setMessage("");
    } else {
      toast.error(res.error || "Failed to send notification");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BellPlus className="h-4 w-4" /> Send Notification
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Broadcast Notification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Meeting">Meeting</SelectItem>
                <SelectItem value="Extra Addition">Extra Addition</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Daily Standup" />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Details..." />
          </div>
          <Button onClick={handleSend} disabled={loading} className="w-full">
            {loading ? "Sending..." : "Send to All"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
