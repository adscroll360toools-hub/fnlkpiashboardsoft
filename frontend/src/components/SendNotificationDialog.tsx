import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotification } from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import { BellPlus } from "lucide-react";
import { toast } from "sonner";

export function SendNotificationDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("Meeting");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audienceType, setAudienceType] = useState<"public" | "role" | "user">("public");
  const [targetRole, setTargetRole] = useState<"employee" | "controller">("employee");
  const [targetUserId, setTargetUserId] = useState("");
  const { sendNotification } = useNotification();
  const { users } = useAuth();
  const [loading, setLoading] = useState(false);
  const targetableUsers = users.filter((u) => u.role === "employee" || u.role === "controller");

  const handleSend = async () => {
    if (!title || !message) {
      toast.error("Please fill all fields");
      return;
    }
    if (audienceType === "user" && !targetUserId) {
      toast.error("Please select a target user");
      return;
    }
    setLoading(true);
    const res = await sendNotification(type, title, message, {
      audienceType,
      targetRole: audienceType === "role" ? targetRole : undefined,
      targetUserId: audienceType === "user" ? targetUserId : undefined,
    });
    setLoading(false);
    if (res.success) {
      toast.success("Notification sent!");
      setOpen(false);
      setTitle("");
      setMessage("");
      setTargetUserId("");
      setAudienceType("public");
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
            <Label>Audience</Label>
            <Select value={audienceType} onValueChange={(value) => setAudienceType(value as "public" | "role" | "user")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Company-wide announcement</SelectItem>
                <SelectItem value="role">Role-specific</SelectItem>
                <SelectItem value="user">Personal notification</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {audienceType === "role" && (
            <div className="space-y-2">
              <Label>Target Role</Label>
              <Select value={targetRole} onValueChange={(value) => setTargetRole(value as "employee" | "controller")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employees</SelectItem>
                  <SelectItem value="controller">Controllers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {audienceType === "user" && (
            <div className="space-y-2">
              <Label>Target User</Label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee/controller" />
                </SelectTrigger>
                <SelectContent>
                  {targetableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
            {loading ? "Sending..." : "Send Notification"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
