import { Button } from "@/components/ui/button";
import { ThumbsDown, ThumbsUp } from "lucide-react";

interface FeedbackButtonsProps {
  feedback: "positive" | "negative" | null | undefined;
  onFeedback: (feedback: "positive" | "negative") => void;
  size?: "sm" | "default" | "lg";
}

export default function FeedbackButtons({
  feedback,
  onFeedback,
  size = "sm",
}: FeedbackButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={feedback === "positive" ? "default" : "outline"}
        size={size}
        onClick={() => onFeedback("positive")}
        className={feedback === "positive" ? "bg-green-600 hover:bg-green-700" : ""}
      >
        <ThumbsUp className="w-4 h-4 mr-1" />
        Bom
      </Button>
      <Button
        variant={feedback === "negative" ? "default" : "outline"}
        size={size}
        onClick={() => onFeedback("negative")}
        className={feedback === "negative" ? "bg-red-600 hover:bg-red-700" : ""}
      >
        <ThumbsDown className="w-4 h-4 mr-1" />
        Ruim
      </Button>
    </div>
  );
}
